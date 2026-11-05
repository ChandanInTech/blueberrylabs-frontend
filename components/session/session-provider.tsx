"use client";

import type { DemoSession } from "@social-resizer/contracts";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { endSession, loadSession, startDemoSession } from "@/lib/auth";

type SessionStatus = "loading" | "authenticated" | "anonymous";

interface SessionContextValue {
  status: SessionStatus;
  session: DemoSession | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Demo session state for the whole app.
 *
 * The API holds the authority (HttpOnly cookie); this provider only mirrors
 * "who does the server say I am" so the UI can avoid a flash of content.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [session, setSession] = useState<DemoSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();

    loadSession(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setSession(result);
        setStatus(result ? "authenticated" : "anonymous");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatus("anonymous");
      });

    return () => controller.abort();
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const created = await startDemoSession();
      setSession(created);
      setStatus("authenticated");
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not start the demo session.");
      throw cause;
    }
  }, [router]);

  const signOut = useCallback(async () => {
    await endSession();
    setSession(null);
    setStatus("anonymous");
    router.replace("/login");
  }, [router]);

  const value = useMemo<SessionContextValue>(
    () => ({ status, session, signIn, signOut, error }),
    [status, session, signIn, signOut, error],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside a SessionProvider");
  return context;
}
