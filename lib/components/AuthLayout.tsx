"use client";

import { ReactNode } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { canAccessPage } from "@/lib/config/roles";
import { useRouter, usePathname } from "next/navigation";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect handled by useAuth
  }

  // Check if user has access to this page
  if (!canAccessPage(user.role, pathname)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px" }}>
        <h1>Access Denied</h1>
        <p style={{ color: "var(--muted)" }}>You don't have permission to access this page.</p>
        <button onClick={() => router.push("/dashboard")} style={{ width: "auto" }}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
