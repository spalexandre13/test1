/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Ces paquets embarquent des binaires : ils ne doivent pas etre bundles.
    serverComponentsExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
    // `puppeteer` n'est qu'une devDependency pour le dev local : hors du deploiement.
    outputFileTracingExcludes: { "*": ["node_modules/puppeteer/**"] }
  }
};

export default nextConfig;
