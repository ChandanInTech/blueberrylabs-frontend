"use client";

import type { AuthSession } from "@social-resizer/contracts";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { endSession, loadSession, login } from "@/lib/auth";

type SessionStatus = "loading" | "authenticated" | "anonymous";

interface SessionContextValue {
  status: SessionStatus;
  session: AuthSession | null;
  /** Exchange an access code for a token. */
  signIn: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Session state for the whole app.
 *
 * The API holds the authority (it verifies the token on every request); this
 * provider mirrors "who does the server say I am" so the UI can avoid a flash
 * of content and route the user to the login screen when the token is gone.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
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

  const signIn = useCallback(
    async (code: string) => {
      setError(null);
      try {
        const created = await login(code);
        setSession(created);
        setStatus("authenticated");
        router.replace("/");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "That access code could not be used.");
        throw cause;
      }
    },
    [router],
  );

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
