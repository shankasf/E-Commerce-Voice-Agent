import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export const alt = "CallSphere Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug },
    select: { title: true, category: true },
  });

  const title = post?.title ?? "CallSphere Blog";
  const category = post?.category ?? "Article";

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
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(120, 119, 198, 0.12), transparent 50%)",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "40px",
            }}
          >
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
              style={{ fontSize: "36px", fontWeight: "bold", color: "#0f172a" }}
            >
              CallSphere
            </span>
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
            {category}
          </div>

          <h1
            style={{
              fontSize: title.length > 60 ? "40px" : "50px",
              fontWeight: "bold",
              color: "#0f172a",
              textAlign: "center",
              lineHeight: 1.2,
              margin: 0,
              maxWidth: "900px",
            }}
          >
            {title}
          </h1>
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
          <span>callsphere.tech/blog</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
