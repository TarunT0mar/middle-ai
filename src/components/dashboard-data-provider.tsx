"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { WorkspaceState } from "@/lib/domain";

interface DashboardData {
  state: WorkspaceState | null;
  isLoading: boolean;
  error: string | null;
  demoMode: boolean;
  integrations: { supabase: boolean; ai: boolean; aiProvider: "deepseek" | "openai" | null; whatsapp: boolean };
  refresh: () => Promise<void>;
  mutate: (data: Record<string, unknown>) => Promise<unknown>;
}

const DashboardDataContext = createContext<DashboardData | null>(null);

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(true);
  const [integrations, setIntegrations] = useState<{ supabase: boolean; ai: boolean; aiProvider: "deepseek" | "openai" | null; whatsapp: boolean }>({ supabase: false, ai: false, aiProvider: null, whatsapp: false });

  const refresh = useCallback(async () => {
    const response = await fetch("/api/app", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load this workspace.");
    setError(null);
    setState(payload.state ?? null);
    setDemoMode(Boolean(payload.demoMode));
    setIntegrations(payload.integrations ?? { supabase: false, ai: false, aiProvider: null, whatsapp: false });
  }, []);

  useEffect(() => {
    Promise.resolve().then(refresh).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load this workspace."))
      .finally(() => setIsLoading(false));
  }, [refresh]);

  const mutate = useCallback(async (data: Record<string, unknown>) => {
    const response = await fetch("/api/app", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "That change could not be saved.");
    await refresh();
    return payload;
  }, [refresh]);

  const value = useMemo(() => ({ state, isLoading, error, demoMode, integrations, refresh, mutate }), [state, isLoading, error, demoMode, integrations, refresh, mutate]);
  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) throw new Error("useDashboardData must be used within DashboardDataProvider");
  return context;
}
