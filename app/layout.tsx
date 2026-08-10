import type { Metadata, Viewport } from "next";
import "./globals.css";

/* Fonts are linked at runtime rather than via next/font.
 *
 * next/font downloads the files during `next build`, which makes every deploy
 * depend on Google Fonts being reachable — one blip there and the whole build
 * fails. Linking them keeps deploys bulletproof, and the font stacks in
 * globals.css fall back to the native system UI font if the request is ever
 * blocked, so the app always renders. */

export const metadata: Metadata = {
  title: {
    default: "AZ Joinery",
    template: "%s · AZ Joinery",
  },
  description:
    "Production, sales and accounts management for AZ Joinery — custom kitchens, wardrobes and cabinetry.",
  manifest: "/manifest.json",
  applicationName: "AZ Joinery",
  appleWebApp: {
    capable: true,
    title: "AZ Joinery",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1A1A18",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ink-50 text-ink-900 antialiased">{children}</body>
    </html>
  );
}
