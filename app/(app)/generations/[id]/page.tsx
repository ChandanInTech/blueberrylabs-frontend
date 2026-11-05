"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { OutputPreview } from "@/components/generation/output-preview";
import { StatusPanel } from "@/components/generation/status-panel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useGenerationPolling } from "@/hooks/use-generation-polling";
import { ApiError, api } from "@/lib/api-client";

export default function GenerationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { generation, error, fatal, isPolling, refresh } = useGenerationPolling(id);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isComplete = generation?.status === "COMPLETED";

  // Fetch a fresh signed preview URL once processing finishes. Signed URLs are
  // short-lived, so nothing is cached beyond the browser tab's lifetime.
  useEffect(() => {
    if (!isComplete) {
      setPreviewUrl(null);
      return;
    }

    const controller = new AbortController();
    api
      .getGenerationDownloadUrl(id, controller.signal)
      .then((signed) => setPreviewUrl(signed.url))
      .catch((cause: unknown) => {
        if ((cause as Error).name === "AbortError") return;
        setPreviewError(cause instanceof ApiError ? cause.message : "We could not load a preview right now.");
      });

    return () => controller.abort();
  }, [id, isComplete]);

  const download = useCallback(async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const signed = await api.getGenerationDownloadUrl(id);
      const anchor = document.createElement("a");
      anchor.href = signed.url;
      anchor.download = signed.filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (cause) {
      setDownloadError(cause instanceof ApiError ? cause.message : "The download could not be prepared.");
    } finally {
      setDownloading(false);
    }
  }, [id]);

  if (fatal) {
    return (
      <div className="space-y-4">
        <Alert tone="error">
          <p className="font-medium">We could not open that generation</p>
          <p className="mt-1">{error ?? "It may belong to another session or have been removed."}</p>
        </Alert>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={refresh}>
            Try again
          </Button>
          <Link href="/">
            <Button>Start a new resize</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!generation) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64 rounded-lg" />
        <div className="skeleton h-56 w-full rounded-xl" />
        <p className="text-xs text-ink-500" role="status">
          Loading generation…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/history" className="text-xs text-ink-300 hover:text-white">
            ← Back to history
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Generation</h1>
          <p className="font-mono text-[11px] text-ink-500">{generation.id}</p>
        </div>
        <Link href="/">
          <Button variant="secondary" size="sm">
            New resize
          </Button>
        </Link>
      </div>

      {error && !fatal ? <Alert tone="warning">{error}</Alert> : null}
      {previewError ? <Alert tone="warning">{previewError}</Alert> : null}
      {downloadError ? <Alert tone="error">{downloadError}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle hint={isPolling ? "Live" : "Final"}>Status</CardTitle>
          <StatusPanel generation={generation} onDownload={() => void download()} downloading={downloading} />

          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-ink-800 pt-4 text-xs">
            <div>
              <dt className="text-ink-500">Created</dt>
              <dd className="text-ink-100">{formatDate(generation.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Started</dt>
              <dd className="text-ink-100">{formatDate(generation.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Finished</dt>
              <dd className="text-ink-100">{formatDate(generation.completedAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Preset</dt>
              <dd className="text-ink-100">
                {generation.platform} / {generation.format}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardTitle hint={generation.output ? "Signed URL" : undefined}>Result</CardTitle>
          <OutputPreview
            src={previewUrl}
            alt={`Resized image for ${generation.platform} ${generation.format}`}
            width={generation.output?.width ?? null}
            height={generation.output?.height ?? null}
          />
          {isComplete && !previewUrl && !previewError ? (
            <p className="mt-3 text-center text-xs text-ink-500" role="status">
              Preparing preview…
            </p>
          ) : null}
        </Card>
      </div>

      {generation.status === "FAILED" ? (
        <Card>
          <CardTitle>What now?</CardTitle>
          <p className="text-sm text-ink-300">
            Failed generations are terminal. Start a new resize with the same image — nothing is lost.
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button>Start a new resize</Button>
          </Link>
        </Card>
      ) : null}
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
