import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "CallSphere - AI for Enterprise Customer Communications";
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

export default async function Image() {
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
                {/* Subtle grid pattern */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)`,
                        backgroundSize: "40px 40px",
                    }}
                />

                {/* Content container */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "60px",
                        position: "relative",
                    }}
                >
                    {/* Logo and brand */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            marginBottom: "40px",
                        }}
                    >
                        {/* Simple logo circle */}
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
                            <svg
                                width="36"
                                height="36"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" x2="12" y1="19" y2="22" />
                            </svg>
                        </div>
                        <span
                            style={{
                                fontSize: "48px",
                                fontWeight: "bold",
                                color: "#0f172a",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            CallSphere
                        </span>
                    </div>

                    {/* Main headline */}
                    <h1
                        style={{
                            fontSize: "64px",
                            fontWeight: "bold",
                            color: "#0f172a",
                            textAlign: "center",
                            lineHeight: 1.1,
                            margin: 0,
                            maxWidth: "900px",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        AI for Enterprise Customer Communications
                    </h1>

                    {/* Subtitle */}
                    <p
                        style={{
                            fontSize: "28px",
                            color: "#475569",
                            textAlign: "center",
                            marginTop: "24px",
                            maxWidth: "800px",
                            lineHeight: 1.4,
                        }}
                    >
                        Deploy conversational AI that reduces contact center costs and improves customer satisfaction
                    </p>

                    {/* Feature badges */}
                    <div
                        style={{
                            display: "flex",
                            gap: "16px",
                            marginTop: "40px",
                        }}
                    >
                        {["Voice AI", "Chat AI", "57+ Languages", "Enterprise Ready"].map((badge) => (
                            <div
                                key={badge}
                                style={{
                                    backgroundColor: "#f1f5f9",
                                    color: "#334155",
                                    padding: "12px 24px",
                                    borderRadius: "999px",
                                    fontSize: "20px",
                                    fontWeight: 500,
                                }}
                            >
                                {badge}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom bar */}
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
        {
            ...size,
        }
    );
}
