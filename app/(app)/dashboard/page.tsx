"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";
import { DailyEntry, EntryMaterial, Job } from "@/lib/types";
import Icon, { type IconName } from "@/lib/components/Icon";

// Roles that get the executive/management overview instead of the
// floor-worker daily-log form. This mirrors the old app's split between
// ManagementOverview (MD/GM/DM) and EmployeeDashboard (floor roles) — see
// AZ-Joinery-Full-Audit-and-Rebuild-Plan.md Section 2, "biggest UX gap."
const EXECUTIVE_ROLES = new Set([
  "managing_director",
  "manager",
  "department_manager",
  "admin",
]);

export default function DashboardPage() {
  const { user } = useAuth();
  if (user && EXECUTIVE_ROLES.has(user.role)) {
    return <ExecutiveOverview />;
  }
  return <FloorLogDashboard />;
}

/* ==========================================================================
   Shared presentation
   ========================================================================== */

/**
 * Workshop hero. The photo is always behind a scrim so the heading keeps a
 * high contrast ratio regardless of how bright that crop of the image is.
 */
function WorkshopHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate mb-6 overflow-hidden rounded-card bg-ink-950">
      {/* Art direction: the square crop frames the team at the bench, which
          reads far better in a narrow column; the wide crop shows the floor. */}
      <div
        className="absolute inset-0 bg-cover bg-center md:hidden"
        style={{ backgroundImage: "url(/workshop/team-square-sm.jpg)" }}
      />
      <div
        className="absolute inset-0 hidden bg-cover bg-center md:block"
        style={{ backgroundImage: "url(/workshop/hero-wide.jpg)" }}
      />
      <div className="img-scrim absolute inset-0" />

      <div className="relative z-10 p-5 md:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-orange">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-white md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-white/65">{subtitle}</p>
        )}
        {children}
      </div>
    </section>
  );
}

/** Big figure shown inside the hero, on the photo. */
function HeroFigure({
  label,
  value,
  subtitle,
  primary = false,
}: {
  label: string;
  value: string;
  subtitle?: string;
  primary?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.13em] text-white/50">
        {label}
      </div>
      <div
        className={`mt-1 font-heading font-semibold tabular tracking-tight text-white ${
          primary ? "text-3xl md:text-4xl" : "text-xl md:text-2xl"
        }`}
      >
        {value}
      </div>
      {subtitle && (
        <div className="mt-1.5 text-xs font-normal text-white/60">
          {subtitle}
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="section-title">{children}</h2>
      {action}
    </div>
  );
}

/* ==========================================================================
   Executive / management overview

   Every number here is either a real API value or a visible "—" when that
   data couldn't be loaded (never a placeholder presented as real).
   ========================================================================== */

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
    const [
      jobsR,
      prodR,
      flagsR,
      reportsR,
      lowStockR,
      acctR,
      salesR,
      designR,
      complianceR,
    ] = await Promise.allSettled([
      api.get<Job[]>("/jobs"),
      api.get<{ grand: number; activeWorkers: number }>(
        "/analytics/production?period=weekly"
      ),
      api.get<{ status?: string }[]>("/flags"),
      api.get<{ status?: string }[]>("/reports"),
      api.get<unknown[]>("/stock/items?lowOnly=true&active=true"),
      api.get<{ outstanding: number }>("/accounts/dashboard"),
      api.get<{
        confirmedSalesValue: number;
        activeLeads: number;
        quotesSent: number;
      }>("/sales/dashboard"),
      api.get<{ inProgress: number; ready: number; overdue: number }>(
        "/design/dashboard"
      ),
      api.get<{ status?: string }[]>("/compliance"),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const newAlerts: Alert[] = [];

    if (jobsR.status === "fulfilled") {
      const jobs = jobsR.value || [];
      const notDone = (j: Job) => j.status !== "Delivered";
      setActiveJobs(jobs.filter(notDone).length);
      const overdue = jobs.filter(
        (j) => notDone(j) && j.dueDate && j.dueDate < today
      );
      if (overdue.length > 0) {
        newAlerts.push({
          key: "overdue-jobs",
          label: "Overdue jobs",
          count: overdue.length,
          href: "/jobs",
          tone: "red",
        });
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
      if (open.length > 0)
        newAlerts.push({
          key: "flags",
          label: "Open flags",
          count: open.length,
          href: "/tasks",
          tone: "amber",
        });
    }

    if (reportsR.status === "fulfilled") {
      const open = (reportsR.value || []).filter((r) => r.status !== "Resolved");
      if (open.length > 0)
        newAlerts.push({
          key: "reports",
          label: "Open reports",
          count: open.length,
          href: "/tasks",
          tone: "amber",
        });
    }

    if (lowStockR.status === "fulfilled") {
      const count = (lowStockR.value || []).length;
      if (count > 0)
        newAlerts.push({
          key: "low-stock",
          label: "Low stock items",
          count,
          href: "/inventory",
          tone: "amber",
        });
    }

    if (complianceR.status === "fulfilled") {
      const open = (complianceR.value || []).filter(
        (c) => c.status !== "Resolved" && c.status !== "Closed"
      );
      if (open.length > 0)
        newAlerts.push({
          key: "qhs",
          label: "Open QHS incidents",
          count: open.length,
          href: "/analytics",
          tone: "red",
        });
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
        newAlerts.push({
          key: "design-overdue",
          label: "Overdue design jobs",
          count: designR.value.overdue,
          href: "/design",
          tone: "red",
        });
      }
    }

    setAlerts(newAlerts);
    setLoading(false);
  };

  const currency = (n: number | null) =>
    n != null
      ? new Intl.NumberFormat("en-AU", {
          style: "currency",
          currency: "AUD",
          maximumFractionDigits: 0,
        }).format(n)
      : "—";

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton mb-6 h-44 rounded-card" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <WorkshopHero
        eyebrow="Business snapshot"
        title={`Welcome, ${user?.name?.split(" ")[0] ?? ""}`}
        subtitle="Where the workshop stands right now."
      >
        <div className="mt-6 grid grid-cols-2 gap-5 border-t border-white/15 pt-5 md:grid-cols-4">
          <HeroFigure
            label="Confirmed sales"
            value={currency(confirmedSales)}
            subtitle="Won leads value"
            primary
          />
          <HeroFigure label="Outstanding" value={currency(outstanding)} />
          <HeroFigure
            label="Active jobs"
            value={activeJobs != null ? String(activeJobs) : "—"}
          />
          <HeroFigure
            label="Weekly output"
            value={weeklyOutput != null ? String(weeklyOutput) : "—"}
          />
        </div>
      </WorkshopHero>

      {loadError && (
        <div className="alert-danger mb-5" role="alert">
          <Icon name="alert" size={17} className="mt-px" />
          <span>
            Some data on this page couldn&apos;t be loaded. The numbers shown are
            still accurate for what did load.
          </span>
        </div>
      )}

      {/* ---- Alerts ---- */}
      <section className="mb-7">
        <SectionHeading>Needs attention</SectionHeading>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-card border border-success/25 bg-success-light px-4 py-3.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success text-white">
              <Icon name="check" size={17} />
            </span>
            <div>
              <p className="text-sm font-semibold text-success-dark">All clear</p>
              <p className="text-xs text-success-dark/75">
                Nothing needs attention right now.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {alerts.map((a) => (
              <Link
                key={a.key}
                href={a.href}
                className={`group flex items-center gap-3 rounded-card border px-4 py-3.5 transition-all hover:shadow-card-hover ${
                  a.tone === "red"
                    ? "border-danger/25 bg-danger-light"
                    : "border-warning/25 bg-warning-light"
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-white ${
                    a.tone === "red" ? "bg-danger" : "bg-warning"
                  }`}
                >
                  <Icon name="alert" size={18} />
                </span>
                <span
                  className={`flex-1 text-sm font-semibold ${
                    a.tone === "red" ? "text-danger-dark" : "text-warning-dark"
                  }`}
                >
                  {a.label}
                </span>
                <span
                  className={`font-heading text-xl font-semibold tabular ${
                    a.tone === "red" ? "text-danger-dark" : "text-warning-dark"
                  }`}
                >
                  {a.count}
                </span>
                <Icon
                  name="chevronRight"
                  size={17}
                  className={`transition-transform group-hover:translate-x-0.5 ${
                    a.tone === "red" ? "text-danger/60" : "text-warning/60"
                  }`}
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ---- Departments ---- */}
      <section className="mb-7">
        <SectionHeading>Departments</SectionHeading>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            icon="sales"
            label="Active leads"
            value={activeLeads}
            href="/sales"
          />
          <StatTile
            icon="design"
            label="Design in progress"
            value={designInProgress}
            href="/design"
          />
          <StatTile
            icon="check"
            label="Ready to release"
            value={designReady}
            href="/design"
          />
          <StatTile
            icon="invoices"
            label="Quotes sent"
            value={quotesSent}
            href="/invoices"
          />
        </div>
      </section>

      {/* ---- Quick actions ---- */}
      <section>
        <SectionHeading>Quick actions</SectionHeading>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          <QuickAction href="/jobs" icon="jobs" label="Jobs" />
          <QuickAction href="/sales" icon="sales" label="Sales" />
          <QuickAction href="/design" icon="design" label="Design" />
          <QuickAction href="/inventory" icon="inventory" label="Stock" />
          <QuickAction href="/invoices" icon="invoices" label="Invoices" />
          <QuickAction href="/analytics" icon="analytics" label="Analytics" />
          <QuickAction href="/tasks" icon="tasks" label="Tasks" />
        </div>
      </section>

      {activeWorkers != null && activeWorkers > 0 && (
        <p className="mt-7 text-center text-xs text-ink-400">
          {activeWorkers} {activeWorkers === 1 ? "person" : "people"} logged
          production this week.
        </p>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  href,
}: {
  icon: IconName;
  label: string;
  value: number | null;
  href: string;
}) {
  return (
    <Link href={href} className="card-interactive group card-pad block">
      <div className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-100 text-ink-500 transition-colors group-hover:bg-brand-orange/10 group-hover:text-brand-orange">
          <Icon name={icon} size={18} />
        </span>
        <Icon
          name="chevronRight"
          size={16}
          className="text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500"
        />
      </div>
      <div className="mt-3 font-heading text-2xl font-semibold tabular tracking-tight text-ink-900">
        {value ?? "—"}
      </div>
      <div className="mt-0.5 text-xs font-medium text-ink-500">{label}</div>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: IconName;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="card-interactive flex flex-col items-center gap-2 px-2 py-4 text-center"
    >
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink-100 text-ink-600 transition-colors hover:bg-brand-orange/10">
        <Icon name={icon} size={20} />
      </span>
      <span className="text-xs font-medium text-ink-700">{label}</span>
    </Link>
  );
}

/* ==========================================================================
   Floor-worker daily log — shown to cabinet_maker, installer, supervisor,
   office, and other non-executive roles.
   ========================================================================== */

// Minimal shape for the material picker (the stock list returns much more).
interface StockPick { id: string; name: string; unit?: string; on_hand_qty?: number }

function FloorLogDashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(true);

  // Materials used today — deducted from stock on save (delta-reconciled server-side).
  const [materials, setMaterials] = useState<EntryMaterial[]>([]);
  const [stockList, setStockList] = useState<StockPick[]>([]);
  const [jobList, setJobList] = useState<{ id: string; jobNum?: string; client?: string; projectName?: string }[]>([]);

  // Counter-based materials UI (Slice 1) — Assigned / Record tabs.
  // Each + / − tap updates local materials state and schedules a debounced save.
  const [matsTab, setMatsTab] = useState<"assigned" | "record">("record");
  const [recordDept, setRecordDept] = useState<"CNC" | "Assembly" | "Hardware">("CNC");
  const [recordJobId, setRecordJobId] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState<null | { target: "assigned" | "record"; jobId?: string }>(null);
  const [pickerQ, setPickerQ] = useState("");
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved" | "error">("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const materialsRef = useRef(materials);
  useEffect(() => { materialsRef.current = materials; }, [materials]);

  const cabinetTypes = [
    { key: "cab_small", label: "Small cabinet" },
    { key: "cab_tall", label: "Tall cabinet" },
    { key: "cab_drawer", label: "Drawer / corner" },
    { key: "cab_special", label: "Special cabinet" },
  ];

  const cncItems = [
    { key: "cnc_colour", label: "Colour board" },
    { key: "cnc_mdf", label: "MDF" },
    { key: "cnc_carcass", label: "Carcass" },
  ];

  useEffect(() => {
    loadTodayEntry();
    // Pickers for the "Materials used" section (non-fatal if they fail).
    api.get<StockPick[]>("/stock/items?active=true")
      .then((rows) => setStockList(rows || [])).catch(() => {});
    api.get<any[]>("/jobs").then((rows) => setJobList(rows || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadTodayEntry = async () => {
    try {
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      const data = await api.get<DailyEntry>(`/entries/mine?date=${today}`);
      if (data) {
        setCounts(data.counts || {});
        setNote(data.note || "");
        setMaterials(data.materials || []);
      }
    } catch (err) {
      console.log("No entry yet for today");
    }
  };

  const addMaterialRow = () =>
    setMaterials((prev) => [...prev, { stockItemId: "", jobId: "", qty: 1, wastageQty: 0 }]);
  const updateMaterialRow = (i: number, patch: Partial<EntryMaterial>) =>
    setMaterials((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const removeMaterialRow = (i: number) =>
    setMaterials((prev) => prev.filter((_, idx) => idx !== i));

  const increment = (key: string) =>
    setCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));

  const decrement = (key: string) =>
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - 1) }));

  // Debounced save fired by counter taps. Sends the current entry (counts+note+materials)
  // — the backend reconciles materials by DELTA, so pressing + twice never double-deducts.
  const scheduleSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const rows = materialsRef.current
          .filter((m) => m.stockItemId && ((m.qty || 0) > 0 || (m.wastageQty || 0) > 0))
          .map((m) => {
            const job = jobList.find((j) => j.id === m.jobId);
            return { ...m, jobNum: job?.jobNum || m.jobNum || "" };
          });
        await api.post("/entries", { date: today, counts, note, materials: rows });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "" : s)), 1600);
      } catch {
        setSaveStatus("error");
      }
    }, 500);
  };

  // Counter helpers used by both Assigned and Record rows.
  const bumpMaterial = (rowIdx: number, delta: 1 | -1) => {
    setMaterials((prev) => {
      const next = [...prev];
      const cur = next[rowIdx];
      if (!cur) return prev;
      const newQty = Math.max(0, (cur.qty || 0) + delta);
      next[rowIdx] = { ...cur, qty: newQty };
      return next;
    });
    scheduleSave();
  };
  const addMaterialFromCatalogue = (matId: string) => {
    const already = materials.findIndex(
      (m) => m.stockItemId === matId
        && (m.jobId || "") === (pickerOpen?.jobId || (pickerOpen?.target === "record" ? recordJobId : ""))
    );
    if (already >= 0) {
      // If they picked a material already in the list, treat as +1 on that row.
      bumpMaterial(already, 1);
    } else {
      setMaterials((prev) => [
        ...prev,
        {
          stockItemId: matId,
          jobId: pickerOpen?.jobId || (pickerOpen?.target === "record" ? recordJobId : ""),
          qty: 1,
          wastageQty: 0,
        },
      ]);
      scheduleSave();
    }
    setPickerOpen(null);
    setPickerQ("");
  };

  const submitLog = async () => {
    setSaving(true);
    setMessage("");
    try {
      const today = new Date().toISOString().split("T")[0];
      // Send only complete material rows; the server reconciles them to stock.
      const cleanMaterials = materials
        .filter((m) => m.stockItemId && ((m.qty || 0) > 0 || (m.wastageQty || 0) > 0))
        .map((m) => {
          const job = jobList.find((j) => j.id === m.jobId);
          return { ...m, jobNum: job?.jobNum || m.jobNum || "" };
        });
      await api.post("/entries", { date: today, counts, note, materials: cleanMaterials });
      setOk(true);
      setMessage(
        cleanMaterials.length > 0
          ? "Daily log saved — stock updated."
          : "Daily log saved."
      );
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setOk(false);
      setMessage(
        "Failed to save: " + (err.response?.data?.detail || "Server error")
      );
    } finally {
      setSaving(false);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="page">
      <WorkshopHero
        eyebrow="Today on the floor"
        title={`Good to see you, ${user?.name?.split(" ")[0] ?? ""}`}
        subtitle="Log what you finish as you go — it only takes a moment."
      >
        <div className="mt-6 flex items-end gap-6 border-t border-white/15 pt-5">
          <HeroFigure label="Units today" value={String(total)} primary />
          <p className="pb-1.5 text-sm text-white/55">
            {total === 0
              ? "Nothing logged yet today."
              : "Nice work — keep it going."}
          </p>
        </div>
      </WorkshopHero>

      <section className="mb-6">
        <SectionHeading>Cabinets</SectionHeading>
        <div className="space-y-2.5">
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
      </section>

      <section className="mb-6">
        <SectionHeading>CNC</SectionHeading>
        <div className="space-y-2.5">
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
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <SectionHeading>Materials used</SectionHeading>
          <span className="text-xs font-medium" style={{ color: saveStatus === "error" ? "#b91c1c" : "#6b7280" }}>
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : saveStatus === "error" ? "Save failed — try again" : ""}
          </span>
        </div>

        {/* Assigned / Record tab switch */}
        <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMatsTab("assigned")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${matsTab === "assigned" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Assigned
          </button>
          <button
            type="button"
            onClick={() => setMatsTab("record")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${matsTab === "record" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            Record
          </button>
        </div>

        {matsTab === "assigned" && (
          materials.filter((m) => m.jobId).length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
              Nothing assigned to you yet today.
              <div className="mt-1 text-xs">Switch to <b>Record</b> to log ad-hoc work.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {materials.map((m, i) => {
                if (!m.jobId) return null;
                const stk = stockList.find((s) => s.id === m.stockItemId);
                const job = jobList.find((j) => j.id === m.jobId);
                return (
                  <div key={`a${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">{stk?.name || "Material"}</div>
                      <div className="truncate text-xs text-gray-500">{[job?.jobNum, job?.client || job?.projectName].filter(Boolean).join(" · ") || "No job"}</div>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                      <button type="button" onClick={() => bumpMaterial(i, -1)} disabled={(m.qty || 0) <= 0} className="grid h-12 w-12 place-items-center rounded-md bg-white text-2xl font-bold text-gray-700 shadow-sm disabled:opacity-40" aria-label="one less">−</button>
                      <div className="min-w-[3rem] text-center text-lg font-bold tabular-nums">{m.qty || 0}</div>
                      <button type="button" onClick={() => bumpMaterial(i, 1)} className="grid h-12 w-12 place-items-center rounded-md bg-white text-2xl font-bold text-gray-700 shadow-sm" aria-label="one more">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {matsTab === "record" && (
          <div>
            {/* Department chips */}
            <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1">
              {(["CNC", "Assembly", "Hardware"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRecordDept(d)}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold ${recordDept === d ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Optional job */}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-gray-500">Job (optional)</label>
              <select
                value={recordJobId}
                onChange={(e) => setRecordJobId(e.target.value)}
                className="input w-full"
              >
                <option value="">— no job (general workshop use) —</option>
                {jobList.map((j) => (
                  <option key={j.id} value={j.id}>{[j.jobNum, j.client || j.projectName].filter(Boolean).join(" — ") || j.id}</option>
                ))}
              </select>
            </div>

            {/* Material counter rows for THIS job (or "no job") */}
            {(() => {
              const jobKey = recordJobId || "";
              const rows = materials
                .map((m, i) => ({ m, i }))
                .filter(({ m }) => (m.jobId || "") === jobKey);
              if (rows.length === 0) {
                return (
                  <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                    No materials yet. Tap <b>+ Add material</b> below.
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  {rows.map(({ m, i }) => {
                    const stk = stockList.find((s) => s.id === m.stockItemId);
                    const low = stk && typeof stk.on_hand_qty === "number" && stk.on_hand_qty <= 3;
                    return (
                      <div key={`r${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-gray-900">{stk?.name || "Material"}</div>
                          <div className="truncate text-xs text-gray-500">
                            {stk?.unit || ""}{typeof stk?.on_hand_qty === "number" ? ` · ${stk.on_hand_qty} on hand` : ""}
                            {low ? " · low" : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                          <button type="button" onClick={() => bumpMaterial(i, -1)} disabled={(m.qty || 0) <= 0} className="grid h-12 w-12 place-items-center rounded-md bg-white text-2xl font-bold text-gray-700 shadow-sm disabled:opacity-40" aria-label="one less">−</button>
                          <div className="min-w-[3rem] text-center text-lg font-bold tabular-nums">{m.qty || 0}</div>
                          <button type="button" onClick={() => bumpMaterial(i, 1)} className="grid h-12 w-12 place-items-center rounded-md bg-white text-2xl font-bold text-gray-700 shadow-sm" aria-label="one more">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => { setPickerOpen({ target: "record" }); setPickerQ(""); }}
              className="mt-3 w-full rounded-lg border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              + Add material
            </button>
          </div>
        )}

        {/* Material picker modal (dropdown from stock catalogue) */}
        {pickerOpen && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setPickerOpen(null)}>
            <div className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
              <div className="mb-2 text-base font-semibold text-gray-900">Pick a material</div>
              <input
                type="search"
                value={pickerQ}
                onChange={(e) => setPickerQ(e.target.value)}
                placeholder="Search materials…"
                className="input mb-3 w-full"
                autoFocus
              />
              <div className="max-h-72 overflow-y-auto">
                {stockList
                  .filter((s) => !pickerQ || s.name.toLowerCase().includes(pickerQ.toLowerCase()))
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => addMaterialFromCatalogue(s.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-gray-300 mb-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">{s.name}</div>
                        <div className="truncate text-xs text-gray-500">{s.unit || ""}{typeof s.on_hand_qty === "number" ? ` · ${s.on_hand_qty} on hand` : ""}</div>
                      </div>
                      <span className="text-lg font-bold text-gray-400">+</span>
                    </button>
                  ))}
                {stockList.filter((s) => !pickerQ || s.name.toLowerCase().includes(pickerQ.toLowerCase())).length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-400">No materials match.</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(null)}
                className="mt-2 w-full rounded-lg py-3 text-sm font-semibold text-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mb-6">
        <div className="field">
          <label htmlFor="note" className="label">
            Notes
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything worth flagging about today's work…"
            className="input resize-none"
            rows={3}
          />
        </div>
      </section>

      {message && (
        <div className={ok ? "alert-success mb-4" : "alert-danger mb-4"} role="status">
          <Icon name={ok ? "check" : "alert"} size={17} className="mt-px" />
          <span>{message}</span>
        </div>
      )}

      <button
        onClick={submitLog}
        disabled={saving}
        className="btn-primary w-full text-base"
        style={{ minHeight: "3.25rem" }}
      >
        <Icon name="uploads" size={19} />
        {saving ? "Saving…" : "Submit daily log"}
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
    <div className="card flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-[0.9375rem] font-medium text-ink-900">{label}</span>
      <div className="flex items-center gap-2">
        {/* 44px targets — usable with gloves on. */}
        <button
          onClick={onDecrement}
          disabled={value === 0}
          aria-label={`Decrease ${label}`}
          className="grid h-11 w-11 place-items-center rounded-lg border border-ink-300 bg-white text-ink-700 transition-colors hover:bg-ink-100 active:scale-95 disabled:opacity-35"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
        <span
          className={`w-12 text-center font-heading text-2xl font-semibold tabular ${
            value > 0 ? "text-brand-orange" : "text-ink-300"
          }`}
        >
          {value}
        </span>
        <button
          onClick={onIncrement}
          aria-label={`Increase ${label}`}
          className="grid h-11 w-11 place-items-center rounded-lg bg-brand-orange text-white transition-colors hover:bg-brand-orange-dark active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
