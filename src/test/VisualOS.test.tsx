import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Mock external dependencies ────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

vi.mock("@/hooks/visual-os/useVisualEpisodes", () => ({
  useVisualEpisodes: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}));

// ── Import component AFTER mocks ──────────────────────────────────────────────

import VisualOS from "@/pages/visual-os/VisualOS";

// ── Helper ────────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderVisualOS() {
  const client = makeClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VisualOS />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("VisualOS page — smoke test", () => {
  it("renders the page title", () => {
    renderVisualOS();
    expect(screen.getByText("AMTME Visual OS")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    renderVisualOS();
    expect(
      screen.getByText(/Sistema de producción visual del podcast/i),
    ).toBeInTheDocument();
  });

  it("renders without crashing when episode list is empty", () => {
    const { container } = renderVisualOS();
    expect(container).toBeDefined();
  });
});
