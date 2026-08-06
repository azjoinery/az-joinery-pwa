"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Shell } from "@/lib/components/Shell";
import { AuthLayout } from "@/lib/components/AuthLayout";
import { ROLE_CONFIG, ROLES } from "@/lib/config/roles";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("home");

  if (!user || user.role !== ROLES.ADMIN) {
    return null;
  }

  const config = ROLE_CONFIG[ROLES.ADMIN];

  return (
    <AuthLayout>
      <Shell
        title="System Administration"
        subtitle="AZ Joinery"
        tabs={config.dashboardTabs}
        activeTab={tab}
        onTabChange={setTab}
        onLogout={() => {}}
      >
        {tab === "home" && <AdminHome />}
        {tab === "users" && <UsersTab />}
        {tab === "settings" && <SettingsTab />}
        {tab === "audit" && <AuditTab />}
      </Shell>
    </AuthLayout>
  );
}

function AdminHome() {
  return (
    <section>
      <h1>System Overview</h1>
      <p className="muted">System administration and monitoring dashboard.</p>

      <div className="card">
        <h2>Quick Stats</h2>
        <div className="grid-2">
          <div className="card">
            <p className="muted">Active Users</p>
            <div className="stat">7</div>
          </div>
          <div className="card">
            <p className="muted">Active Jobs</p>
            <div className="stat">12</div>
          </div>
          <div className="card">
            <p className="muted">System Health</p>
            <div className="stat" style={{ color: "var(--green)" }}>OK</div>
          </div>
          <div className="card">
            <p className="muted">Last Backup</p>
            <div className="stat" style={{ fontSize: "14px" }}>Today</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>System Notices</h2>
        <ul className="list">
          <li>
            <strong>MongoDB</strong>
            <p className="muted">All systems operational</p>
          </li>
          <li>
            <strong>API Server</strong>
            <p className="muted">Running normally</p>
          </li>
          <li>
            <strong>Frontend</strong>
            <p className="muted">Live and responsive</p>
          </li>
        </ul>
      </div>
    </section>
  );
}

function UsersTab() {
  return (
    <section>
      <h1>User Management</h1>
      <p className="muted">Manage system users and permissions.</p>

      <div className="notice">User management coming in Phase 1</div>

      <div className="card">
        <p className="muted">Admin users: 1</p>
        <p className="muted">Manager users: 1</p>
        <p className="muted">Production users: 5</p>
      </div>
    </section>
  );
}

function SettingsTab() {
  return (
    <section>
      <h1>System Settings</h1>
      <p className="muted">Configure system-wide settings.</p>

      <div className="notice">Settings management coming in Phase 1</div>

      <div className="card">
        <h2>Database</h2>
        <p className="muted">MongoDB Atlas connected</p>
      </div>

      <div className="card">
        <h2>Authentication</h2>
        <p className="muted">JWT-based auth enabled</p>
      </div>
    </section>
  );
}

function AuditTab() {
  return (
    <section>
      <h1>Audit Log</h1>
      <p className="muted">System activity and changes.</p>

      <div className="notice">Audit log coming in Phase 1</div>

      <div className="card">
        <p className="muted">Logs are stored in the database and accessible to admins only.</p>
      </div>
    </section>
  );
}
