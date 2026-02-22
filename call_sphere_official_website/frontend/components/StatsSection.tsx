import { SectionHeading } from "@/components/SectionHeading";
import { Stat } from "@/components/Stat";

const stats = [
  {
    label: "service calls resolved automatically",
    value: "95%",
    description: "Average for HVAC service clients.",
  },
  {
    label: "reduction in no-shows",
    value: "40%",
    description: "For healthcare and dental clinics.",
  },
  {
    label: "faster Tier-1 ticket resolution",
    value: "60%",
    description: "For IT MSPs and internal helpdesks.",
  },
];

export function StatsSection() {
  return (
    <section id="metrics" className="section-stack">
      <SectionHeading
        eyebrow="Proof in numbers"
        title="Voice & Chat automation that delivers"
        description="Every deployment tunes itself to your workflows across voice and chat, reporting on the KPIs that matter most."
        align="center"
      />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {stats.map((stat) => (
          <Stat
            key={stat.label}
            label={stat.label}
            value={stat.value}
            description={stat.description}
          />
        ))}
      </div>
    </section>
  );
}
