import { Check } from "lucide-react";

import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

type PricingCardProps = {
  name: string;
  price: string;
  description: string;
  benefits: string[];
  highlighted?: boolean;
  onSelect?: () => void;
  billingLabel?: string;
};

export function PricingCard({
  name,
  price,
  description,
  benefits,
  highlighted = false,
  onSelect,
  billingLabel = "/mo",
}: PricingCardProps) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border bg-white p-8 shadow-sm transition",
        highlighted
          ? "relative isolate border-gray-900 shadow-lg"
          : "border-gray-200 hover:border-gray-300 hover:shadow-md"
      )}
    >
      {highlighted && (
        <span className="absolute right-6 top-6 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
          Popular
        </span>
      )}
      <h3 className="text-xl font-semibold text-slate-900">{name}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <div className="mt-6">
        <span className="text-4xl font-bold text-slate-900">{price}</span>
        <span className="ml-1 text-sm text-slate-500">
          {billingLabel}
        </span>
      </div>
      <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-600">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <Check aria-hidden className="h-3.5 w-3.5 text-slate-700" />
            </span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 pt-4">
        <Button
          size="lg"
          variant={highlighted ? "default" : "outline"}
          className="w-full"
          onClick={onSelect}
        >
          Choose Plan
        </Button>
      </div>
    </article>
  );
}
