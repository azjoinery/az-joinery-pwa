"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Shell } from "@/lib/components/Shell";
import { AuthLayout } from "@/lib/components/AuthLayout";
import { ROLE_CONFIG, ROLES } from "@/lib/config/roles";
import { ProductionLogForm } from "@/lib/components/ProductionLogForm";
import { TasksList } from "@/lib/components/TasksList";

export default function CabinetmakerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("log");

  if (!user || user.role !== ROLES.CABINETMAKER) {
    return null;
  }

  const config = ROLE_CONFIG[ROLES.CABINETMAKER];

  return (
    <AuthLayout>
      <Shell
        title="Daily Work"
        subtitle="AZ Joinery"
        tabs={config.dashboardTabs}
        activeTab={tab}
        onTabChange={setTab}
        onLogout={() => {}}
      >
        {tab === "log" && <LogTab />}
        {tab === "tasks" && <TasksTab />}
        {tab === "output" && <OutputTab />}
      </Shell>
    </AuthLayout>
  );
}

function LogTab() {
  const { user } = useAuth();
  return (
    <section>
      <h1>Daily Production Log</h1>
      <p className="muted">Log today's cabinet production work.</p>

      {user && <ProductionLogForm cabinetMakerId={user.id} />}
    </section>
  );
}

function TasksTab() {
  const { user } = useAuth();
  return (
    <section>
      <h1>My Tasks</h1>
      <p className="muted">Tasks assigned to you today.</p>
      {user && <TasksList />}
    </section>
  );
}

function OutputTab() {
  return (
    <section>
      <h1>My Output History</h1>
      <p className="muted">Your recent production entries.</p>
      <div className="notice">Output history coming in Phase 1</div>
    </section>
  );
}
