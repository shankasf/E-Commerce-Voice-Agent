import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://cloud.callsphere.tech";

  const routes = [
    "",
    "/product",
    "/services",
    "/pricing",
    "/security",
    "/docs",
    "/waitlist",
    "/company",
    "/legal/privacy",
    "/legal/terms",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/waitlist" ? 0.9 : 0.8,
  }));
}
