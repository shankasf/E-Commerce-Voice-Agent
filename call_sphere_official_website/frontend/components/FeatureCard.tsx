import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type FeatureCardProps = {
  title: string;
  description: string;
  bullets?: string[];
  icon: LucideIcon;
  className?: string;
};

export function FeatureCard({
  title,
  description,
  bullets = [],
  icon: Icon,
  className,
}: FeatureCardProps) {
  return (
    <article
      className={cn(
        "group relative h-full overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md",
        className
      )}
    >
      <div className="relative z-10 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
          <Icon aria-hidden className="h-6 w-6" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          {bullets.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-gray-400"
                  />
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}
