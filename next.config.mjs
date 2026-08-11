/**
 * AZ Joinery app — production config.
 *
 * Production host: https://app.azjoinery.com.au
 * The public marketing site (azjoinery.com.au, WordPress) is a completely
 * separate system and is never touched by this app.
 */

const APP_ORIGIN = "https://app.azjoinery.com.au";

// The backend origin, derived from the API URL so the CSP can't drift out of
// sync with whatever the app is actually calling.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
let API_ORIGIN = "";
try {
  if (API_URL) API_ORIGIN = new URL(API_URL).origin;
} catch {
  API_ORIGIN = "";
}

/**
 * Content Security Policy.
 *
 * 'unsafe-inline' on styles is required by Tailwind's runtime style injection
 * and our inline background-image styles. 'unsafe-inline'/'unsafe-eval' on
 * scripts is required by the Next.js App Router hydration payload — removing
 * it needs per-request nonces via middleware, which is a worthwhile follow-up
 * but not something to change during a domain migration.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ["connect-src 'self'", API_ORIGIN].filter(Boolean).join(" "),
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Two years, subdomains included, preload-eligible. Only ever sent over
  // HTTPS; Vercel terminates TLS and redirects HTTP automatically.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Camera stays enabled for on-site job photos; the rest is denied.
    value: "camera=(self), microphone=(), geolocation=(self), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // This is an internal business tool — keep the whole app out of search.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The manifest must be readable by the browser's install machinery.
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
      {
        source: "/:all*(webp|jpg|jpeg|png|ico|svg)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  async redirects() {
    // Canonicalise onto app.azjoinery.com.au so the Vercel-generated hostnames
    // stop being usable as a production URL. Scoped by host to the production
    // aliases only — preview deployments and localhost are untouched, which
    // avoids redirect loops and keeps testing working.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "az-joinery-pwa.vercel.app" }],
        destination: `${APP_ORIGIN}/:path*`,
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "az-joinery-pwa-az-5344.vercel.app" }],
        destination: `${APP_ORIGIN}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
