"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Shell } from "@/lib/components/Shell";
import { AuthLayout } from "@/lib/components/AuthLayout";
import { ROLE_CONFIG, ROLES } from "@/lib/config/roles";

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
  return (
    <section>
      <h1>Daily Production Log</h1>
      <p className="muted">Log today's cabinet production work.</p>

      <div className="card">
        <h2>Today's Output</h2>
        <div className="grid-2">
          <div>
            <label htmlFor="cabinets">Cabinets built</label>
            <input type="number" id="cabinets" defaultValue="0" min="0" />
          </div>
          <div>
            <label htmlFor="boards">CNC boards cut</label>
            <input type="number" id="boards" defaultValue="0" min="0" />
          </div>
        </div>
        <p />
        <button>Submit daily log</button>
      </div>

      <div className="notice">Production logging coming in Phase 1</div>
    </section>
  );
}

function TasksTab() {
  return (
    <section>
      <h1>My Tasks</h1>
      <p className="muted">Tasks assigned to you today.</p>
      <div className="notice">Task management coming in Phase 1</div>
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
