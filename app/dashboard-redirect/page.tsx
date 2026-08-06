"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { ROLES } from "@/lib/config/roles";

export default function DashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Route to role-specific dashboard
    const dashboardPaths: Record<string, string> = {
      [ROLES.ADMIN]: "/dashboards/admin",
      [ROLES.MANAGER]: "/dashboards/manager",
      [ROLES.SUPERVISOR]: "/dashboards/supervisor",
      [ROLES.CABINETMAKER]: "/dashboards/cabinetmaker",
      [ROLES.DRAFTER]: "/dashboards/drafter",
      [ROLES.DESIGNER]: "/dashboards/designer",
      [ROLES.INSTALLER]: "/dashboards/installer",
    };

    const dashboardPath = dashboardPaths[user.role as keyof typeof dashboardPaths];

    if (dashboardPath) {
      router.push(dashboardPath);
    } else {
      // Default to cabinetmaker if role not recognized
      router.push("/dashboards/cabinetmaker");
    }
  }, [user, loading, router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <p style={{ color: "var(--muted)" }}>Redirecting to your dashboard...</p>
    </div>
  );
}
