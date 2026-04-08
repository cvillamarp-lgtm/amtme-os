/**
 * Auto-seeds default narrative skeletons for a user on first login.
 * Runs once per session; no-ops if skeletons already exist.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_SKELETONS = [
  {
    name: "Monólogo 5 Actos",
    objective: "Episodio de reflexión personal con arco emocional completo",
    episode_type: "solo",
    suggested_duration: "25-35 min",
    is_default: true,
    blocks: [
      {
        order: 1,
        name: "Apertura / Gancho",
        duration_pct: 10,
        purpose: "Capturar la atención. Promesa emocional o pregunta perturbadora.",
        prompts: ["¿Cuál es la pregunta que nadie se atreve a hacer?", "¿Qué pasaría si…?"],
        tone: "Intenso, directo",
      },
      {
        order: 2,
        name: "Contexto / Mundo",
        duration_pct: 20,
        purpose: "Establecer el problema. Que el oyente se identifique.",
        prompts: ["¿Dónde estaba yo?", "¿Por qué esto importa ahora?"],
        tone: "Conversacional, empático",
      },
      {
        order: 3,
        name: "Conflicto / Giro",
        duration_pct: 35,
        purpose: "El núcleo del episodio. La verdad incómoda o el momento de cambio.",
        prompts: ["¿Cuál fue el momento exacto?", "¿Qué nadie me explicó?"],
        tone: "Vulnerable, honesto",
      },
      {
        order: 4,
        name: "Resolución / Aprendizaje",
        duration_pct: 25,
        purpose: "Lo que cambió. No el happy ending, sino la realidad nueva.",
        prompts: ["¿Qué aprendí que no quería aprender?", "¿Cómo vivo diferente ahora?"],
        tone: "Reflexivo, práctico",
      },
      {
        order: 5,
        name: "Cierre / CTA",
        duration_pct: 10,
        purpose: "Dejar algo accionable o una pregunta abierta para el oyente.",
        prompts: ["¿Qué harías tú?", "La próxima semana intenta…"],
        tone: "Cálido, invitador",
      },
    ],
  },
  {
    name: "Verdad Incómoda",
    objective: "Episodio confrontacional que desafía una creencia popular",
    episode_type: "solo",
    suggested_duration: "15-25 min",
    is_default: true,
    blocks: [
      {
        order: 1,
        name: "La Afirmación",
        duration_pct: 15,
        purpose: "Declarar la verdad incómoda desde el primer minuto.",
        prompts: ["La verdad que nadie quiere escuchar es…", "Todos dicen X pero en realidad…"],
        tone: "Directo, sin rodeos",
      },
      {
        order: 2,
        name: "Por Qué Creemos la Mentira",
        duration_pct: 30,
        purpose: "Empatía con el error. ¿De dónde viene esta creencia?",
        prompts: ["Lo creemos porque nadie nos enseñó…", "La sociedad nos dijo que…"],
        tone: "Comprensivo, sin juicio",
      },
      {
        order: 3,
        name: "La Evidencia",
        duration_pct: 35,
        purpose: "Historia personal o datos concretos que prueban la verdad.",
        prompts: ["Cuando lo viví yo…", "Tres ejemplos concretos son…"],
        tone: "Específico, concreto",
      },
      {
        order: 4,
        name: "Qué Hacer Diferente",
        duration_pct: 20,
        purpose: "Un cambio accionable pequeño y realista.",
        prompts: ["Lo que cambié fue…", "Empieza por esto esta semana…"],
        tone: "Práctico, alcanzable",
      },
    ],
  },
  {
    name: "Historia de Vida",
    objective: "Narrar un episodio autobiográfico con reflexión final",
    episode_type: "solo",
    suggested_duration: "30-45 min",
    is_default: true,
    blocks: [
      {
        order: 1,
        name: "Escena de Apertura",
        duration_pct: 10,
        purpose: "In medias res. Comenzar en el momento más intenso.",
        prompts: ["Era las 3am cuando…", "No recuerdo exactamente cuándo fue que…"],
        tone: "Cinematográfico, sensorial",
      },
      {
        order: 2,
        name: "El Contexto de Quién Era Yo",
        duration_pct: 20,
        purpose: "¿Quién eras antes de que pasara esto? ¿Qué creías?",
        prompts: ["En ese momento yo pensaba que…", "Mi mundo era…"],
        tone: "Introspectivo",
      },
      {
        order: 3,
        name: "Lo Que Pasó",
        duration_pct: 35,
        purpose: "El relato cronológico del evento o período.",
        prompts: ["Y entonces fue cuando…", "Lo que nadie sabe es que…"],
        tone: "Narrativo, específico",
      },
      {
        order: 4,
        name: "El Quiebre",
        duration_pct: 15,
        purpose: "El momento exacto donde algo cambió para siempre.",
        prompts: ["El momento en que todo cambió fue…", "Y ahí entendí que…"],
        tone: "Visceral, honesto",
      },
      {
        order: 5,
        name: "Quién Soy Ahora",
        duration_pct: 15,
        purpose: "Reflexión desde el presente. Sin moraleja forzada.",
        prompts: ["Hoy vivo con…", "No lo superé, pero aprendí a…"],
        tone: "Maduro, sin dramatismo",
      },
      {
        order: 6,
        name: "Pregunta Abierta",
        duration_pct: 5,
        purpose: "Invitar al oyente a su propia reflexión.",
        prompts: ["¿Y tú, cuándo fue tu quiebre?"],
        tone: "Íntimo, universal",
      },
    ],
  },
];

export function useNarrativeSkeletonSeed() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: existingCount, isSuccess } = useQuery({
    queryKey: ["narrative_skeletons_count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("narrative_skeletons")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: Infinity, // Only check once per session
  });

  useEffect(() => {
    if (!isSuccess || !user || (existingCount ?? 0) > 0) return;

    const seed = async () => {
      const records = DEFAULT_SKELETONS.map((s) => ({
        ...s,
        user_id: user.id,
        blocks: s.blocks as any, // jsonb — array of block objects
      }));

      const { error } = await supabase.from("narrative_skeletons").insert(records);
      if (error) {
        // Seeding failed - user will create skeletons manually
        return; // don't invalidate if insert failed — avoids infinite retry
      }
      qc.invalidateQueries({ queryKey: ["narrative_skeletons"] });
      qc.invalidateQueries({ queryKey: ["narrative_skeletons_count", user.id] });
    };

    seed();
  }, [isSuccess, existingCount, user, qc]);
}
