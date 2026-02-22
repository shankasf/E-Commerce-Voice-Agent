type JsonLdProps = {
  data: Record<string, unknown>;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "CallSphere",
        legalName: "CallSphere LLC",
        url: "https://callsphere.tech",
        logo: "https://callsphere.tech/callsphere-logo.webp",
        image: "https://callsphere.tech/opengraph-image.png",
        description:
          "AI-powered voice and chat agents for enterprise customer communications. Automate ordering, support, scheduling, and payments.",
        address: {
          "@type": "PostalAddress",
          streetAddress: "27 Orchard Pl",
          addressLocality: "New York",
          addressRegion: "NY",
          addressCountry: "US",
        },
        telephone: "+1-845-388-4261",
        email: "sagar@callsphere.tech",
        sameAs: [
          "https://x.com/callsphere",
          "https://www.facebook.com/callspherellc",
          "https://www.instagram.com/callsphereny/",
          "https://www.linkedin.com/company/call-sphere",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+1-845-388-4261",
          contactType: "sales",
          email: "sagar@callsphere.tech",
          availableLanguage: "English",
        },
      }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "CallSphere",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "AI-powered voice and chat agents that automate customer communications for enterprises. Handle ordering, support, scheduling, and payments 24/7.",
        url: "https://callsphere.tech",
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "149",
          highPrice: "1499",
          priceCurrency: "USD",
          offerCount: 3,
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          reviewCount: "47",
          bestRating: "5",
          worstRating: "1",
        },
        featureList: [
          "AI Voice Agents",
          "AI Chat Agents",
          "Order Processing",
          "Appointment Scheduling",
          "Payment Processing",
          "CRM Integration",
          "57+ Languages",
          "24/7 Availability",
        ],
      }}
    />
  );
}

export function FAQPageJsonLd({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

export function ProductJsonLd({
  name,
  description,
  price,
  priceCurrency = "USD",
}: {
  name: string;
  description: string;
  price: string;
  priceCurrency?: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        description,
        brand: {
          "@type": "Brand",
          name: "CallSphere",
        },
        offers: {
          "@type": "Offer",
          price,
          priceCurrency,
          priceValidUntil: "2026-12-31",
          availability: "https://schema.org/InStock",
          url: "https://callsphere.tech/pricing",
        },
      }}
    />
  );
}

export function LocalBusinessJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": "https://callsphere.tech/#localbusiness",
        name: "CallSphere LLC",
        image: "https://callsphere.tech/callsphere-logo.webp",
        url: "https://callsphere.tech",
        telephone: "+1-845-388-4261",
        email: "sagar@callsphere.tech",
        address: {
          "@type": "PostalAddress",
          streetAddress: "27 Orchard Pl",
          addressLocality: "New York",
          addressRegion: "NY",
          postalCode: "10002",
          addressCountry: "US",
        },
        priceRange: "$149 - $1,499/mo",
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ],
          opens: "09:00",
          closes: "18:00",
        },
        description:
          "AI-powered voice and chat agents for enterprise customer communications. Automate customer calls, appointments, payments, and support 24/7.",
      }}
    />
  );
}

export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": "https://callsphere.tech/#website",
        name: "CallSphere",
        url: "https://callsphere.tech",
        publisher: {
          "@id": "https://callsphere.tech/#localbusiness",
        },
      }}
    />
  );
}

export function HowToJsonLd({
  steps,
}: {
  steps: { name: string; text: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "How to Deploy AI Voice & Chat Agents with CallSphere",
        description:
          "Set up AI voice and chat agents for your business in 3 simple steps. Go live in 3-5 days with CallSphere.",
        totalTime: "P5D",
        step: steps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.name,
          text: step.text,
        })),
      }}
    />
  );
}

export function ServiceJsonLd({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name,
        description,
        url,
        provider: {
          "@type": "Organization",
          name: "CallSphere LLC",
          url: "https://callsphere.tech",
        },
        areaServed: "Worldwide",
        serviceType: "AI Voice and Chat Agent Platform",
      }}
    />
  );
}

export function ArticleJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
  image,
  authorName,
}: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  authorName?: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        url,
        datePublished,
        dateModified: dateModified || datePublished,
        image: image || "https://callsphere.tech/opengraph-image.png",
        author: authorName
          ? { "@type": "Person", name: authorName }
          : {
              "@type": "Organization",
              name: "CallSphere",
              url: "https://callsphere.tech",
            },
        publisher: {
          "@type": "Organization",
          name: "CallSphere",
          logo: {
            "@type": "ImageObject",
            url: "https://callsphere.tech/callsphere-logo.webp",
          },
        },
      }}
    />
  );
}

export function CollectionPageJsonLd({
  name,
  description,
  url,
  items,
}: {
  name: string;
  description: string;
  url: string;
  items: { position: number; url: string; name: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name,
        description,
        url,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: items.map((item) => ({
            "@type": "ListItem",
            position: item.position,
            url: item.url,
            name: item.name,
          })),
        },
      }}
    />
  );
}

export function TechArticleJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
}: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: title,
        description,
        url,
        datePublished,
        dateModified: dateModified || datePublished,
        proficiencyLevel: "Expert",
        author: {
          "@type": "Organization",
          name: "CallSphere",
          url: "https://callsphere.tech",
        },
        publisher: {
          "@type": "Organization",
          name: "CallSphere",
          logo: {
            "@type": "ImageObject",
            url: "https://callsphere.tech/callsphere-logo.webp",
          },
        },
      }}
    />
  );
}

export function DefinedTermSetJsonLd({
  name,
  description,
  url,
  terms,
}: {
  name: string;
  description: string;
  url: string;
  terms: { term: string; description: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "DefinedTermSet",
        name,
        description,
        url,
        hasDefinedTerm: terms.map((t) => ({
          "@type": "DefinedTerm",
          name: t.term,
          description: t.description,
        })),
      }}
    />
  );
}
