export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "li";
}) {
  return <Tag className={`surface p-5 sm:p-6 ${className}`}>{children}</Tag>;
}

export function CardTitle({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-ink-100 uppercase">{children}</h2>
      {hint ? <span className="text-xs text-ink-500">{hint}</span> : null}
    </div>
  );
}
