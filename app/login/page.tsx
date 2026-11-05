"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/session/session-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Codes are 10 alphanumerics; separators are ignored by the server too. */
const MIN_CODE_LENGTH = 4;

export default function LoginPage() {
  const { status, signIn, error } = useSession();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  // Focus the code field on mount. `autoFocus` is disallowed by the linter
  // because it steals focus on navigation; here the field is the whole page.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const normalised = code.replace(/[^A-Za-z0-9]/g, "");
  const canSubmit = normalised.length >= MIN_CODE_LENGTH && !pending;

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
          Enter your access code. It is your permanent login — the same code works every time. Each sign-in
          lasts 24 hours, after which you enter the same code again.
        </p>

        {error ? (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            setPending(true);
            void signIn(normalised)
              .catch(() => {})
              .finally(() => setPending(false));
          }}
        >
          <label htmlFor="access-code" className="text-xs font-medium uppercase tracking-wide text-ink-300">
            Access code
          </label>
          <input
            id="access-code"
            name="code"
            ref={inputRef}
            type="text"
            value={code}
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABCD-EFGH"
            aria-describedby="access-code-hint"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            className="mt-2 h-12 w-full rounded-xl border border-ink-700 bg-ink-900 px-4 font-mono text-lg tracking-[0.3em] text-ink-50 outline-none transition focus:border-berry-500 focus:ring-2 focus:ring-berry-500/30"
          />
          <p id="access-code-hint" className="mt-2 text-xs text-ink-500">
            Dashes and spaces are ignored.
          </p>

          <Button type="submit" size="lg" fullWidth className="mt-4" loading={pending} disabled={!canSubmit}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-ink-500">
          Demo mode: access codes are issued by the operator, not self-service.{" "}
        </p>
      </div>
    </div>
  );
}
