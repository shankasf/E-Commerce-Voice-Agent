/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/industries\\#healthcare",
        destination: "/industries/healthcare",
        permanent: true,
      },
      {
        source: "/industries\\#hvac",
        destination: "/industries/hvac",
        permanent: true,
      },
      {
        source: "/industries\\#it-support",
        destination: "/industries/it-support",
        permanent: true,
      },
      {
        source: "/industries\\#logistics",
        destination: "/industries/logistics",
        permanent: true,
      },
      {
        source: "/industries\\#retail",
        destination: "/industries",
        permanent: true,
      },
      {
        source: "/industries\\#finance",
        destination: "/industries",
        permanent: true,
      },
      {
        source: "/industries\\#real-estate",
        destination: "/industries",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://ddwl4m2hdecbv.cloudfront.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://www.google-analytics.com https://api.openai.com https://*.callsphere.tech wss://*.callsphere.tech; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://callsphere.tech;",
          },
        ],
      },
      {
        source: "/(.*)\\.(js|css|woff2|png|jpg|jpeg|gif|svg|ico|webp)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
