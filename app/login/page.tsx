"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session/session-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { status, signIn, error } = useSession();
  const [pending, setPending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="surface p-8">
        <div className="mb-6 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-berry-500 to-berry-600 text-lg font-bold text-white"
          >
            B
          </span>
          <div>
            <h1 className="text-lg font-semibold">Blueberry Resizer</h1>
            <p className="text-xs text-ink-300">Exact-size images for social platforms</p>
          </div>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-ink-300">
          Upload an image, pick a platform preset, and get a pixel-perfect crop. No account needed — this demo
          issues a temporary server-side session.
        </p>

        {error ? (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <Button
          size="lg"
          fullWidth
          loading={pending || status === "loading"}
          onClick={() => {
            setPending(true);
            void signIn()
              .catch(() => {})
              .finally(() => setPending(false));
          }}
        >
          {pending ? "Starting demo session…" : "Continue with demo account"}
        </Button>

        <p className="mt-5 text-center text-xs text-ink-500">
          Demo mode: sessions are not production-grade identity.
        </p>
      </div>
    </div>
  );
}
