import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Mock heavy external dependencies ─────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

vi.mock("@/hooks/useEpisode", () => ({
  useEpisodes: vi.fn().mockReturnValue({ data: [], isLoading: false, error: null }),
}));

vi.mock("@/hooks/useEpisodeDraft", () => ({
  useEpisodeDraft: vi.fn().mockReturnValue({
    draft: {
      id: null,
      idea_principal: "",
      tono: "",
      restricciones: "",
      release_date: "",
      conflict_options_json: null,
      selected_conflicto: null,
      selected_intencion: null,
      step: 1,
    },
    saveDraft: vi.fn(),
    loadActiveDraft: vi.fn().mockResolvedValue(null),
    markConverted: vi.fn(),
    clearDraft: vi.fn(),
  }),
}));

vi.mock("@/services/functions/invokeEdgeFunction", () => ({
  invokeEdgeFunction: vi.fn().mockResolvedValue({}),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/useSmartTable", () => ({
  useSmartTable: vi.fn().mockReturnValue({
    filteredData: [],
    filteredCount: 0,
    sortRules: [],
    filters: [],
    selectedIds: new Set(),
    viewType: "table",
    visibleColumns: [],
    savedViews: [],
    setSortRules: vi.fn(),
    setFilters: vi.fn(),
    setSelectedIds: vi.fn(),
    setViewType: vi.fn(),
    setVisibleColumns: vi.fn(),
    setSavedViews: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
    toggleRow: vi.fn(),
    isSelected: vi.fn(),
  }),
}));

vi.mock("@/components/smart-table", () => ({
  ListingToolbar: () => React.createElement("div", { "data-testid": "listing-toolbar" }),
  FiltersPanel: () => null,
  ViewsTabs: () => null,
  BulkActionsBar: () => null,
  SmartEmptyState: () => React.createElement("div", { "data-testid": "empty-state" }),
}));

// ── Import component AFTER mocks ──────────────────────────────────────────────

import Episodes from "@/pages/Episodes";

// ── Helper ────────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderEpisodes() {
  const client = makeClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Episodes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Episodes page — smoke test", () => {
  it("renders the page title", () => {
    renderEpisodes();
    expect(screen.getByText("Episodios")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    renderEpisodes();
    expect(screen.getByText(/Fuente de verdad/i)).toBeInTheDocument();
  });

  it("renders without crashing when episodes list is empty", () => {
    const { container } = renderEpisodes();
    expect(container).toBeDefined();
  });
});
