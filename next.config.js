/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb", // vídeos podem ser grandes
    },
  },
  // Necessário para libs nativas (fluent-ffmpeg) não serem bundladas incorretamente
  serverExternalPackages: ["fluent-ffmpeg", "ffmpeg-static", "ffprobe-static"],
};

module.exports = nextConfig;
