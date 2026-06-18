// next.config.ts — Next.js configuration
// Author: Sudarshan Sonawane

import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // ─── Security headers ────────────────────────────
  async headers() {
    const baseHeaders = [
      // Prevent MIME-sniffing
      { key: "X-Content-Type-Options", value: "nosniff" },
      // No framing — clickjacking protection
      { key: "X-Frame-Options", value: "DENY" },
      // Old XSS auditor — deprecated but harmless
      { key: "X-XSS-Protection", value: "1; mode=block" },
      // Strip referrer to same-origin
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Disable dangerous browser features
      {
        key: "Permissions-Policy",
        value: [
          "camera=()",
          "microphone=()",
          "geolocation=()",
          "interest-cohort=()",
          "payment=()",
          "usb=()",
        ].join(", "),
      },
    ];

    if (isProd) {
      // HSTS — only emit in production (HTTPS-only)
      baseHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }

    return [{ source: "/(.*)", headers: baseHeaders }];
  },
};

export default nextConfig;