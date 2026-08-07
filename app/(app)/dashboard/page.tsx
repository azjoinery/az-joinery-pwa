"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";
import { DailyEntry, Job } from "@/lib/types";

// Roles that get the executive/management overview instead of the
// floor-worker daily-log form. This mirrors the old app's split between
// ManagementOverview (MD/GM/DM) and EmployeeDashboard (floor roles) — see
// AZ-Joinery-Full-Audit-and-Rebuild-Plan.md Section 2, "biggest UX gap."
const EXECUTIVE_ROLES = new Set(["managing_director", "manager", "department_manager", "admin"]);

export default function DashboardPage() {
  const { user } = useAuth();
  if (user && EXECUTIVE_ROLES.has(user.role)) {
    return <ExecutiveOverview />;
  }
  return <FloorLogDashboard />;
}

// ---------------------------------------------------------------------
// Executive / management overview — hero snapshot, alerts feed, quick
// actions. Every number here is either a real API value or a visible "--"
// when that data couldn't be loaded (never a placeholder presented as real).
// ---------------------------------------------------------------------

interface Alert {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: "red" | "amber";
}

function ExecutiveOverview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [outstanding, setOutstanding] = useState<number | null>(null);
  const [confirmedSales, setConfirmedSales] = useState<number | null>(null);
  const [weeklyOutput, setWeeklyOutput] = useState<number | null>(null);
  const [activeWorkers, setActiveWorkers] = useState<number | null>(null);
  const [activeLeads, setActiveLeads] = useState<number | null>(null);
  const [designInProgress, setDesignInProgress] = useState<number | null>(null);
  const [designReady, setDesignReady] = useState<number | null>(null);
  const [quotesSent, setQuotesSent] = useState<number | null>(null);
  const [activeJobs, setActiveJobs] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    // Fetch everything in parallel and let each one fail independently —
    // one missing permission or slow endpoint shouldn't blank the whole
    // page. This mirrors the old app's ManagementOverview pattern.
    const [jobsR, prodR, flagsR, reportsR, lowStockR, acctR, salesR, designR, complianceR] =
      await Promise.allSettled([
        api.get<Job[]>("/jobs"),
        api.get<{ grand: number; activeWorkers: number }>("/analytics/production?period=weekly"),
        api.get<{ status?: string }[]>("/flags"),
        api.get<{ status?: string }[]>("/reports"),
        api.get<unknown[]>("/stock/items?lowOnly=true"),
        api.get<{ outstanding: number }>("/accounts/dashboard"),
        api.get<{ confirmedSalesValue: number; activeLeads: number; quotesSent: number }>("/sales/dashboard"),
        api.get<{ inProgress: number; ready: number; overdue: number }>("/design/dashboard"),
        api.get<{ status?: string }[]>("/compliance"),
      ]);

    const today = new Date().toISOString().slice(0, 10);
    const newAlerts: Alert[] = [];

    if (jobsR.status === "fulfilled") {
      const jobs = jobsR.value || [];
      const notDone = (j: Job) => j.status !== "Delivered";
      setActiveJobs(jobs.filter(notDone).length);
      const overdue = jobs.filter((j) => notDone(j) && j.dueDate && j.dueDate < today);
      if (overdue.length > 0) {
        newAlerts.push({ key: "overdue-jobs", label: "Overdue jobs", count: overdue.length, href: "/jobs", tone: "red" });
      }
    } else {
      setLoadError(true);
    }

    if (prodR.status === "fulfilled") {
      setWeeklyOutput(prodR.value.grand);
      setActiveWorkers(prodR.value.activeWorkers);
    }

    if (flagsR.status === "fulfilled") {
      const open = (flagsR.value || []).filter((f) => f.status !== "Resolved");
      if (open.length > 0) newAlerts.push({ key: "flags", label: "Open flags", count: open.length, href: "/tasks", tone: "amber" });
    }

    if (reportsR.status === "fulfilled") {
      const open = (reportsR.value || []).filter((r) => r.status !== "Resolved");
      if (open.length > 0) newAlerts.push({ key: "reports", label: "Open reports", count: open.length, href: "/tasks", tone: "amber" });
    }

    if (lowStockR.status === "fulfilled") {
      const count = (lowStockR.value || []).length;
      if (count > 0) newAlerts.push({ key: "low-stock", label: "Low stock items", count, href: "/inventory", tone: "amber" });
    }

    if (complianceR.status === "fulfilled") {
      const open = (complianceR.value || []).filter((c) => c.status !== "Resolved" && c.status !== "Closed");
      if (open.length > 0) newAlerts.push({ key: "qhs", label: "Open QHS incidents", count: open.length, href: "/analytics", tone: "red" });
    }

    if (acctR.status === "fulfilled") setOutstanding(acctR.value.outstanding);

    if (salesR.status === "fulfilled") {
      setConfirmedSales(salesR.value.confirmedSalesValue);
      setActiveLeads(salesR.value.activeLeads);
      setQuotesSent(salesR.value.quotesSent);
    }

    if (designR.status === "fulfilled") {
      setDesignInProgress(designR.value.inProgress);
      setDesignReady(designR.value.ready);
      if (designR.value.overdue > 0) {
        newAlerts.push({ key: "design-overdue", label: "Overdue design jobs", count: designR.value.overdue, href: "/design", tone: "red" });
      }
    }

    setAlerts(newAlerts);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-4 pb-28">
        <div className="text-center py-12 text-gray-600">Loading overview...</div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-28 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
        <p className="text-sm text-gray-600">Business snapshot</p>
      </div>

      {loadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          Some data on this page couldn't be loaded. The numbers shown are still accurate for what did load.
        </div>
      )}

      {/* Hero snapshot */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow">
        <div className="text-sm opacity-90">Confirmed sales value</div>
        <div className="text-4xl font-bold">{confirmedSales != null ? `$${confirmedSales.toLocaleString()}` : "--"}</div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20 text-center">
          <div>
            <div className="text-xs opacity-80">Outstanding</div>
            <div className="text-lg font-semibold">{outstanding != null ? `$${outstanding.toLocaleString()}` : "--"}</div>
          </div>
          <div>
            <div className="text-xs opacity-80">Active Jobs</div>
            <div className="text-lg font-semibold">{activeJobs ?? "--"}</div>
          </div>
          <div>
            <div className="text-xs opacity-80">Weekly Output</div>
            <div className="text-lg font-semibold">{weeklyOutput ?? "--"}</div>
          </div>
        </div>
      </div>

      {/* Alerts & Actions Needed */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Alerts & Actions Needed</h2>
        {alerts.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center text-green-800">
            ✅ All clear — nothing needs attention right now
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <Link
                key={a.key}
                href={a.href}
                className={`flex justify-between items-center p-3 rounded-lg border ${
                  a.tone === "red" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                }`}
              >
                <span className={`text-sm font-medium ${a.tone === "red" ? "text-red-800" : "text-amber-800"}`}>{a.label}</span>
                <span className={`text-sm font-bold ${a.tone === "red" ? "text-red-900" : "text-amber-900"}`}>{a.count}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Departments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Departments</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Active Leads" value={activeLeads} href="/sales" />
          <StatTile label="Design In Progress" value={designInProgress} href="/design" />
          <StatTile label="Ready to Release" value={designReady} href="/design" />
          <StatTile label="Quotes Sent" value={quotesSent} href="/invoices" />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          <QuickAction href="/jobs" icon="📋" label="Jobs" />
          <QuickAction href="/sales" icon="🎯" label="Sales" />
          <QuickAction href="/design" icon="📐" label="Design" />
          <QuickAction href="/inventory" icon="📦" label="Stock" />
          <QuickAction href="/invoices" icon="💰" label="Invoices" />
          <QuickAction href="/analytics" icon="📊" label="Analytics" />
          <QuickAction href="/tasks" icon="✓" label="Tasks" />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, href }: { label: string; value: number | null; href: string }) {
  return (
    <Link href={href} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300 block">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value ?? "--"}</div>
    </Link>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-orange-300 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xs font-medium text-gray-700">{label}</div>
    </Link>
  );
}

// ---------------------------------------------------------------------
// Floor-worker daily log — unchanged behaviour, shown to cabinet_maker,
// installer, supervisor, office, and other non-executive roles.
// ---------------------------------------------------------------------

function FloorLogDashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const cabinetTypes = [
    { key: "cab_small", label: "Small Cabinet" },
    { key: "cab_tall", label: "Tall Cabinet" },
    { key: "cab_drawer", label: "Drawer/Corner" },
    { key: "cab_special", label: "Special Cabinet" },
  ];

  const cncItems = [
    { key: "cnc_colour", label: "Colour Board" },
    { key: "cnc_mdf", label: "MDF" },
    { key: "cnc_carcass", label: "Carcass" },
  ];

  useEffect(() => {
    loadTodayEntry();
  }, [user?.id]);

  const loadTodayEntry = async () => {
    try {
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      const data = await api.get<DailyEntry>(`/entries/mine?date=${today}`);
      if (data) {
        setCounts(data.counts || {});
        setNote(data.note || "");
      }
    } catch (err) {
      console.log("No entry yet for today");
    }
  };

  const increment = (key: string) => {
    setCounts((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));
  };

  const decrement = (key: string) => {
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) - 1),
    }));
  };

  const submitLog = async () => {
    setSaving(true);
    setMessage("");
    try {
      const today = new Date().toISOString().split("T")[0];
      await api.post("/entries", {
        date: today,
        counts,
        note,
      });
      setMessage("✓ Daily log saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage("✗ Failed to save: " + (err.response?.data?.detail || "Server error"));
    } finally {
      setSaving(false);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 pb-28 space-y-6">
      {/* Today's Summary */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow">
        <div className="text-sm opacity-90">Today's Production</div>
        <div className="text-4xl font-bold">{total}</div>
        <div className="text-sm opacity-90 mt-1">Total units</div>
      </div>

      {/* Cabinets Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🪚 Cabinets</h2>
        <div className="space-y-3">
          {cabinetTypes.map((type) => (
            <Counter
              key={type.key}
              label={type.label}
              value={counts[type.key] || 0}
              onIncrement={() => increment(type.key)}
              onDecrement={() => decrement(type.key)}
            />
          ))}
        </div>
      </div>

      {/* CNC Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚙️ CNC</h2>
        <div className="space-y-3">
          {cncItems.map((item) => (
            <Counter
              key={item.key}
              label={item.label}
              value={counts[item.key] || 0}
              onIncrement={() => increment(item.key)}
              onDecrement={() => decrement(item.key)}
            />
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any notes about today's work..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          rows={3}
        />
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg text-center font-medium ${
            message.startsWith("✓")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={submitLog}
        disabled={saving}
        className="w-full py-4 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400 text-lg"
      >
        {saving ? "Saving..." : "📤 Submit Daily Log"}
      </button>
    </div>
  );
}

function Counter({
  label,
  value,
  onIncrement,
  onDecrement,
}: {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 flex items-center justify-between">
      <span className="font-medium text-gray-900">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={onDecrement}
          className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-lg font-bold transition-colors"
        >
          −
        </button>
        <span className="w-12 text-center text-2xl font-bold text-orange-600">{value}</span>
        <button
          onClick={onIncrement}
          className="w-10 h-10 rounded-lg bg-orange-200 hover:bg-orange-300 flex items-center justify-center text-lg font-bold transition-colors text-orange-700"
        >
          +
        </button>
      </div>
    </div>
  );
}
