type TestimonialProps = {
  quote: string;
  author: string;
  role?: string;
};

export function Testimonial({ quote, author, role }: TestimonialProps) {
  return (
    <figure className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <span
        className="absolute -top-6 right-6 text-8xl text-gray-100"
        aria-hidden
      >
        &quot;
      </span>
      <blockquote className="relative text-base text-muted-foreground">{quote}</blockquote>
      <figcaption className="mt-6 text-sm text-muted-foreground">
        <span className="block font-semibold text-foreground">{author}</span>
        {role && <span>{role}</span>}
      </figcaption>
    </figure>
  );
}
