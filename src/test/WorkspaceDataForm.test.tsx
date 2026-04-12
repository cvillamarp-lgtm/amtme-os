import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { WorkspaceDataForm } from "@/components/workspace/WorkspaceDataForm";

vi.mock("@/components/workspace/BlockWrapper", () => ({
  BlockWrapper: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/services/functions/invokeEdgeFunction", () => ({
  invokeEdgeFunction: vi.fn(),
}));

vi.mock("@/services/functions/edgeFunctionErrors", () => ({
  showEdgeFunctionError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const baseEpisode = {
  id: "ep-1",
  number: "01",
  title: "Episodio 01",
  idea_principal: "Idea inicial",
  working_title: "Título de trabajo",
  final_title: "",
  titulo_original: "",
  theme: "Tema",
  core_thesis: "Tesis",
  summary: "Resumen con suficientes caracteres",
  descripcion_spotify: "Descripción Spotify suficientemente larga",
  link_spotify: "",
  hook: "Hook",
  cta: "CTA",
  quote: "",
  release_date: "",
  duration: "",
  nota_trazabilidad: "Nota",
  conflicto_detectado: false,
  conflicto_nota: "",
  fecha_es_estimada: false,
  nivel_completitud: "D",
  block_states: {},
  version_history: {},
};

describe("WorkspaceDataForm", () => {
  it("renders and hydrates idea principal field", () => {
    render(
      <WorkspaceDataForm
        episode={baseEpisode as any}
        onSave={vi.fn().mockResolvedValue(undefined)}
        isSaving={false}
      />,
    );

    expect(screen.getByText("Idea principal *")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Idea inicial")).toBeInTheDocument();
  });

  it("includes idea_principal in manual save payload", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<WorkspaceDataForm episode={baseEpisode as any} onSave={onSave} isSaving={false} />);

    const ideaField = screen.getByDisplayValue("Idea inicial");
    fireEvent.change(ideaField, { target: { value: "Nueva idea principal" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({
        idea_principal: "Nueva idea principal",
      }));
    });
  });
});
