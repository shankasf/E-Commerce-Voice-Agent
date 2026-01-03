type StatProps = {
  label: string;
  value: string;
  description?: string;
};

export function Stat({ label, value, description }: StatProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
      <span className="text-4xl font-bold text-foreground">{value}</span>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      {description && (
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
