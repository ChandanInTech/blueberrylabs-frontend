"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/session/session-provider";
import { AppShell } from "@/components/ui/app-shell";

/**
 * Route guard for the authenticated area.
 *
 * The API is the real authority: every request re-validates the session. This
 * gate only prevents rendering a half-broken screen while the cookie is checked.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4">
        <p className="text-sm text-ink-300" role="status">
          Restoring your session…
        </p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
