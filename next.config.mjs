/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // As imagens agora vêm do Vercel Blob (URL permanente, com CORS liberado)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
    experimental: {
          serverComponentsExternalPackages: ["@vercel/blob"],
    },
};

export default nextConfig;
