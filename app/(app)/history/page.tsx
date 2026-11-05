"use client";

import type { GenerationListItem } from "@social-resizer/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError, api } from "@/lib/api-client";
import { PLATFORM_LABELS } from "@/lib/validation";

export default function HistoryPage() {
  const [items, setItems] = useState<GenerationListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextCursor: string | null, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const page = await api.listGenerations({ limit: 20, cursor: nextCursor }, signal);
      setItems((previous) => (nextCursor ? [...previous, ...page.items] : page.items));
      setCursor(page.nextCursor);
    } catch (cause) {
      if ((cause as Error).name === "AbortError") return;
      setError(cause instanceof ApiError ? cause.message : "We could not load your history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(null, controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-ink-300">Every generation from this demo session.</p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {loading && items.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="skeleton h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {!loading && items.length === 0 && !error ? (
        <Card>
          <CardTitle>Nothing here yet</CardTitle>
          <p className="text-sm text-ink-300">Resize your first image to see it listed here.</p>
          <Link href="/" className="mt-4 inline-block">
            <Button>Resize an image</Button>
          </Link>
        </Card>
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/generations/${item.id}`}
                className="surface flex items-center gap-4 p-3 transition-colors hover:border-ink-500"
              >
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-800">
                  {item.thumbnailUrl ? (
                    // biome-ignore lint/performance/noImgElement: short-lived signed URL, not an optimisable static asset
                    <img src={item.thumbnailUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-ink-500">—</span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-white">
                    {PLATFORM_LABELS[item.platform]} · {item.format.toLowerCase()}
                  </span>
                  <span className="block text-xs text-ink-300">{formatDate(item.createdAt)}</span>
                </span>

                <StatusBadge status={item.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {cursor ? (
        <div className="flex justify-center">
          <Button variant="secondary" loading={loading} onClick={() => void load(cursor)}>
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
