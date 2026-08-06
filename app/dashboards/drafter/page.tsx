"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Shell } from "@/lib/components/Shell";
import { AuthLayout } from "@/lib/components/AuthLayout";
import { ROLE_CONFIG, ROLES } from "@/lib/config/roles";

export default function DrafterDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("design");

  if (!user || user.role !== ROLES.DRAFTER) {
    return null;
  }

  const config = ROLE_CONFIG[ROLES.DRAFTER];

  return (
    <AuthLayout>
      <Shell
        title="Design Support"
        subtitle="AZ Joinery"
        tabs={config.dashboardTabs}
        activeTab={tab}
        onTabChange={setTab}
        onLogout={() => {}}
      >
        {tab === "design" && <DesignTab />}
        {tab === "tasks" && <TasksTab />}
        {tab === "profile" && <ProfileTab />}
      </Shell>
    </AuthLayout>
  );
}

function DesignTab() {
  return (
    <section>
      <h1>Design Workflow</h1>
      <p className="muted">Support designer team with drafting tasks.</p>
      <div className="notice">Design workflow UI coming in Phase 3</div>
    </section>
  );
}

function TasksTab() {
  return (
    <section>
      <h1>My Tasks</h1>
      <p className="muted">Design tasks assigned to you.</p>
      <div className="notice">Task management coming in Phase 1</div>
    </section>
  );
}

function ProfileTab() {
  return (
    <section>
      <h1>Profile</h1>
      <p className="muted">Your profile and settings.</p>
      <div className="card">
        <p>Profile management coming in Phase 1</p>
      </div>
    </section>
  );
}
