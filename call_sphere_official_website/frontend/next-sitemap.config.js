/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL ?? "https://callsphere.tech",
  generateRobotsTxt: false,
  sitemapSize: 5000,
  outDir: "public",
  changefreq: "weekly",
  priority: 0.8,
  transform: async (config, path) => {
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: new Date().toISOString()
    };
  }
};
