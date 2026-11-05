import {
  type Format,
  findPreset,
  formatsForPlatform,
  PLATFORMS,
  type Platform,
  PRESETS,
  type Preset,
} from "@social-resizer/contracts";

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

export interface FileValidation {
  ok: boolean;
  message?: string;
  /** A warning that does not block submission. */
  warning?: string;
}

/**
 * Client-side pre-check. This is UX only: the API and the worker enforce the
 * real limits, and the browser's MIME type is never trusted there.
 */
export function validateFile(file: File): FileValidation {
  const dot = file.name.lastIndexOf(".");
  const extension = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : "";

  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false, message: "Choose a JPG, PNG or WebP image." };
  }

  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, message: "That file is not a supported image type." };
  }

  if (file.size === 0) {
    return { ok: false, message: "That file is empty." };
  }

  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      message: `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_BYTES)}.`,
    };
  }

  const isTransparent = file.type === "image/png" || file.type === "image/webp";
  return {
    ok: true,
    ...(isTransparent ? { warning: "Transparent images keep their transparency (saved as PNG)." } : {}),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type { Format, Platform, Preset };
export { findPreset, formatsForPlatform, PLATFORMS, PRESETS };

export const PLATFORM_LABELS: Record<Platform, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
};

export function formatDimensions(preset: Preset): string {
  return `${preset.width} × ${preset.height}`;
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // Disambiguate per attempt so a retry of a *different* payload is not
    // mistaken for a replay of the first.
    return `${crypto.randomUUID()}`;
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
