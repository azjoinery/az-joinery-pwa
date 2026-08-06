"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Shell } from "@/lib/components/Shell";
import { AuthLayout } from "@/lib/components/AuthLayout";
import { ROLE_CONFIG, ROLES } from "@/lib/config/roles";
import { ProductionLogForm } from "@/lib/components/ProductionLogForm";
import { TasksList } from "@/lib/components/TasksList";
import { JobsList } from "@/lib/components/JobsList";

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
  const { user } = useAuth();
  return (
    <section>
      <h1>Daily Work Log</h1>
      <p className="muted">Log your installation work and hours.</p>
      {user && <ProductionLogForm cabinetMakerId={user.id} />}
    </section>
  );
}

function TasksTab() {
  const { user } = useAuth();
  return (
    <section>
      <h1>My Tasks</h1>
      <p className="muted">Installation tasks assigned to you.</p>
      {user && <TasksList />}
    </section>
  );
}

function JobsTab() {
  return (
    <section>
      <h1>My Jobs</h1>
      <p className="muted">Jobs assigned for installation.</p>
      <JobsList />
    </section>
  );
}
