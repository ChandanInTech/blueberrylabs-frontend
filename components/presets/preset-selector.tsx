"use client";

import {
  type Format,
  findPreset,
  formatsForPlatform,
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
} from "@/lib/validation";

export function PresetSelector({
  platform,
  format,
  onPlatformChange,
  onFormatChange,
  disabled = false,
}: {
  platform: Platform;
  format: Format;
  onPlatformChange: (platform: Platform) => void;
  onFormatChange: (format: Format) => void;
  disabled?: boolean;
}) {
  const formats = formatsForPlatform(platform);
  const active = findPreset(platform, format);

  return (
    <div className="space-y-5">
      <fieldset disabled={disabled}>
        <legend className="mb-2 text-xs font-medium tracking-wide text-ink-300 uppercase">Platform</legend>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((option) => {
            const selected = option === platform;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  onPlatformChange(option);
                  const first = formatsForPlatform(option)[0];
                  if (first) onFormatChange(first.format);
                }}
                className={[
                  "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                  selected
                    ? "border-berry-500 bg-berry-500/15 text-white"
                    : "border-ink-700 bg-ink-900/60 text-ink-300 hover:border-ink-500 hover:text-white",
                ].join(" ")}
              >
                {PLATFORM_LABELS[option]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset disabled={disabled}>
        <legend className="mb-2 text-xs font-medium tracking-wide text-ink-300 uppercase">Format</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {formats.map((preset) => {
            const selected = preset.format === format;
            return (
              <button
                key={preset.format}
                type="button"
                aria-pressed={selected}
                onClick={() => onFormatChange(preset.format)}
                className={[
                  "flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "border-berry-500 bg-berry-500/15"
                    : "border-ink-700 bg-ink-900/60 hover:border-ink-500",
                ].join(" ")}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">
                    {preset.label.replace(`${PLATFORM_LABELS[preset.platform]} `, "")}
                  </span>
                  <span className="block text-xs text-ink-300">
                    {preset.width} × {preset.height}
                  </span>
                </span>
                <span className="ml-3 rounded-md bg-ink-800 px-1.5 py-0.5 text-[10px] text-ink-300">
                  {preset.aspectRatio}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {active ? (
        <p className="text-xs text-ink-500" aria-live="polite">
          Output:{" "}
          <span className="text-ink-100">
            {active.width} × {active.height}
          </span>{" "}
          px · {active.aspectRatio} · centre crop with no stretching
        </p>
      ) : null}
    </div>
  );
}
