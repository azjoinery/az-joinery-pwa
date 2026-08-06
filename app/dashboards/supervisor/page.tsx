"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Shell } from "@/lib/components/Shell";
import { AuthLayout } from "@/lib/components/AuthLayout";
import { ROLE_CONFIG, ROLES } from "@/lib/config/roles";
import { JobsList } from "@/lib/components/JobsList";
import { TasksList } from "@/lib/components/TasksList";
import { NotificationCenter } from "@/lib/components/NotificationCenter";

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("home");

  if (!user || user.role !== ROLES.SUPERVISOR) {
    return null;
  }

  const config = ROLE_CONFIG[ROLES.SUPERVISOR];

  return (
    <AuthLayout>
      <Shell
        title="Production Supervision"
        subtitle="AZ Joinery"
        tabs={config.dashboardTabs}
        activeTab={tab}
        onTabChange={setTab}
        onLogout={() => {}}
      >
        {tab === "home" && <SupervisorHome />}
        {tab === "jobs" && <JobsTab />}
        {tab === "log" && <LogTab />}
        {tab === "allocate" && <AllocateTab />}
        {tab === "output" && <OutputTab />}
        {tab === "staff" && <StaffTab />}
      </Shell>
    </AuthLayout>
  );
}

function SupervisorHome() {
  return (
    <section>
      <h1>Production Summary</h1>
      <p className="muted">Today's production status and team activity.</p>

      <div style={{ marginBottom: "2rem" }}>
        <NotificationCenter />
      </div>

      <div className="grid-2">
        <div className="card">
          <p className="muted">Today's Output</p>
          <div className="stat">8 cabinets</div>
        </div>
        <div className="card">
          <p className="muted">Team Members</p>
          <div className="stat">5</div>
        </div>
        <div className="card">
          <p className="muted">Jobs In Progress</p>
          <div className="stat">4</div>
        </div>
        <div className="card">
          <p className="muted">Issues Reported</p>
          <div className="stat">2</div>
        </div>
      </div>

      <div className="card">
        <h2>Team Status</h2>
        <ul className="list">
          <li>
            <strong>Allan</strong>
            <p className="muted">Cabinet making — On schedule</p>
          </li>
          <li>
            <strong>Sarah</strong>
            <p className="muted">CNC operation — 12 boards cut</p>
          </li>
          <li>
            <strong>Michael</strong>
            <p className="muted">Assembly — 3 cabinets completed</p>
          </li>
        </ul>
      </div>
    </section>
  );
}

function JobsTab() {
  return (
    <section>
      <h1>Active Jobs</h1>
      <p className="muted">Jobs currently in production.</p>
      <JobsList />
    </section>
  );
}

function LogTab() {
  return (
    <section>
      <h1>My Work Log</h1>
      <p className="muted">Log your daily production work.</p>
      <div className="notice">Work logging coming in Phase 1</div>
    </section>
  );
}

function AllocateTab() {
  return (
    <section>
      <h1>Allocate Output</h1>
      <p className="muted">Assign production output to jobs.</p>
      <div className="notice">Output allocation coming in Phase 1</div>
    </section>
  );
}

function OutputTab() {
  return (
    <section>
      <h1>Production Output</h1>
      <p className="muted">Summary and reporting of team production.</p>
      <div className="notice">Output summary coming in Phase 1</div>
    </section>
  );
}

function StaffTab() {
  return (
    <section>
      <h1>Staff Performance</h1>
      <p className="muted">Team member productivity and metrics.</p>
      <div className="notice">Staff performance coming in Phase 1</div>
    </section>
  );
}
