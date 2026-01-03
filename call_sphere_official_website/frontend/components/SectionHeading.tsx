import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  const alignment =
    align === "center" ? "items-center text-center" : "items-start text-left";
  const width = align === "center" ? "mx-auto max-w-3xl" : "max-w-2xl";

  return (
    <div className={cn("flex flex-col gap-4", alignment, width, className)}>
      {eyebrow && (
        <span className="text-sm font-medium text-indigo-600">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {description && (
        <p className="text-lg leading-relaxed text-slate-600">
          {description}
        </p>
      )}
    </div>
  );
}
