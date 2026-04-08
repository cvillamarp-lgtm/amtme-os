-- Add pricing and subscription tables for SkillsPodcast monetization (Tier 1)

-- Pricing plans table
CREATE TABLE IF NOT EXISTS pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name text NOT NULL,           -- "atoms", "pro", "studio"
  display_name text NOT NULL,   -- "Atoms", "Pro", "Studio"
  description text,             -- "Para exploradores", "Para creadores activos"
  price_monthly integer,        -- price in cents (e.g., 1900 = $19.00)
  price_annual integer,         -- annual price in cents
  features jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array of feature strings
  limitations jsonb DEFAULT '[]'::jsonb,        -- array of limitation strings for free tier
  featured boolean DEFAULT false,                -- highlight as popular
  trial_days integer DEFAULT 14,                -- trial period for paid plans

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pricing_plans_user_id ON pricing_plans(user_id);
CREATE INDEX idx_pricing_plans_name ON pricing_plans(name);

-- Subscriptions table (track active plans)
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES pricing_plans(id) ON DELETE CASCADE,

  plan_name text NOT NULL,      -- denormalized for queries
  status text NOT NULL DEFAULT 'trial',  -- "trial", "active", "past_due", "canceled"
  stripe_subscription_id text,   -- Stripe subscription ID for webhook tracking

  -- Billing cycle
  billing_period text NOT NULL DEFAULT 'monthly',  -- "monthly" or "annual"

  -- Trial tracking
  trial_start_date timestamptz,
  trial_end_date timestamptz,

  -- Subscription dates
  started_at timestamptz DEFAULT now(),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,  -- when current subscription expires
  canceled_at timestamptz,

  -- Conversion metrics (for analytics)
  converted_from_trial boolean DEFAULT false,
  conversion_date timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- Email sequences table (track progress through conversion emails)
CREATE TABLE IF NOT EXISTS email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,

  sequence_name text NOT NULL,  -- "pls_trial_flow", "free_tier_limit"
  sequence_step integer NOT NULL,  -- 0=welcome, 3=social_proof, 7=deep_dive, 11=last_chance
  sequence_step_name text,       -- "welcome", "social_proof", "deep_dive", "last_chance"

  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,

  email_subject text,
  email_template_id text,        -- references email template system

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_email_sequences_user_id ON email_sequences(user_id);
CREATE INDEX idx_email_sequences_sequence_name ON email_sequences(sequence_name);
CREATE INDEX idx_email_sequences_sent_at ON email_sequences(sent_at);

-- Conversion analytics table (track funnel metrics)
CREATE TABLE IF NOT EXISTS conversion_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Funnel stage
  stage text NOT NULL,  -- "listener", "atoms_user", "trial_start", "trial_converted", "pro_subscriber"
  source_channel text,  -- "podcast", "email", "linkedin", "tiktok", "referral"

  -- Cohort tracking
  cohort_date date NOT NULL,  -- date user entered funnel
  cohort_week text,           -- "2026-W14" format for weekly grouping

  conversion_at timestamptz,  -- when they converted (null if not converted)
  days_to_conversion integer, -- null if not converted

  metadata jsonb,  -- source URL, campaign ID, utm params, etc

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_conversion_analytics_user_id ON conversion_analytics(user_id);
CREATE INDEX idx_conversion_analytics_stage ON conversion_analytics(stage);
CREATE INDEX idx_conversion_analytics_cohort_date ON conversion_analytics(cohort_date);

-- RLS Policies

ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read pricing plans"
  ON pricing_plans FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Only admins can create pricing plans"
  ON pricing_plans FOR INSERT
  WITH CHECK (false);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "System can create subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (true);

ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their email sequences"
  ON email_sequences FOR SELECT
  USING (auth.uid() = user_id);

ALTER TABLE conversion_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their conversion analytics"
  ON conversion_analytics FOR SELECT
  USING (auth.uid() = user_id);

-- Initial seed: pricing plans (Christian's instance)
-- Note: These are templates; each user instance should have their own plans
INSERT INTO pricing_plans (user_id, name, display_name, description, price_monthly, price_annual, features, featured, trial_days)
SELECT
  auth.uid(),
  'atoms',
  'Atoms',
  'Para exploradores',
  NULL,
  NULL,
  jsonb_build_array(
    'Acceso limitado a la librería de skills',
    'Descarga básica de podcast',
    'Comunidad (solo lectura)'
  ),
  false,
  0
WHERE auth.uid() IS NOT NULL;
