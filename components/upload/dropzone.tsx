"use client";

import { useCallback, useId, useRef, useState } from "react";
import { formatBytes, validateFile } from "@/lib/validation";

export function Dropzone({
  onFile,
  disabled = false,
  file,
  previewUrl,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  file: File | null;
  previewUrl: string | null;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const next = files?.[0];
      if (!next) return;
      const validation = validateFile(next);
      if (!validation.ok) {
        setLocalError(validation.message ?? "That file cannot be used.");
        return;
      }
      setLocalError(null);
      onFile(next);
    },
    [onFile],
  );

  return (
    <div>
      {/* biome-ignore lint/a11y/useSemanticElements: a drop target needs drag events, which <button> cannot express */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={file ? "Replace the selected image" : "Choose an image to upload"}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
        className={[
          "relative grid min-h-[15rem] cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
          dragging ? "border-berry-400 bg-berry-500/10" : "border-ink-700 hover:border-ink-500",
          disabled ? "cursor-not-allowed opacity-60" : "",
        ].join(" ")}
      >
        {previewUrl ? (
          <div className="flex w-full flex-col items-center gap-3">
            {/* biome-ignore lint/performance/noImgElement: object URL preview, not a remote asset */}
            <img
              src={previewUrl}
              alt={file ? `Preview of ${file.name}` : "Selected image preview"}
              className="max-h-56 w-auto rounded-lg object-contain shadow-lg"
            />
            <div className="text-xs text-ink-300">
              <span className="font-medium text-ink-100">{file?.name}</span>
              {file ? <span className="ml-2">{formatBytes(file.size)}</span> : null}
            </div>
            <span className="text-xs text-berry-400">Click or drop to replace</span>
          </div>
        ) : (
          <div className="space-y-2">
            <UploadGlyph />
            <p className="text-sm font-medium">Drop an image here, or click to browse</p>
            <p className="text-xs text-ink-500">JPG, PNG or WebP · up to 25 MB</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          handleFiles(event.target.files);
          // Allow re-selecting the same file after a failure.
          event.target.value = "";
        }}
      />

      {localError ? (
        <p className="mt-2 text-xs text-rose-200" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );
}

function UploadGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="mx-auto size-9 text-ink-300"
    >
      <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
    </svg>
  );
}
