import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Nav from "./nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "AZ Joinery PWA",
  description: "Progressive Web App for AZ Joinery custom joinery management",
  manifest: "/manifest.json",
  applicationName: "AZ Joinery",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f59e0b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="brand">
              AZ <span>Joinery</span>
            </div>
            <Link className="muted" href="/auth/login">
              Sign in
            </Link>
          </header>
          <main className="main">{children}</main>
          <Nav />
        </div>
      </body>
    </html>
  );
}
