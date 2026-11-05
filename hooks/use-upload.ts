"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api-client";
import { UploadError, uploadFile } from "@/lib/upload";
import { validateFile } from "@/lib/validation";

/**
 * Upload phases (architecture section 11.3).
 *
 * `UPLOADING` progress comes from browser XHR events; everything after that is
 * server-reported. They are deliberately distinct states so the UI never
 * implies one continuous measurement.
 */
export type UploadPhase =
  | "SELECT_IMAGE"
  | "REQUESTING_UPLOAD"
  | "UPLOADING"
  | "VERIFYING_UPLOAD"
  | "READY_TO_GENERATE"
  | "FAILED";

export interface UploadState {
  phase: UploadPhase;
  file: File | null;
  previewUrl: string | null;
  assetId: string | null;
  uploadPercent: number;
  error: string | null;
  warning: string | null;
}

const INITIAL: UploadState = {
  phase: "SELECT_IMAGE",
  file: null,
  previewUrl: null,
  assetId: null,
  uploadPercent: 0,
  error: null,
  warning: null,
};

export function useUpload() {
  const [state, setState] = useState<UploadState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);

  const revokePreview = useCallback(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    revokePreview();
    setState(INITIAL);
  }, [revokePreview]);

  const upload = useCallback(
    async (file: File) => {
      abortRef.current?.abort();
      revokePreview();

      const clientValidation = validateFile(file);
      if (!clientValidation.ok) {
        setState({
          ...INITIAL,
          file,
          phase: "FAILED",
          error: clientValidation.message ?? "That file cannot be used.",
        });
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      previewRef.current = previewUrl;

      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        phase: "REQUESTING_UPLOAD",
        file,
        previewUrl,
        assetId: null,
        uploadPercent: 0,
        error: null,
        warning: clientValidation.warning ?? null,
      });

      try {
        const created = await api.createUpload(
          { filename: file.name, contentType: file.type, sizeBytes: file.size },
          controller.signal,
        );

        setState((previous) => ({ ...previous, phase: "UPLOADING" }));

        await uploadFile({
          url: created.uploadUrl,
          file,
          headers: created.headers,
          signal: controller.signal,
          onProgress: ({ percent }) =>
            setState((previous) =>
              previous.phase === "UPLOADING" ? { ...previous, uploadPercent: percent } : previous,
            ),
        });

        setState((previous) => ({ ...previous, phase: "VERIFYING_UPLOAD", uploadPercent: 100 }));

        const completed = await api.completeUpload(created.assetId, controller.signal);

        setState((previous) => ({
          ...previous,
          phase: "READY_TO_GENERATE",
          assetId: completed.assetId,
          uploadPercent: 100,
        }));
      } catch (error) {
        if ((error as Error).name === "AbortError" || (error instanceof UploadError && error.cancelled)) {
          setState(INITIAL);
          return;
        }

        const message =
          error instanceof ApiError || error instanceof UploadError
            ? error.message
            : "The upload failed. Please try again.";

        setState((previous) => ({ ...previous, phase: "FAILED", error: message }));
      }
    },
    [revokePreview],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    revokePreview();
    setState(INITIAL);
  }, [revokePreview]);

  return { state, upload, reset, cancel };
}
