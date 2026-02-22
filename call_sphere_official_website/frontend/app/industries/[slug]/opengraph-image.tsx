import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "CallSphere - AI Voice Agents by Industry";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const industries: Record<string, { name: string; tagline: string }> = {
  hvac: { name: "HVAC Services", tagline: "Schedule service calls & dispatch technicians with AI" },
  healthcare: { name: "Healthcare", tagline: "Book appointments & manage patient calls with AI" },
  "it-support": { name: "IT Support", tagline: "Triage tickets & resolve issues with AI" },
  logistics: { name: "Logistics", tagline: "Track orders & manage deliveries with AI" },
  "real-estate": { name: "Real Estate & Property Management", tagline: "Schedule showings & manage properties with AI" },
  restaurant: { name: "Restaurants & Food Service", tagline: "Take reservations & process orders with AI" },
  "salon-beauty": { name: "Salons & Beauty", tagline: "Book appointments & reduce no-shows with AI" },
  dental: { name: "Dental Practices", tagline: "Schedule patients & verify insurance with AI" },
  legal: { name: "Legal & Law Firms", tagline: "Qualify leads & schedule consultations with AI" },
  insurance: { name: "Insurance", tagline: "Handle quotes & claims intake with AI" },
  automotive: { name: "Automotive & Dealerships", tagline: "Book service & capture leads with AI" },
  "financial-services": { name: "Financial Services", tagline: "Handle inquiries & schedule advisors with AI" },
};

export default async function Image({ params }: { params: { slug: string } }) {
  const industry = industries[params.slug] || { name: params.slug, tagline: "AI Voice Agents" };

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(120, 119, 198, 0.12), transparent 50%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "40px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                backgroundColor: "#1e293b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <span style={{ fontSize: "36px", fontWeight: "bold", color: "#0f172a" }}>CallSphere</span>
          </div>

          <div
            style={{
              backgroundColor: "#eef2ff",
              color: "#4338ca",
              padding: "10px 24px",
              borderRadius: "999px",
              fontSize: "22px",
              fontWeight: 600,
              marginBottom: "24px",
            }}
          >
            {industry.name}
          </div>

          <h1
            style={{
              fontSize: "56px",
              fontWeight: "bold",
              color: "#0f172a",
              textAlign: "center",
              lineHeight: 1.15,
              margin: 0,
              maxWidth: "900px",
            }}
          >
            AI Voice Agents for {industry.name}
          </h1>

          <p
            style={{
              fontSize: "26px",
              color: "#475569",
              textAlign: "center",
              marginTop: "20px",
              maxWidth: "750px",
            }}
          >
            {industry.tagline}
          </p>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#64748b",
            fontSize: "20px",
          }}
        >
          <span>callsphere.tech</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
