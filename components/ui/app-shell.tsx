"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/session/session-provider";
import { Button } from "./button";

const NAV = [
  { href: "/", label: "Resize" },
  { href: "/history", label: "History" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <Logo />
          <span className="text-base font-semibold tracking-tight">Blueberry</span>
          <span className="rounded-full border border-ink-700 px-2 py-0.5 text-[10px] font-medium text-ink-300 uppercase">
            Demo
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-ink-800 text-white" : "text-ink-300 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {status === "authenticated" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void signOut().then(() => router.replace("/login"));
              }}
            >
              Sign out
            </Button>
          ) : null}
        </nav>
      </header>

      <main id="main" className="flex-1 pb-16">
        {children}
      </main>

      <footer className="border-t border-ink-800 py-5 text-xs text-ink-500">
        Demo authentication only — no real accounts. Resizing runs on the server with PostgreSQL-backed
        queuing.
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-berry-500 to-berry-600 text-sm font-bold text-white shadow-lg shadow-berry-600/30"
    >
      B
    </span>
  );
}
