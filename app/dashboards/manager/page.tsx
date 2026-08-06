"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Shell } from "@/lib/components/Shell";
import { AuthLayout } from "@/lib/components/AuthLayout";
import { ROLE_CONFIG, ROLES } from "@/lib/config/roles";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("home");

  if (!user || user.role !== ROLES.MANAGER) {
    return null;
  }

  const config = ROLE_CONFIG[ROLES.MANAGER];

  return (
    <AuthLayout>
      <Shell
        title="Management Dashboard"
        subtitle="AZ Joinery"
        tabs={config.dashboardTabs}
        activeTab={tab}
        onTabChange={setTab}
        onLogout={() => {}}
      >
        {tab === "home" && <ManagerHome />}
        {tab === "design" && <DesignTab />}
        {tab === "jobs" && <JobsTab />}
        {tab === "sales" && <SalesTab />}
        {tab === "analytics" && <AnalyticsTab />}
      </Shell>
    </AuthLayout>
  );
}

function ManagerHome() {
  return (
    <section>
      <h1>Business Overview</h1>
      <p className="muted">Key metrics and upcoming actions.</p>

      <div className="grid-2">
        <div className="card">
          <p className="muted">Active Jobs</p>
          <div className="stat">12</div>
        </div>
        <div className="card">
          <p className="muted">Design Queue</p>
          <div className="stat">5</div>
        </div>
        <div className="card">
          <p className="muted">Production Output</p>
          <div className="stat">8 cabinets</div>
        </div>
        <div className="card">
          <p className="muted">Open Leads</p>
          <div className="stat">3</div>
        </div>
      </div>

      <div className="card">
        <h2>This Week's Priorities</h2>
        <ul className="list">
          <li>
            <strong>Harborview Kitchens (AZ-1042)</strong>
            <p className="muted">Due: Aug 14 — In production</p>
          </li>
          <li>
            <strong>Meridian Offices (AZ-1043)</strong>
            <p className="muted">Due: Aug 28 — Quoted, awaiting approval</p>
          </li>
          <li>
            <strong>Colton Residence (AZ-1039)</strong>
            <p className="muted">Due: Jul 22 — Ready for handover</p>
          </li>
        </ul>
      </div>
    </section>
  );
}

function DesignTab() {
  return (
    <section>
      <h1>Design Workflow</h1>
      <p className="muted">Monitor design progress and approvals.</p>
      <div className="notice">Design workflow UI coming in Phase 3</div>
    </section>
  );
}

function JobsTab() {
  return (
    <section>
      <h1>Job Management</h1>
      <p className="muted">Create, edit, and track all jobs.</p>
      <div className="notice">Job management UI coming in Phase 1</div>
    </section>
  );
}

function SalesTab() {
  return (
    <section>
      <h1>Sales Pipeline</h1>
      <p className="muted">Leads, conversions, and sales funnel.</p>
      <div className="notice">Sales pipeline UI coming in Phase 2</div>
    </section>
  );
}

function AnalyticsTab() {
  return (
    <section>
      <h1>Analytics & Reports</h1>
      <p className="muted">Business metrics and performance reports.</p>
      <div className="notice">Analytics dashboard coming in Phase 3</div>
    </section>
  );
}
