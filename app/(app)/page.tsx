"use client";

import type { Format, Platform } from "@social-resizer/contracts";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PresetSelector } from "@/components/presets/preset-selector";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dropzone } from "@/components/upload/dropzone";
import { type UploadPhase, useUpload } from "@/hooks/use-upload";
import { ApiError, api } from "@/lib/api-client";
import { newIdempotencyKey } from "@/lib/validation";

const PHASE_COPY: Record<UploadPhase, string> = {
  SELECT_IMAGE: "Choose an image",
  REQUESTING_UPLOAD: "Preparing upload…",
  UPLOADING: "Uploading",
  VERIFYING_UPLOAD: "Verifying upload…",
  READY_TO_GENERATE: "Ready to generate",
  FAILED: "Upload failed",
};

export default function ResizePage() {
  const { state, upload, reset } = useUpload();
  const [platform, setPlatform] = useState<Platform>("INSTAGRAM");
  const [format, setFormat] = useState<Format>("PORTRAIT");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const busy =
    state.phase === "REQUESTING_UPLOAD" || state.phase === "UPLOADING" || state.phase === "VERIFYING_UPLOAD";
  const ready = state.phase === "READY_TO_GENERATE" && state.assetId !== null;

  const submit = useCallback(async () => {
    if (!state.assetId) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const created = await api.createGeneration(
        { assetId: state.assetId, platform, format },
        newIdempotencyKey(),
      );
      router.push(`/generations/${created.generationId}`);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : "We could not start the resize. Please try again.",
      );
      setSubmitting(false);
    }
  }, [state.assetId, platform, format, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resize an image</h1>
        <p className="mt-1 text-sm text-ink-300">
          Upload once, then crop to the exact dimensions each platform expects.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle hint={PHASE_COPY[state.phase]}>1 · Source image</CardTitle>

          <Dropzone
            onFile={(file) => void upload(file)}
            disabled={busy || submitting}
            file={state.file}
            previewUrl={state.previewUrl}
          />

          {busy ? (
            <div className="mt-4 space-y-2">
              <Progress
                value={state.uploadPercent}
                label="Upload progress"
                indeterminate={state.phase === "REQUESTING_UPLOAD" || state.phase === "VERIFYING_UPLOAD"}
              />
              <div className="flex items-center justify-between text-xs text-ink-300">
                <span aria-live="polite">{PHASE_COPY[state.phase]}</span>
                {state.phase === "UPLOADING" ? (
                  <span className="tabular-nums">{state.uploadPercent}%</span>
                ) : null}
              </div>
              <p className="text-[11px] text-ink-500">
                Upload progress is measured by your browser. Processing starts on the server afterwards.
              </p>
            </div>
          ) : null}

          {state.warning && !state.error ? (
            <Alert tone="info" className="mt-4">
              {state.warning}
            </Alert>
          ) : null}

          {state.error ? (
            <Alert tone="error" className="mt-4">
              <p className="font-medium">Upload failed</p>
              <p className="mt-1">{state.error}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={reset}>
                Try another file
              </Button>
            </Alert>
          ) : null}
        </Card>

        <Card>
          <CardTitle hint="2 · Target">Platform &amp; format</CardTitle>

          <PresetSelector
            platform={platform}
            format={format}
            onPlatformChange={setPlatform}
            onFormatChange={setFormat}
            disabled={submitting}
          />

          <div className="mt-6 space-y-3">
            {submitError ? <Alert tone="error">{submitError}</Alert> : null}

            <Button size="lg" fullWidth loading={submitting} disabled={!ready} onClick={() => void submit()}>
              {submitting ? "Queueing…" : "Generate image"}
            </Button>

            {!ready && !busy ? (
              <p className="text-center text-xs text-ink-500">Upload an image to enable generating.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
