"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Shell } from "@/lib/components/Shell";
import { AuthLayout } from "@/lib/components/AuthLayout";
import { ROLE_CONFIG, ROLES } from "@/lib/config/roles";

export default function InstallerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("log");

  if (!user || user.role !== ROLES.INSTALLER) {
    return null;
  }

  const config = ROLE_CONFIG[ROLES.INSTALLER];

  return (
    <AuthLayout>
      <Shell
        title="Installation Work"
        subtitle="AZ Joinery"
        tabs={config.dashboardTabs}
        activeTab={tab}
        onTabChange={setTab}
        onLogout={() => {}}
      >
        {tab === "log" && <LogTab />}
        {tab === "tasks" && <TasksTab />}
        {tab === "jobs" && <JobsTab />}
      </Shell>
    </AuthLayout>
  );
}

function LogTab() {
  return (
    <section>
      <h1>Daily Work Log</h1>
      <p className="muted">Log your installation work and hours.</p>
      <div className="notice">Work logging coming in Phase 1</div>
    </section>
  );
}

function TasksTab() {
  return (
    <section>
      <h1>My Tasks</h1>
      <p className="muted">Installation tasks assigned to you.</p>
      <div className="notice">Task management coming in Phase 1</div>
    </section>
  );
}

function JobsTab() {
  return (
    <section>
      <h1>My Jobs</h1>
      <p className="muted">Jobs assigned for installation.</p>
      <div className="notice">Job tracking coming in Phase 1</div>
    </section>
  );
}
