export function Progress({
  value,
  label,
  indeterminate = false,
  tone = "berry",
}: {
  value: number;
  label: string;
  indeterminate?: boolean;
  tone?: "berry" | "mint" | "rose" | "amber";
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const colors = {
    berry: "bg-berry-500",
    mint: "bg-mint-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
  } as const;

  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-ink-800 ${
        indeterminate ? "indeterminate-bar" : ""
      }`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-valuetext={indeterminate ? "In progress" : `${clamped}%`}
    >
      {indeterminate ? null : (
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${colors[tone]}`}
          style={{ width: `${clamped}%` }}
        />
      )}
    </div>
  );
}
