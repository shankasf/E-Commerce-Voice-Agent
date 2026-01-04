"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type FAQItem = {
  question: string;
  answer: string;
};

type FAQProps = {
  items: FAQItem[];
};

export function FAQ({ items }: FAQProps) {
  return (
    <AccordionPrimitive.Root
      type="multiple"
      className="space-y-4"
      defaultValue={[items[0]?.question ?? ""]}
    >
      {items.map((item) => (
        <AccordionItem key={item.question} value={item.question}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </AccordionPrimitive.Root>
  );
}

const AccordionItem = AccordionPrimitive.Item;

function AccordionTrigger({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="w-full">
      <AccordionPrimitive.Trigger
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4 text-left text-base font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 data-[state=open]:border-slate-300",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown
          aria-hidden
          className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 data-[state=open]:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className={cn(
        "overflow-hidden text-sm text-slate-700 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up",
        "px-6 pb-5 pt-2"
      )}
      {...props}
    >
      <div className={cn("rounded-xl bg-slate-50 p-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
