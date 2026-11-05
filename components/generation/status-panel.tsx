"use client";

import type { GenerationStatusResponse } from "@social-resizer/contracts";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { findPreset, PLATFORM_LABELS } from "@/lib/validation";

const STEP_LABELS: Record<string, string> = {
  QUEUED: "Waiting in the queue",
  VALIDATING_INPUT: "Checking your image",
  DOWNLOADING_INPUT: "Downloading your image",
  RESIZING_IMAGE: "Resizing your image",
  UPLOADING_OUTPUT: "Uploading the result",
  FINALIZING: "Finishing up",
  COMPLETED: "Done",
};

export function StatusPanel({
  generation,
  onDownload,
  downloading,
}: {
  generation: GenerationStatusResponse;
  onDownload: () => void;
  downloading: boolean;
}) {
  const preset = findPreset(generation.platform, generation.format);
  const active = generation.status === "QUEUED" || generation.status === "PROCESSING";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">
            {PLATFORM_LABELS[generation.platform]} ·{" "}
            {preset ? preset.label.split(" ").slice(1).join(" ") : generation.format}
          </p>
          {preset ? (
            <p className="text-xs text-ink-300">
              {preset.width} × {preset.height} · {preset.aspectRatio}
            </p>
          ) : null}
        </div>
        <StatusBadge status={generation.status} />
      </div>

      {active ? (
        <div className="space-y-2">
          <Progress
            value={generation.progress}
            label="Processing progress"
            indeterminate={generation.progress === 0}
          />
          <div className="flex items-center justify-between text-xs text-ink-300">
            <span aria-live="polite">
              {STEP_LABELS[generation.currentStep] ?? generation.message ?? "Working"}
            </span>
            <span className="tabular-nums">{generation.progress}%</span>
          </div>
        </div>
      ) : null}

      {generation.status === "COMPLETED" ? (
        <div className="space-y-3">
          <Alert tone="success">{generation.message ?? "Your image is ready."}</Alert>
          {generation.output ? (
            <p className="text-xs text-ink-300">
              {generation.output.width} × {generation.output.height} px ·{" "}
              {generation.output.mimeType.replace("image/", "").toUpperCase()} ·{" "}
              {(generation.output.sizeBytes / 1024).toFixed(0)} KB
            </p>
          ) : null}
        </div>
      ) : null}

      {generation.status === "FAILED" ? (
        <Alert tone="error">
          <p className="font-medium">Processing failed</p>
          <p className="mt-1 text-rose-100/90">
            {generation.error?.message ?? generation.message ?? "Something went wrong."}
          </p>
        </Alert>
      ) : null}

      {generation.status === "COMPLETED" ? (
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-mint-500 px-4 text-sm font-medium text-ink-950 transition hover:brightness-110 disabled:opacity-60"
        >
          {downloading ? "Preparing download…" : "Download image"}
        </button>
      ) : null}
    </div>
  );
}
