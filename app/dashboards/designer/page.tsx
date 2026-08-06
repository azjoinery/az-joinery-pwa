"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Shell } from "@/lib/components/Shell";
import { AuthLayout } from "@/lib/components/AuthLayout";
import { ROLE_CONFIG, ROLES } from "@/lib/config/roles";

export default function DesignerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("design");

  if (!user || user.role !== ROLES.DESIGNER) {
    return null;
  }

  const config = ROLE_CONFIG[ROLES.DESIGNER];

  return (
    <AuthLayout>
      <Shell
        title="Design Workflow"
        subtitle="AZ Joinery"
        tabs={config.dashboardTabs}
        activeTab={tab}
        onTabChange={setTab}
        onLogout={() => {}}
      >
        {tab === "design" && <DesignTab />}
        {tab === "jobs" && <JobsTab />}
        {tab === "catalog" && <CatalogTab />}
        {tab === "profile" && <ProfileTab />}
      </Shell>
    </AuthLayout>
  );
}

function DesignTab() {
  return (
    <section>
      <h1>Design Dashboard</h1>
      <p className="muted">14-stage design workflow and approvals.</p>
      <div className="notice">Design workflow UI coming in Phase 3</div>
    </section>
  );
}

function JobsTab() {
  return (
    <section>
      <h1>Design Jobs</h1>
      <p className="muted">Jobs currently in design phase.</p>
      <div className="notice">Design jobs management coming in Phase 3</div>
    </section>
  );
}

function CatalogTab() {
  return (
    <section>
      <h1>Design Catalog</h1>
      <p className="muted">Standard designs and templates.</p>
      <div className="notice">Design catalog coming in Phase 3</div>
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
