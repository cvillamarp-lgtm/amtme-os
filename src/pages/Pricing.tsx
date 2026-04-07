"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PricingTier {
  id: "atoms" | "pro" | "studio";
  name: string;
  description: string;
  price: number | null;
  billingPeriod: string;
  cta: string;
  ctaVariant: "default" | "outline" | "secondary";
  featured: boolean;
  features: string[];
  limitations?: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const PRICING_TIERS: PricingTier[] = [
  {
    id: "atoms",
    name: "Atoms",
    description: "Para exploradores",
    price: null,
    billingPeriod: "Siempre gratis",
    cta: "Comenzar",
    ctaVariant: "outline",
    featured: false,
    features: [
      "5 análisis de episodios/mes",
      "Acceso limitado a la librería de skills",
      "Descarga básica de podcast",
      "Comunidad (solo lectura)",
    ],
    limitations: [
      "Sin análisis avanzado de viralidad",
      "Sin integración con redes",
      "Sin soporte prioritario",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para creadores activos",
    price: 19,
    billingPeriod: "/mes",
    cta: "Iniciar prueba",
    ctaVariant: "default",
    featured: true,
    features: [
      "Análisis ilimitado de episodios",
      "Acceso completo a la librería de skills (86 frameworks)",
      "Descarga de podcast en HD",
      "Análisis de viralidad con scores",
      "Participación en comunidad",
      "Email prioritario",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    description: "Para operaciones profesionales",
    price: 99,
    billingPeriod: "/mes",
    cta: "Contactar ventas",
    ctaVariant: "secondary",
    featured: false,
    features: [
      "Todo de Pro, más:",
      "Integraciones personalizadas",
      "API access para automaciones",
      "Soporte dedicado (Slack + email)",
      "Análisis predictivo de audiencia",
      "Atribuciones de crecimiento",
      "Reportes mensuales customizados",
      "Prioridad en nuevas features",
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const handleCheckout = (tierId: string) => {
    if (tierId === "atoms") {
      // Redirect to signup
      window.location.href = "/auth?redirect=/library";
      return;
    }

    // TODO: Integrate Stripe checkout
    // For now, show toast
    alert(`Stripe checkout para ${tierId} (${billingCycle})`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <PageHeader
            title="Planes de Precios"
            subtitle="Elige el plan perfecto para tu viaje como creador"
          />
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-teal-500 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "annual"
                  ? "bg-teal-500 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              Anual <span className="text-xs">(Ahorra 20%)</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {PRICING_TIERS.map((tier) => (
            <Card
              key={tier.id}
              className={`relative flex flex-col ${
                tier.featured
                  ? "ring-2 ring-teal-500 shadow-lg scale-105 md:scale-100"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              {tier.featured && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white">
                  Más Popular
                </Badge>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Pricing */}
                <div className="mb-6">
                  {tier.price !== null ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-slate-900 dark:text-white">
                        ${tier.price}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {tier.billingPeriod}
                      </span>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {tier.billingPeriod}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="mb-6 flex-1">
                  <ul className="space-y-3">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Limitations */}
                {tier.limitations && (
                  <div className="mb-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <ul className="space-y-2">
                      {tier.limitations.map((limitation, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400"
                        >
                          <span className="text-slate-300 dark:text-slate-600 mt-1">−</span>
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CTA Button */}
                <Button
                  onClick={() => handleCheckout(tier.id)}
                  variant={tier.ctaVariant}
                  className="w-full"
                  size="lg"
                >
                  {tier.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Preguntas Frecuentes</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                ¿Puedo cambiar de plan?
              </h3>
              <p className="text-slate-700 dark:text-slate-300">
                Sí, puedes actualizar o degradar tu plan en cualquier momento. Los cambios se
                reflejarán en tu próximo ciclo de facturación.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                ¿Hay período de prueba?
              </h3>
              <p className="text-slate-700 dark:text-slate-300">
                Sí, Pro incluye 14 días de prueba gratis. Sin necesidad de tarjeta de crédito.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                ¿Qué métodos de pago aceptan?
              </h3>
              <p className="text-slate-700 dark:text-slate-300">
                Aceptamos tarjetas de crédito (Visa, Mastercard, Amex) a través de Stripe.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                ¿Hay descuento anual?
              </h3>
              <p className="text-slate-700 dark:text-slate-300">
                Sí, al pagar anual ahorras un 20% en todos los planes pagos.
              </p>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            ¿Necesitas ayuda? Contáctanos en support@amtme.com
          </p>
        </div>
      </div>
    </div>
  );
}

export default Pricing;
