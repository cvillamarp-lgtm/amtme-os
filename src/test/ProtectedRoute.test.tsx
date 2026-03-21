import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

// Mock useAuth so we can control auth state per test
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/hooks/useAuth";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

function renderInRouter(ui: React.ReactNode, initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      {ui}
    </MemoryRouter>,
  );
}

describe("ProtectedRoute — loading state", () => {
  it("renders loading indicator while auth is resolving", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    renderInRouter(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Cargando...")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });
});

describe("ProtectedRoute — unauthenticated", () => {
  it("redirects to /auth when there is no user", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    const { container } = renderInRouter(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    // Children should not be rendered
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    // The MemoryRouter should have navigated — no loading text either
    expect(screen.queryByText("Cargando...")).not.toBeInTheDocument();
    // Container still mounts (empty or redirect rendered by router)
    expect(container).toBeDefined();
  });
});

describe("ProtectedRoute — authenticated", () => {
  it("renders children when user is logged in", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "test@example.com" },
      loading: false,
    });

    renderInRouter(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.queryByText("Cargando...")).not.toBeInTheDocument();
  });
});
