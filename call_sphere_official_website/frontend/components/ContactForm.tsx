"use client";

import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  company: z.string().min(2, "Company is required"),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .min(7, "Enter a valid phone")
    .regex(/^[\d+()\-\s]+$/, "Enter a valid phone number"),
  monthlyCalls: z.string().nonempty("Select a volume"),
  message: z.string().min(10, "Add a bit more detail"),
  honeypot: z.string().max(0),
});

type ContactFormState =
  | { status: "idle"; error?: string }
  | { status: "submitting" }
  | { status: "success" };

const monthlyCallOptions = [
  "0 - 1,000 calls",
  "1,001 - 5,000 calls",
  "5,001 - 15,000 calls",
  "15,000+ calls",
];

export function ContactForm() {
  const [formState, setFormState] = useState<ContactFormState>({
    status: "idle",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    const payload = {
      name: formData.get("name")?.toString() ?? "",
      company: formData.get("company")?.toString() ?? "",
      email: formData.get("email")?.toString() ?? "",
      phone: formData.get("phone")?.toString() ?? "",
      monthlyCalls: formData.get("monthlyCalls")?.toString() ?? "",
      message: formData.get("message")?.toString() ?? "",
      honeypot: formData.get("website")?.toString() ?? "",
    };

    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const formattedErrors = Object.entries(fieldErrors).reduce<
        Record<string, string>
      >((acc, [key, value]) => {
        if (value?.[0]) acc[key] = value[0];
        return acc;
      }, {});
      setErrors(formattedErrors);
      setFormState({ status: "idle" });
      return;
    }

    setErrors({});
    setFormState({ status: "submitting" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || data?.success === false) {
        const message = data?.error ?? "We couldn't send your request. Please try again.";
        throw new Error(message);
      }

      setFormState({ status: "success" });
      formElement?.reset();
    } catch (error) {
      console.error("Contact form submission failed", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "We hit a snag sending your message. Please try again or email sagar@callsphere.tech.";
      setFormState({
        status: "idle",
        error: message,
      });
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm lg:p-12">
      <div className="grid gap-10 lg:grid-cols-[1.05fr,0.95fr] lg:gap-14">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              name="name"
              placeholder="Your full name"
              error={errors.name}
              required
            />
            <Field
              label="Company"
              name="company"
              placeholder="Where do you work?"
              error={errors.company}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="you@company.com"
              error={errors.email}
              required
            />
            <Field
              label="Phone"
              name="phone"
              type="tel"
              placeholder="(845) 388-4261"
              error={errors.phone}
              required
            />
          </div>
          <div>
            <label
              htmlFor="monthlyCalls"
              className="text-sm font-medium text-gray-900"
            >
              Monthly Calls
            </label>
            <select
              id="monthlyCalls"
              name="monthlyCalls"
              defaultValue=""
              className={cn(
                "mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
              )}
              aria-invalid={Boolean(errors.monthlyCalls)}
              required
            >
              <option value="" disabled>
                Select volume
              </option>
              {monthlyCallOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.monthlyCalls && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {errors.monthlyCalls}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="message" className="text-sm font-medium text-gray-900">
              How can we help?
            </label>
            <textarea
              id="message"
              name="message"
              placeholder="Share your use case. What are you hoping to automate?"
              className="mt-2 h-36 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
              aria-invalid={Boolean(errors.message)}
              required
            />
            {errors.message && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {errors.message}
              </p>
            )}
          </div>
          <div className="hidden">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="submit"
              size="lg"
              className="min-w-[180px]"
              disabled={formState.status === "submitting"}
            >
              {formState.status === "submitting"
                ? "Sending..."
                : "Request Demo"}
            </Button>
            <p className="text-xs text-muted-foreground">
              By submitting, you agree to our privacy policy. We&apos;ll respond
              within one business day.
            </p>
          </div>
          <div aria-live="polite" role="status" className="text-sm">
            {formState.status === "success" && (
              <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-emerald-700">
                Thanks! We received your request. Expect a reply from
                sagar@callsphere.tech within one business day.
              </p>
            )}
            {formState.status === "idle" && formState.error && (
              <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-700">
                {formState.error}
              </p>
            )}
          </div>
        </form>
        <aside className="space-y-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Prefer to talk now?
          </h3>
          <p className="text-sm text-muted-foreground">
            CallSphere voice agents operate 24/7. Our team is available 9am -
            7pm ET to help you craft the right workflow.
          </p>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <span className="block text-xs uppercase tracking-wide text-gray-500">
                Address
              </span>
              27 Orchard Pl, New York, NY
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wide text-gray-500">
                Email
              </span>
              <a
                href="mailto:sagar@callsphere.tech"
                className="hover:text-gray-900"
              >
                sagar@callsphere.tech
              </a>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wide text-gray-500">
                Phone
              </span>
              <a href="tel:18453884261" className="hover:text-gray-900">
                (845) 388-4261
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
};

function Field({
  label,
  name,
  error,
  required,
  type = "text",
  placeholder,
}: FieldProps) {
  return (
    <div className="flex flex-col">
      <label htmlFor={name} className="text-sm font-medium text-gray-900">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className={cn(
          "mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-300",
          error && "border-red-300 focus:border-red-400 focus:ring-red-200"
        )}
        aria-invalid={Boolean(error)}
        autoComplete="off"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
