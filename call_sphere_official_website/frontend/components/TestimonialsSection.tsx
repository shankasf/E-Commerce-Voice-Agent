import { SectionHeading } from "@/components/SectionHeading";
import { Testimonial } from "@/components/Testimonial";

const testimonials = [
  {
    quote: "95% of maintenance requests are now triaged automatically. Our team can finally focus on high-value tasks.",
    author: "Property Manager",
  },
  {
    quote: "We've seen a 40% reduction in no-shows since implementing CallSphere. It's been a game-changer for our clinic.",
    author: "Healthcare Clinic Manager",
  },
  {
    quote: "Our Tier 1 tickets are resolved 60% faster, and our engineers can focus on critical issues.",
    author: "IT Helpdesk Lead",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="section-stack">
      <SectionHeading
        eyebrow="Teams who trust"
        title="Designed with operators in mind"
        description="CallSphere voice and chat agents help commerce and service teams engage customers across every channel and close every deal."
        align="center"
      />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {testimonials.map((item) => (
          <Testimonial
            key={item.author}
            quote={item.quote}
            author={item.author}
          />
        ))}
      </div>
    </section>
  );
}
