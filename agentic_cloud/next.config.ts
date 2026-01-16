import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    domains: ["callsphere.tech"],
  },
};

export default nextConfig;
