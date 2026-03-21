import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  let authStateCallback: ((event: string, session: unknown) => void) | null = null;

  const mockSupabase = {
    auth: {
      onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
        authStateCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      _triggerAuthChange: (event: string, session: unknown) => {
        if (authStateCallback) authStateCallback(event, session);
      },
    },
  };
  return { supabase: mockSupabase };
});

import { supabase } from "@/integrations/supabase/client";

const mockAuth = supabase.auth as unknown as {
  getSession: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
  _triggerAuthChange: (event: string, session: unknown) => void;
};

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no active session
  mockAuth.getSession.mockResolvedValue({ data: { session: null } });
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: unknown) => void) => {
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
  );
});

describe("useAuth — unauthenticated", () => {
  it("returns null user and loading=false after session resolves to null", async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initially loading
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

describe("useAuth — authenticated", () => {
  it("returns user and loading=false when session exists", async () => {
    const fakeUser = { id: "user-42", email: "demo@amtme.com" };
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: fakeUser } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.user).toMatchObject({ id: "user-42" });
    expect(result.current.loading).toBe(false);
  });
});

describe("useAuth — context default value", () => {
  it("returns null user and loading=true when used outside AuthProvider", () => {
    const { result } = renderHook(() => useAuth());

    // The context default is { user: null, loading: true }
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
