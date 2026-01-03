import { SectionHeading } from "@/components/SectionHeading";

const integrationColumns = [
  {
    title: "Telephony & Payments",
    items: ["Twilio", "Stripe", "Square"],
  },
  {
    title: "Industry Systems",
    items: ["EMRs (Healthcare)", "Yardi/AppFolio (PM)", "ConnectWise (MSP)"],
  },
  {
    title: "CRM & Support",
    items: ["Salesforce", "Zendesk", "HubSpot", "Freshdesk"],
  },
];

export function IntegrationsSection() {
  return (
    <section id="integrations" className="section-stack">
      <SectionHeading
        eyebrow="Integrations"
        title="Plug into your stack"
        description="CallSphere connects to telephony systems, industry-specific software (EMRs, Property Management Software, PSAs, WMS/TMS), CRMs, and ticketing systems you already rely on. No rip-and-replace required."
        align="center"
      />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {integrationColumns.map((column) => (
          <div
            key={column.title}
            className="rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm"
          >
            <h3 className="text-lg font-semibold text-foreground">{column.title}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {column.items.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-gray-400"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
