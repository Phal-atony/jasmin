const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
};

module.exports = nextConfig;
