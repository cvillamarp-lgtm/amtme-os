-- Add OAuth fields to platform_accounts for real social media API integration
ALTER TABLE public.platform_accounts
  ADD COLUMN IF NOT EXISTS oauth_connected  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_token     text,
  ADD COLUMN IF NOT EXISTS refresh_token    text,
  ADD COLUMN IF NOT EXISTS token_expiry     timestamptz,
  ADD COLUMN IF NOT EXISTS connected_at     timestamptz;
