import type { GenerationStatus } from "@social-resizer/contracts";

const STYLES: Record<GenerationStatus, { label: string; className: string }> = {
  QUEUED: { label: "Queued", className: "bg-ink-700 text-ink-100" },
  PROCESSING: { label: "Processing", className: "bg-berry-500/20 text-berry-400" },
  COMPLETED: { label: "Completed", className: "bg-mint-500/20 text-mint-500" },
  FAILED: { label: "Failed", className: "bg-rose-500/20 text-rose-200" },
};

export function StatusBadge({ status }: { status: GenerationStatus }) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  );
}
