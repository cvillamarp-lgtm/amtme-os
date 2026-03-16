import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import type { EpisodeOperationalState } from "@/hooks/useEpisodeOperationalState";

type Episode = Tables<"episodes">;

interface NextAction {
  label: string;
  description: string;
  tabKey?: string;
  href?: string;
  done?: boolean;
}

function deriveNextAction(
  episode: Episode,
  state: EpisodeOperationalState
): NextAction {
  const { takes, quotes, assetCandidates, exportPackages, publicationQueue } = state;

  // 1. Datos base incompletos
  if (!episode.working_title && !episode.title && !episode.theme) {
    return {
      label: "Completa los datos base",
      description: "El episodio necesita un título y tema para comenzar.",
      tabKey: "data",
    };
  }

  // 2. Sin guión
  if (!episode.script_md) {
    return {
      label: "Genera o escribe el guión",
      description: "El guión es el punto de partida de la producción.",
      tabKey: "script",
    };
  }

  // 3. Sin tomas de audio
  const takesData = takes.data ?? [];
  if (takesData.length === 0) {
    return {
      label: "Graba el episodio",
      description: "Aún no hay tomas de audio registradas.",
      href: `/audio?episode_id=${episode.id}`,
    };
  }

  // 4. Tiene guión pero sin quotes
  const quotesData = quotes.data ?? [];
  if (quotesData.length === 0) {
    return {
      label: "Extrae quotes del guión",
      description: "Añade citas clave para usar en contenido social.",
      tabKey: "script",
    };
  }

  // 5. Sin asset candidates
  const assetsData = assetCandidates.data ?? [];
  if (assetsData.length === 0) {
    return {
      label: "Genera los assets visuales",
      description: "No hay assets generados para este episodio.",
      href: `/factory?episode_id=${episode.id}`,
    };
  }

  // 6. Sin paquete de exportación
  const exportsData = exportPackages.data ?? [];
  if (exportsData.length === 0) {
    return {
      label: "Crea el paquete de exportación",
      description: "Empaqueta los assets aprobados para distribución.",
      tabKey: "produccion",
    };
  }

  // 7. Sin publicación programada
  const queueData = publicationQueue.data ?? [];
  if (queueData.length === 0) {
    return {
      label: "Programa la publicación",
      description: "El episodio está listo — falta programar la fecha.",
      tabKey: "publish",
    };
  }

  // ✓ Todo listo
  return {
    label: "Episodio listo para publicar",
    description: "Todos los pasos del flujo están completados.",
    done: true,
  };
}

interface Props {
  episode: Episode;
  operationalState: EpisodeOperationalState;
  onTabChange: (tabKey: string) => void;
}

export function NextActionBanner({ episode, operationalState, onTabChange }: Props) {
  const navigate = useNavigate();
  const action = deriveNextAction(episode, operationalState);

  if (action.done) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 mb-4">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {action.label}
        </p>
        <p className="text-xs text-muted-foreground hidden sm:block">· {action.description}</p>
      </div>
    );
  }

  const handleClick = () => {
    if (action.tabKey) {
      onTabChange(action.tabKey);
    } else if (action.href) {
      navigate(action.href);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 mb-4">
      <AlertCircle className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">
          Siguiente paso:{" "}
          <span className="text-primary">{action.label}</span>
        </p>
        <p className="text-xs text-muted-foreground truncate">{action.description}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs shrink-0"
        onClick={handleClick}
      >
        Ir <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}
