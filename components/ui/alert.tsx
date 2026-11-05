type Tone = "error" | "warning" | "info" | "success";

const TONES: Record<Tone, string> = {
  error: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  info: "border-berry-500/40 bg-berry-500/10 text-berry-400",
  success: "border-mint-500/40 bg-mint-500/10 text-mint-500",
};

export function Alert({
  tone = "info",
  children,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${TONES[tone]} ${className}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
