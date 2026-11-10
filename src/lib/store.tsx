"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { AdminData, TenantData } from "@/lib/types";

export interface Toast {
  id: number;
  msg: string;
  kind: "success" | "error" | "info";
  action?: { label: string; run: () => void };
}

interface AppCtx {
  ready: boolean;
  role: "tenant" | "admin" | null;
  data: TenantData | null;
  admin: AdminData | null;
  syncing: boolean;
  lastSync: Date | null;
  toasts: Toast[];
  toast: (msg: string, kind?: Toast["kind"], action?: Toast["action"]) => void;
  dismissToast: (id: number) => void;
  refresh: (silent?: boolean) => Promise<void>;
  act: (action: string, payload?: Record<string, unknown>) => Promise<{ ok: boolean; result?: Record<string, unknown>; error?: string }>;
  login: (
    email: string,
    password: string
  ) => Promise<{ role: "tenant" | "admin"; structures: string[] | null } | null>;
  register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<{ ok: boolean; error?: string; structures?: string[] }>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AppCtx>(null as unknown as AppCtx);

let toastSeq = 1;

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<"tenant" | "admin" | null>(null);
  const [data, setData] = useState<TenantData | null>(null);
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();
  const busy = useRef(false);
  const knownVersion = useRef<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((msg: string, kind: Toast["kind"] = "success", action?: Toast["action"]) => {
    const id = toastSeq++;
    setToasts((ts) => [...ts.slice(-3), { id, msg, kind, action }]);
    setTimeout(() => dismissToast(id), action ? 9000 : 4500);
  }, [dismissToast]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.status === 401) {
        setRole(null); setData(null); setAdmin(null);
        return null;
      }
      const json = await res.json();
      if (json.ok) {
        setRole(json.role);
        setData(json.data ?? null);
        setAdmin(json.admin ?? null);
        if (json.data?.latestUpdate?.version) {
          knownVersion.current = json.data.latestUpdate.version;
        }
        setLastSync(new Date());
        return json.role as "tenant" | "admin";
      }
    } catch { /* offline */ }
    return null;
  }, []);

  useEffect(() => {
    load().finally(() => setReady(true));
  }, [load]);

  // Fluid automatic propagation across desktop, mobile & installed PWA tabs
  useEffect(() => {
    if (typeof window === "undefined") return;
    let disposed = false;

    try {
      const ch = new BroadcastChannel("scolaria_sync");
      channelRef.current = ch;
      ch.onmessage = (ev) => {
        if (disposed) return;
        if (ev.data?.type === "update" || ev.data?.type === "sync") {
          void load();
        }
      };
    } catch { /* BroadcastChannel optional */ }

    const checkUpdates = async () => {
      if (disposed || document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/updates", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const nextVer: string | undefined = json?.latest?.version;
        if (!nextVer) return;
        if (knownVersion.current === null) {
          knownVersion.current = nextVer;
          return;
        }
        if (nextVer !== knownVersion.current) {
          knownVersion.current = nextVer;
          await load();
          router.refresh();
          toast(`__auto_updated__:${nextVer}`, "info");
        }
      } catch { /* offline / transient */ }
    };

    const timer = window.setInterval(() => { void checkUpdates(); }, 25000);
    const onWake = () => { void checkUpdates(); };
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [load, router, toast]);

  const refresh = useCallback(async (silent = false) => {
    if (busy.current) return;
    busy.current = true;
    setSyncing(true);
    try {
      const started = Date.now();
      await load();
      const wait = Math.max(0, 650 - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      if (!silent) toast("__synced__", "info");
    } finally {
      setSyncing(false);
      busy.current = false;
    }
  }, [load, toast]);

  const act = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const json = await res.json();
      if (json.ok) {
        if (json.data !== undefined) setData(json.data);
        if (json.admin !== undefined) setAdmin(json.admin);
        if (action === "admin.publish" || action === "admin.publish.deploy") {
          channelRef.current?.postMessage({ type: "update", version: json.result?.version });
        }
        setLastSync(new Date());
        return { ok: true, result: json.result ?? {} };
      }
      return { ok: false, error: json.error ?? "server" };
    } catch {
      return { ok: false, error: "server" };
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const json = await res.json();
      if (json.ok) {
        await load();
        return {
          role: json.role as "tenant" | "admin",
          structures: Array.isArray(json.structures) ? (json.structures as string[]) : null,
        };
      }
    } catch { /* ignore */ }
    return null;
  }, [load]);

  const register = useCallback(async (input: { name: string; email: string; password: string; phone?: string }) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", ...input }),
      });
      const json = await res.json();
      if (json.ok) {
        await load();
        return {
          ok: true,
          structures: Array.isArray(json.structures) ? (json.structures as string[]) : undefined,
        };
      }
      return { ok: false, error: String(json.error ?? "server") };
    } catch {
      return { ok: false, error: "server" };
    }
  }, [load]);

  const logout = useCallback(async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setRole(null); setData(null); setAdmin(null);
  }, []);

  return (
    <Ctx.Provider value={{ ready, role, data, admin, syncing, lastSync, toasts, toast, dismissToast, refresh, act, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  return useContext(Ctx);
}