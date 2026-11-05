"use client";

export function OutputPreview({
  src,
  alt,
  width,
  height,
}: {
  src: string | null;
  alt: string;
  width: number | null;
  height: number | null;
}) {
  if (!src) {
    return (
      <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-ink-700 bg-ink-900/40">
        <p className="text-xs text-ink-500">The resized image will appear here.</p>
      </div>
    );
  }

  return (
    <figure className="space-y-2">
      <div className="grid place-items-center rounded-xl bg-ink-950/60 p-3">
        {/* biome-ignore lint/performance/noImgElement: short-lived signed URL from object storage */}
        <img
          src={src}
          alt={alt}
          width={width ?? undefined}
          height={height ?? undefined}
          className="max-h-[28rem] w-auto rounded-lg object-contain"
        />
      </div>
      {width && height ? (
        <figcaption className="text-center text-xs text-ink-500">
          {width} × {height} px
        </figcaption>
      ) : null}
    </figure>
  );
}
