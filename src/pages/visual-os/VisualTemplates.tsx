/**
 * VisualTemplates — Módulo de Plantilla Maestra
 * ───────────────────────────────────────────────
 * Read-only (or admin-edit) view of all brand rules, palette tokens,
 * typography constraints, the 15 piece definitions and safe zones.
 *
 * This is the authoritative source of truth for the visual system.
 * Normal editors can VIEW but not accidentally modify brand rules.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ShieldCheck, Palette, Type, Layers, Ruler, BookOpen,
  ChevronDown, ChevronUp, Lock, CheckCircle2, XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useVisualTemplates, useTemplateRules } from "@/hooks/visual-os/useVisualTemplates";
import type { VisualTemplate, BrandToken } from "@/lib/visual-os/types";
import { VOSPalette, TYPOGRAPHY_RULES, ALLOWED_EFFECTS, PROHIBITED_EFFECTS } from "@/lib/visual-os/palette";

// ─── Brand tokens query ───────────────────────────────────────────────────────

function useBrandTokens() {
  return useQuery({
    queryKey: ["brand_tokens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_tokens")
        .select("*")
        .eq("is_active", true)
        .order("token_type");
      if (error) throw error;
      return (data ?? []) as BrandToken[];
    },
  });
}

function useSystemSettings() {
  return useQuery({
    queryKey: ["visual_system_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visual_system_settings")
        .select("*")
        .order("key");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorSwatch({ hex, label, prohibited = false }: {
  hex: string; label: string; prohibited?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn("h-8 w-8 rounded-md border shrink-0", prohibited && "opacity-50")}
        style={{ backgroundColor: hex, borderColor: prohibited ? "rgb(239 68 68 / 0.4)" : "transparent" }}
      />
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{label}</p>
        <p className="text-[10px] font-mono text-muted-foreground">{hex}</p>
      </div>
      {prohibited && <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
    </div>
  );
}

function TemplateCard({ tpl }: { tpl: VisualTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const { data: rules = [] } = useTemplateRules(expanded ? tpl.id : undefined);

  const safeW = tpl.width_px - tpl.safe_zone_left - tpl.safe_zone_right;
  const safeH = tpl.height_px - tpl.safe_zone_top  - tpl.safe_zone_bottom;
  const safeArea = ((safeW * safeH) / (tpl.width_px * tpl.height_px) * 100).toFixed(0);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Code pill */}
        <span className="font-mono text-xs font-bold text-muted-foreground w-8 shrink-0">
          {tpl.piece_code}
        </span>

        {/* Color dot (background) */}
        <div
          className="h-4 w-4 rounded-sm shrink-0"
          style={{ backgroundColor: tpl.background_color }}
        />

        {/* Name + format */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{tpl.piece_name}</p>
          <p className="text-[10px] text-muted-foreground">
            {tpl.width_px}×{tpl.height_px}px · {tpl.format} · {safeArea}% área segura
          </p>
        </div>

        {/* Production order */}
        <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
          #{tpl.production_order}
        </span>

        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Safe zone diagram */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5" /> Safe zones
              </p>
              <div className="text-xs text-muted-foreground space-y-0.5 font-mono">
                <p>Top:    {tpl.safe_zone_top}px</p>
                <p>Right:  {tpl.safe_zone_right}px</p>
                <p>Bottom: {tpl.safe_zone_bottom}px</p>
                <p>Left:   {tpl.safe_zone_left}px</p>
                <p className="pt-1 text-foreground/60">
                  Área activa: {safeW}×{safeH}px ({safeArea}%)
                </p>
              </div>
            </div>

            {/* Mini safe zone visualizer */}
            <div className="flex items-center justify-center">
              <div
                className="relative border border-border/50"
                style={{
                  width: 80,
                  height: Math.round(80 * tpl.height_px / tpl.width_px),
                  backgroundColor: tpl.background_color + "33",
                  maxHeight: 120,
                }}
              >
                <div
                  className="absolute border border-dashed border-[#EAFF00]/60"
                  style={{
                    top:    `${(tpl.safe_zone_top    / tpl.height_px) * 100}%`,
                    right:  `${(tpl.safe_zone_right  / tpl.width_px)  * 100}%`,
                    bottom: `${(tpl.safe_zone_bottom / tpl.height_px) * 100}%`,
                    left:   `${(tpl.safe_zone_left   / tpl.width_px)  * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Composition notes */}
          {tpl.composition_notes && (
            <div>
              <p className="text-xs font-medium mb-1">Notas de composición</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tpl.composition_notes}
              </p>
            </div>
          )}

          {/* Copy blocks */}
          {rules.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Bloques de copy</p>
              <div className="space-y-1">
                {rules.map(r => (
                  <div key={r.rule_key} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-[10px] text-muted-foreground w-36 shrink-0 truncate">
                      {r.rule_key}
                    </span>
                    <span className="text-muted-foreground/70 truncate flex-1">{r.label}</span>
                    {r.is_required && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0 text-amber-500 border-amber-500/30">
                        obligatorio
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VisualTemplates() {
  const { data: templates = [] } = useVisualTemplates();
  const { data: tokens    = [] } = useBrandTokens();
  const { data: settings  = [] } = useSystemSettings();

  const colorTokens  = tokens.filter(t => t.token_type === "color");
  const ruleTokens   = tokens.filter(t => t.token_type === "rule");

  const brandColors = colorTokens.filter(t => !t.token_name.startsWith("prohibited"));
  const prohibited  = colorTokens.filter(t =>  t.token_name.startsWith("prohibited"));

  const globalRule = settings.find(s => s.key === "global_system_rule");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-5">
        <Link
          to="/visual"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors w-fit"
        >
          <ArrowLeft className="h-3 w-3" /> Visual OS
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#193497]">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Plantilla Maestra</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reglas fijas del sistema visual — solo lectura para editores
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span>Reglas fijas del sistema</span>
          </div>
        </div>

        {/* Global rule banner */}
        {globalRule && (
          <div className="mt-4 rounded-md bg-[#193497]/10 border border-[#193497]/20 px-4 py-3">
            <p className="text-xs font-medium text-[#193497] dark:text-blue-300 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Regla global del sistema
            </p>
            <p className="text-xs text-muted-foreground">
              {String(globalRule.value_json).replace(/^"|"$/g, "")}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="templates" className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="shrink-0 mx-6 mt-4 w-fit h-8 text-xs">
          <TabsTrigger value="templates" className="text-xs gap-1.5">
            <Layers className="h-3.5 w-3.5" /> 15 Piezas
          </TabsTrigger>
          <TabsTrigger value="palette" className="text-xs gap-1.5">
            <Palette className="h-3.5 w-3.5" /> Paleta
          </TabsTrigger>
          <TabsTrigger value="typography" className="text-xs gap-1.5">
            <Type className="h-3.5 w-3.5" /> Tipografía
          </TabsTrigger>
          <TabsTrigger value="rules" className="text-xs gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Reglas
          </TabsTrigger>
          <TabsTrigger value="done" className="text-xs gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Definición de listo
          </TabsTrigger>
        </TabsList>

        {/* ── Templates tab ──────────────────────────────────────────────── */}
        <TabsContent value="templates" className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {templates.map(tpl => (
              <TemplateCard key={tpl.id} tpl={tpl} />
            ))}
          </div>
        </TabsContent>

        {/* ── Palette tab ────────────────────────────────────────────────── */}
        <TabsContent value="palette" className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-lg space-y-6">
            {/* Allowed */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Paleta única permitida</h3>
              <div className="grid grid-cols-2 gap-3">
                {brandColors.length > 0
                  ? brandColors.map(t => (
                      <ColorSwatch key={t.id} hex={t.token_value} label={t.label ?? t.token_name} />
                    ))
                  : Object.entries(VOSPalette).map(([key, hex]) => (
                      <ColorSwatch key={key} hex={hex} label={key} />
                    ))
                }
              </div>
            </div>

            <Separator />

            {/* Prohibited */}
            <div>
              <h3 className="text-sm font-semibold mb-1">Colores prohibidos</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Usar cualquiera de estos provoca un error crítico en la validación.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {prohibited.length > 0
                  ? prohibited.map(t => (
                      <ColorSwatch key={t.id} hex={t.token_value} label={t.label ?? t.token_name} prohibited />
                    ))
                  : (
                    <>
                      <ColorSwatch hex="#1400FF" label="Cobalt antiguo" prohibited />
                      <ColorSwatch hex="#000000" label="Negro puro (usar INK)" prohibited />
                      <ColorSwatch hex="#FFFFFF" label="Blanco puro (usar PAPER)" prohibited />
                    </>
                  )
                }
              </div>
            </div>

            <Separator />

            {/* Green rule */}
            <div className="rounded-md bg-[#EAFF00]/5 border border-[#EAFF00]/20 px-4 py-3">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-1" style={{ color: "#EAFF00" }}>
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#EAFF00" }} />
                Highlighter Green #EAFF00
              </p>
              <p className="text-xs text-muted-foreground">
                Solo como microacento. Máximo <strong>1 elemento por pieza</strong>. Usar en: NUEVO EPISODIO, CTA, etiqueta EP, número de slide. No en dominantes.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ── Typography tab ─────────────────────────────────────────────── */}
        <TabsContent value="typography" className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-lg space-y-5">
            <div>
              <h3 className="text-sm font-semibold mb-3">Familias permitidas</h3>
              <div className="space-y-2">
                {TYPOGRAPHY_RULES.allowedFamilies.map(f => (
                  <div key={f} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3">Pesos permitidos</h3>
              <div className="flex gap-2 flex-wrap">
                {TYPOGRAPHY_RULES.allowedWeights.map(w => (
                  <div key={w} className="rounded-md border border-border px-4 py-2 text-center">
                    <p className="text-lg leading-none mb-1" style={{ fontWeight: w }}>Aa</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{w}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3">Restricciones</h3>
              <div className="space-y-2">
                {[
                  { label: `Máximo ${TYPOGRAPHY_RULES.maxHierarchies} niveles jerárquicos por pieza`, pass: true },
                  { label: `Máximo ${TYPOGRAPHY_RULES.maxStyles} estilos tipográficos por pieza`,    pass: true },
                  { label: "Cursivas — PROHIBIDAS",                pass: false },
                  { label: "Serif — PROHIBIDO",                    pass: false },
                  { label: "Lettering decorativo — PROHIBIDO",     pass: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    {item.pass
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <XCircle      className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                    <span className={item.pass ? "" : "text-red-400"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Rules tab ──────────────────────────────────────────────────── */}
        <TabsContent value="rules" className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-lg space-y-5">
            {/* Allowed effects */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Efectos permitidos</h3>
              <div className="space-y-1.5">
                {ALLOWED_EFFECTS.map(e => (
                  <div key={e} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="capitalize">{e.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Prohibited effects */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Efectos prohibidos</h3>
              <div className="space-y-1.5">
                {PROHIBITED_EFFECTS.map(e => (
                  <div key={e} className="flex items-center gap-2 text-xs">
                    <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <span className="text-red-400 capitalize">{e.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* System rules from DB */}
            {ruleTokens.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Reglas del sistema</h3>
                <div className="space-y-2">
                  {ruleTokens.map(r => (
                    <div key={r.id} className="rounded-md border border-border px-3 py-2 text-xs">
                      <p className="font-medium">{r.label ?? r.token_name}</p>
                      <p className="text-muted-foreground mt-0.5 font-mono">{r.token_value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Host rules */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Reglas del host</h3>
              <div className="space-y-1.5 text-xs">
                {[
                  { label: "Hombre real, edad aparente 30–42",         pass: true  },
                  { label: "Expresión sobria y contenida",             pass: true  },
                  { label: "Natural, honesto, editorial",              pass: true  },
                  { label: "Stock — PROHIBIDO",                        pass: false },
                  { label: "Caricatura — PROHIBIDA",                   pass: false },
                  { label: "Dramatizado — PROHIBIDO",                  pass: false },
                  { label: "Postura tranquila y presencia masculina",   pass: true  },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.pass
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <XCircle      className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                    <span className={item.pass ? "" : "text-red-400"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Definition of done tab ─────────────────────────────────────── */}
        <TabsContent value="done" className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-lg space-y-4">
            <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 px-4 py-3">
              <p className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Definición de "Listo" — Global
              </p>
              <p className="text-xs text-muted-foreground">
                Una pieza solo puede pasar al estado <strong>"Aprobado"</strong> si cumple todos estos criterios sin excepción.
              </p>
            </div>

            <div className="space-y-2">
              {[
                "Respeta el formato exacto (px de la plantilla)",
                "Respeta las safe zones definidas",
                "Usa únicamente la paleta permitida (INK / PAPER / COBALT / GREEN)",
                "El host se ve natural y editorial — no stock, no caricatura",
                "Comunica en menos de 2 segundos",
                "Funciona y es legible en miniatura",
                "Solo produce la pieza especificada — sin variantes",
                "El bloque de copy obligatorio está completo y sin placeholders",
                "Máximo 3 niveles jerárquicos por pieza",
                "Sin cursivas en ningún elemento",
                "Verde usado como microacento en máximo 1 elemento",
                "Está lista para publicar directamente desde la exportación",
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md border border-border px-3 py-2.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-px" />
                  <span>{c}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Approval flow */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Flujo de aprobación</h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { s: "borrador",    color: "bg-zinc-500/20 text-zinc-400"    },
                  { s: "→",           color: "text-muted-foreground"           },
                  { s: "en_revision", color: "bg-amber-500/20 text-amber-400"  },
                  { s: "→",           color: "text-muted-foreground"           },
                  { s: "corregir",    color: "bg-red-500/20 text-red-400"      },
                  { s: "→",           color: "text-muted-foreground"           },
                  { s: "aprobado",    color: "bg-emerald-500/20 text-emerald-400" },
                  { s: "→",           color: "text-muted-foreground"           },
                  { s: "exportado",   color: "bg-blue-500/20 text-blue-400"    },
                  { s: "→",           color: "text-muted-foreground"           },
                  { s: "publicado",   color: "bg-violet-500/20 text-violet-400" },
                ].map((item, i) => (
                  item.s === "→"
                    ? <span key={i} className="text-muted-foreground">→</span>
                    : (
                      <span key={i} className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        item.color,
                      )}>
                        {item.s}
                      </span>
                    )
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Solo se puede mover a <strong>Aprobado</strong> o <strong>Exportado</strong>
                {" "}cuando todas las validaciones críticas pasan.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
