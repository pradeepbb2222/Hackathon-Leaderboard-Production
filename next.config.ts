import type { NextConfig } from "next";

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""))
    .filter(Boolean);
}

const nextConfig: NextConfig = {
  // Gzip holds small SSE writes until the buffer fills. Leave compression off
  // so the live board reaches the browser immediately, including through a proxy.
  compress: false,
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    serverActions: {
      // Extra public hostnames when a tunnel's Host header is not the browser origin.
      // Matching X-Forwarded-Host or Host is already allowed by Next.js.
      allowedOrigins: allowedOrigins(),
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
