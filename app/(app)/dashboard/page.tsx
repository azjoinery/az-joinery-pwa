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
  "office",
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
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [money, setMoney] = useState<MoneySummary | null>(null);
  const [lowStock, setLowStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Money is finance-sensitive — only these roles see it (and the accounts
  // endpoint only allows them, so we don't even ask otherwise).
  const seesMoney =
    !!user && ["managing_director", "manager", "admin"].includes(user.role);

  useEffect(() => {
    let alive = true;
    api
      .get<PipelineSummary>("/pipeline/summary")
      .then((d) => {
        if (alive) {
          setSummary(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setFailed(true);
          setLoading(false);
        }
      });

    api
      .get<unknown[]>("/stock/items?lowOnly=true&active=true")
      .then((r) => {
        if (alive) setLowStock(Array.isArray(r) ? r.length : 0);
      })
      .catch(() => {});

    if (seesMoney) {
      api
        .get<MoneySummary>("/accounts/dashboard")
        .then((d) => {
          if (alive) setMoney(d);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [seesMoney]);

  const firstName = user?.name?.split(" ")[0] || "there";
  const totals = summary?.totals;
  const stages = summary?.stages || [];
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="page pb-28">
      <WorkshopHero eyebrow="Workshop" title={`${execGreeting()}, ${firstName}`} subtitle={execToday()}>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
          <HeroFigure label="Active jobs" value={totals ? String(totals.activeJobs) : "—"} primary />
          <HeroFigure label="Overdue" value={totals ? String(totals.overdue) : "—"} />
          {seesMoney ? (
            <HeroFigure label="Outstanding" value={money ? execCurrency(money.outstanding) : "—"} />
          ) : null}
        </div>
      </WorkshopHero>

      {failed ? (
        <div className="mb-6 rounded-card border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          Couldn&apos;t load the overview just now. Pull to refresh or try again shortly.
        </div>
      ) : null}

      {/* Four numbers */}
      <section className="mb-7">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon="jobs" label="Active jobs" value={totals?.activeJobs ?? null} href="/jobs" />
          <StatTile icon="inventory" label="Needs materials" value={totals?.officeJobs ?? null} href="/materials" />
          <StatTile icon="wrench" label="In production" value={totals?.productionQueue ?? null} href="/production" />
          <StatTile icon="alert" label="Overdue" value={totals?.overdue ?? null} href="/jobs" />
        </div>
      </section>

      {/* Needs attention — money + office */}
      <section className="mb-7">
        <SectionHeading>Needs attention</SectionHeading>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {seesMoney ? (
            <FlowCard
              href="/accounts"
              icon="accounts"
              title="Money"
              main={money ? execCurrency(money.outstanding) : "—"}
              mainLabel="outstanding"
              detail={
                money
                  ? `${money.overdueInvoices} overdue invoice${money.overdueInvoices === 1 ? "" : "s"}`
                  : "Tap to open accounts"
              }
            />
          ) : null}
          <FlowCard
            href="/materials"
            icon="inventory"
            title="Office"
            main={totals ? String(totals.officeJobs) : "—"}
            mainLabel="jobs short"
            detail={`${totals?.officeLines ?? 0} lines to order · ${lowStock ?? 0} low stock`}
          />
        </div>
      </section>

      {/* Job pipeline — the whole flow in one calm list */}
      <section className="mb-7">
        <SectionHeading action={<span className="text-xs text-ink-400">Tap a stage</span>}>
          Job pipeline
        </SectionHeading>
        <div className="card card-pad">
          {loading ? (
            <PipelineSkeleton />
          ) : (
            <div className="flex flex-col gap-2.5">
              {stages.map((s) => (
                <Link
                  key={s.key}
                  href={s.href}
                  className="-mx-1 flex items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-ink-50"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: stageColor(s.key), opacity: s.count ? 1 : 0.35 }}
                  />
                  <span className="w-32 shrink-0 truncate text-sm text-ink-700 sm:w-40">{s.label}</span>
                  <span className="h-5 flex-1 overflow-hidden rounded bg-ink-100">
                    <span
                      className="block h-full rounded"
                      style={{
                        width: `${s.count ? Math.max(6, (s.count / maxCount) * 100) : 0}%`,
                        background: stageColor(s.key),
                        transition: "width .35s ease",
                      }}
                    />
                  </span>
                  <span className="w-7 text-right font-heading text-base font-semibold tabular tracking-tight text-ink-900">
                    {s.count}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Needs you today */}
      {summary && summary.overdueJobs.length > 0 ? (
        <section className="mb-7">
          <SectionHeading>Needs you today</SectionHeading>
          <div className="flex flex-col gap-2">
            {summary.overdueJobs.map((j) => (
              <Link
                key={j.id}
                href="/jobs"
                className="card-interactive flex items-center justify-between gap-3 p-4"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-900">
                    #{j.jobNum} · {j.client}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    {execStageLabel(j.stage)}
                    {j.dueDate ? ` · due ${j.dueDate}` : ""}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                  Overdue
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Quick actions (restored) */}
      <section>
        <SectionHeading>Quick actions</SectionHeading>
        <div className="grid grid-cols-3 gap-3">
          <QuickAction href="/jobs" icon="jobs" label="Jobs" />
          <QuickAction href="/tasks" icon="tasks" label="Tasks" />
          <QuickAction href="/materials" icon="inventory" label="Materials" />
          <QuickAction href="/sales" icon="sales" label="Sales" />
          <QuickAction href="/invoices" icon="invoices" label="Invoices" />
          <QuickAction href="/analytics" icon="analytics" label="Reports" />
        </div>
      </section>
    </div>
  );
}

/* ---- Executive dashboard data + helpers (self-contained) ---- */

type PipelineStage = {
  key: string;
  label: string;
  href: string;
  color: string;
  owner: string;
  count: number;
};
type PipelineJob = {
  id: string;
  jobNum?: string;
  client?: string;
  stage?: string;
  dueDate?: string;
};
type PipelineSummary = {
  stages: PipelineStage[];
  totals: {
    activeJobs: number;
    overdue: number;
    officeJobs: number;
    officeLines: number;
    productionQueue: number;
  };
  overdueJobs: PipelineJob[];
};
type MoneySummary = {
  outstanding: number;
  overdueInvoices: number;
  monthlyRevenue?: number;
};

// Stage colours — a warm→green grade keyed to each stage's meaning:
// early work is amber, "awaiting materials" flags red (office must act),
// building runs through the brand orange, completion greens out.
const STAGE_COLORS: Record<string, string> = {
  in_design: "#FCD34D",          // amber — just starting
  released: "#FBBF24",           // amber
  awaiting_materials: "#EF4444", // red — needs purchasing
  materials_ready: "#FB923C",    // light orange — ready to build
  in_production: "#F5822A",      // brand orange — building
  ready_to_deliver: "#84CC16",   // lime — nearly done
  delivered: "#16A34A",          // green — done
};
function stageColor(key: string) {
  return STAGE_COLORS[key] || "#F5822A";
}

function PipelineSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-ink-200" />
          <span className="h-4 w-32 rounded bg-ink-100" />
          <span className="h-5 flex-1 rounded bg-ink-100" />
        </div>
      ))}
    </div>
  );
}

function execGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function execToday() {
  return new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
function execCurrency(n?: number) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}
function execStageLabel(key?: string) {
  const map: Record<string, string> = {
    in_design: "In Design",
    released: "Released",
    awaiting_materials: "Awaiting Materials",
    materials_ready: "Materials Ready",
    in_production: "In Production",
    ready_to_deliver: "Ready to Deliver",
    delivered: "Delivered",
  };
  return map[key || ""] || "In progress";
}

function FlowCard({
  href,
  icon,
  title,
  main,
  mainLabel,
  detail,
}: {
  href: string;
  icon: IconName;
  title: string;
  main: string;
  mainLabel: string;
  detail: string;
}) {
  return (
    <Link href={href} className="card-interactive group card-pad block">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-orange/10 text-brand-orange-dark">
          <Icon name={icon} size={20} />
        </span>
        <Icon
          name="chevronRight"
          size={16}
          className="mt-1 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500"
        />
      </div>
      <h3 className="mt-4 text-base">{title}</h3>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-heading text-2xl font-semibold tabular tracking-tight text-ink-900">
          {main}
        </span>
        <span className="pb-1 text-xs font-medium text-ink-500">{mainLabel}</span>
      </div>
      <p className="mt-1 text-xs text-ink-500">{detail}</p>
    </Link>
  );
}

function RhythmLink({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: IconName;
  title: string;
  text: string;
}) {
  return (
    <Link href={href} className="card-interactive group flex gap-3 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-600">
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink-900">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-ink-500">{text}</span>
      </span>
      <Icon
        name="chevronRight"
        size={16}
        className="mt-1 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500"
      />
    </Link>
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
interface StockPick { id: string; name: string; unit?: string; on_hand_qty?: number; stockType?: string; category?: string }

/**
 * Slice 6 — classify a stock item as "cnc" (boards/sheets/edging) or
 * "hardware" (hinges, runners, handles, screws, fasteners), based on
 * whatever the backend tagged it with. Anything unmatched defaults to
 * "cnc" so nothing goes missing from the dashboard.
 */
function pickDept(stk?: StockPick): "cnc" | "hardware" {
  const t = ((stk?.stockType || "") + " " + (stk?.category || "")).toLowerCase();
  if (
    t.includes("hardware") || t.includes("hinge") || t.includes("runner") ||
    t.includes("handle") || t.includes("screw") || t.includes("fastener") ||
    t.includes("drawer runner") || t.includes("knob") || t.includes("pull")
  ) return "hardware";
  return "cnc";
}

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
  const [jobList, setJobList] = useState<{ id: string; jobNum?: string; client?: string; projectName?: string; assignedStaff?: string; status?: string; currentStatus?: string; dueDate?: string }[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, { progress: number; stage: string }>>({});

  // Counter-based materials UI (Slice 1) — Assigned / Record tabs.
  // Each + / − tap updates local materials state and schedules a debounced save.
  const [matsTab, setMatsTab] = useState<"assigned" | "record">("record");
  const [recordJobId, setRecordJobId] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState<null | { target: "assigned" | "record"; jobId?: string; dept?: "cnc" | "hardware" }>(null);
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

  useEffect(() => {
    loadTodayEntry();
    // Pickers for the "Materials used" section (non-fatal if they fail).
    api.get<StockPick[]>("/stock/items?active=true")
      .then((rows) => setStockList(rows || [])).catch(() => {});
    api.get<any[]>("/jobs").then((rows) => setJobList(rows || [])).catch(() => {});
    api.get<Array<{ id: string; progress: number; stage: string }>>("/jobs/progress")
      .then((rows) => {
        const map: Record<string, { progress: number; stage: string }> = {};
        (rows || []).forEach((r) => { if (r.id) map[r.id] = r; });
        setProgressMap(map);
      }).catch(() => {});
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
  const setMaterialQty = (rowIdx: number, value: number) => {
    setMaterials((prev) => prev.map((row, index) =>
      index === rowIdx ? { ...row, qty: Math.max(0, value || 0) } : row
    ));
    scheduleSave();
  };
  const setCounterValue = (key: string, value: number) =>
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, Math.round(value || 0)) }));
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
  const floorJobs = jobList.filter((job) => {
    const status = `${job.status || ""} ${job.currentStatus || ""}`.toLowerCase();
    const done = /completed|delivered|done/.test(status);
    if (done) return false;
    if (user?.role === "supervisor") return true;
    return job.assignedStaff === user?.id || job.assignedStaff === user?.name;
  });

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

      {/* ===== Your build queue ===== */}
      {floorJobs.length > 0 && (
        <section className="mb-6 mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Your build queue</h2>
            <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              {floorJobs.length} job{floorJobs.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {floorJobs.map((job) => {
              const prog = progressMap[job.id];
              const pct = prog?.progress ?? 0;
              const isBuilding = pct > 0 && pct < 100;
              const isDone = pct >= 100;
              const barColor = isDone ? "#16a34a" : isBuilding ? "#F5822A" : "#d1d5db";
              const pctColor = isDone ? "#16a34a" : isBuilding ? "#F5822A" : "#9ca3af";
              return (
                <a
                  key={job.id}
                  href="/production"
                  className="block rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {[job.jobNum && `#${job.jobNum}`, job.client || job.projectName || "Job"]
                          .filter(Boolean)
                          .join(" — ")}
                      </div>
                      {job.dueDate && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          Due {new Date(job.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                        </div>
                      )}
                    </div>
                    <span
                      className="shrink-0 text-sm font-bold tabular-nums"
                      style={{ color: pctColor }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, pct)}%`, background: barColor }}
                    />
                  </div>
                  {prog?.stage && (
                    <div className="mt-1 text-[10px] font-medium text-gray-400 capitalize">
                      {prog.stage === "done" ? "✓ Built" : `Building — ${prog.stage.replace(/_/g, " ")}`}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
          <a
            href="/production"
            className="mt-3 block text-center text-xs font-semibold"
            style={{ color: "#F5822A" }}
          >
            Full build queue →
          </a>
        </section>
      )}

      <>
      {/* ============================================================
          Slice 6 — three sections. CNC + Hardware are live (deduct
          stock on tap). Assembly is a draft tally (saves on Submit).
          Materials are classified per stock item's stockType/category
          via pickDept(). Assigned rows already have a jobId (allocated
          by the supervisor); Record rows are freely added on the day.
          ============================================================ */}

      {/* Shared save-status header for the two live sections */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Materials — live</span>
        <span className="text-xs font-medium" style={{ color: saveStatus === "error" ? "#b91c1c" : "#059669" }}>
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : saveStatus === "error" ? "Save failed — try again" : ""}
        </span>
      </div>

      {/* Assigned / Record tab switch — shared by both material sections */}
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

      {matsTab === "record" && (
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
      )}

      {/* ================ CNC boards ================ */}
      {(() => {
        const jobKey = recordJobId || "";
        const rows = materials
          .map((m, i) => ({ m, i }))
          .filter(({ m }) => {
            const stk = stockList.find((s) => s.id === m.stockItemId);
            if (pickDept(stk) !== "cnc") return false;
            if (matsTab === "assigned") return !!m.jobId;
            return (m.jobId || "") === jobKey;
          });
        return (
          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="section-title">CNC boards</h2>
                <p className="text-xs text-gray-500 mt-0.5">Each tap = 1 sheet off the shelf.</p>
              </div>
            </div>
            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                {matsTab === "assigned"
                  ? "No boards assigned to you today."
                  : <>No boards yet. Tap <b>+ Add board from stock</b> below.</>}
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map(({ m, i }) => {
                  const stk = stockList.find((s) => s.id === m.stockItemId);
                  const job = jobList.find((j) => j.id === m.jobId);
                  const low = stk && typeof stk.on_hand_qty === "number" && stk.on_hand_qty <= 3;
                  return (
                    <div key={`cnc${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">{stk?.name || "Material"}</div>
                        <div className="truncate text-xs text-gray-500">
                          {matsTab === "assigned" && job
                            ? [job.jobNum, job.client || job.projectName].filter(Boolean).join(" · ")
                            : <>{stk?.unit || ""}{typeof stk?.on_hand_qty === "number" ? ` · ${stk.on_hand_qty} on hand` : ""}{low ? <span className="text-red-600 font-semibold"> · low</span> : null}</>}
                        </div>
                        {matsTab === "assigned" && (m.assignedQty || 0) > 0 && (
                          <div className="mt-1 text-[11px] font-medium text-brand-orange-dark">
                            Assigned target: {m.assignedQty} {stk?.unit || ""}{m.assignedByName ? ` · by ${m.assignedByName}` : ""}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                        <button type="button" onClick={() => bumpMaterial(i, -1)} disabled={(m.qty || 0) <= 0} className="grid h-12 w-12 place-items-center rounded-md bg-white text-2xl font-bold text-gray-700 shadow-sm disabled:opacity-40" aria-label="one less">−</button>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={m.qty || 0}
                          onChange={(e) => setMaterialQty(i, Number(e.target.value))}
                          className="h-12 w-16 rounded-md border border-gray-200 bg-white text-center text-lg font-bold tabular-nums text-gray-900"
                          aria-label={`Quantity used for ${stk?.name || "material"}`}
                        />
                        <button type="button" onClick={() => bumpMaterial(i, 1)} className="grid h-12 w-12 place-items-center rounded-md bg-white text-2xl font-bold text-gray-700 shadow-sm" aria-label="one more">+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {matsTab === "record" && (
              <button
                type="button"
                onClick={() => { setPickerOpen({ target: "record", dept: "cnc" }); setPickerQ(""); }}
                className="mt-3 w-full rounded-lg border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                + Add board from stock
              </button>
            )}
          </section>
        );
      })()}

      {/* ================ Hardware fitted ================ */}
      {(() => {
        const jobKey = recordJobId || "";
        const rows = materials
          .map((m, i) => ({ m, i }))
          .filter(({ m }) => {
            const stk = stockList.find((s) => s.id === m.stockItemId);
            if (pickDept(stk) !== "hardware") return false;
            if (matsTab === "assigned") return !!m.jobId;
            return (m.jobId || "") === jobKey;
          });
        return (
          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="section-title">Hardware fitted</h2>
                <p className="text-xs text-gray-500 mt-0.5">Hinges, runners, handles — each tap deducts stock.</p>
              </div>
            </div>
            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                {matsTab === "assigned"
                  ? "No hardware assigned to you today."
                  : <>No hardware yet. Tap <b>+ Add hardware from stock</b> below.</>}
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map(({ m, i }) => {
                  const stk = stockList.find((s) => s.id === m.stockItemId);
                  const job = jobList.find((j) => j.id === m.jobId);
                  const low = stk && typeof stk.on_hand_qty === "number" && stk.on_hand_qty <= 3;
                  return (
                    <div key={`hw${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">{stk?.name || "Material"}</div>
                        <div className="truncate text-xs text-gray-500">
                          {matsTab === "assigned" && job
                            ? [job.jobNum, job.client || job.projectName].filter(Boolean).join(" · ")
                            : <>{stk?.unit || ""}{typeof stk?.on_hand_qty === "number" ? ` · ${stk.on_hand_qty} on hand` : ""}{low ? <span className="text-red-600 font-semibold"> · low</span> : null}</>}
                        </div>
                        {matsTab === "assigned" && (m.assignedQty || 0) > 0 && (
                          <div className="mt-1 text-[11px] font-medium text-brand-orange-dark">
                            Assigned target: {m.assignedQty} {stk?.unit || ""}{m.assignedByName ? ` · by ${m.assignedByName}` : ""}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                        <button type="button" onClick={() => bumpMaterial(i, -1)} disabled={(m.qty || 0) <= 0} className="grid h-12 w-12 place-items-center rounded-md bg-white text-2xl font-bold text-gray-700 shadow-sm disabled:opacity-40" aria-label="one less">−</button>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={m.qty || 0}
                          onChange={(e) => setMaterialQty(i, Number(e.target.value))}
                          className="h-12 w-16 rounded-md border border-gray-200 bg-white text-center text-lg font-bold tabular-nums text-gray-900"
                          aria-label={`Quantity used for ${stk?.name || "material"}`}
                        />
                        <button type="button" onClick={() => bumpMaterial(i, 1)} className="grid h-12 w-12 place-items-center rounded-md bg-white text-2xl font-bold text-gray-700 shadow-sm" aria-label="one more">+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {matsTab === "record" && (
              <button
                type="button"
                onClick={() => { setPickerOpen({ target: "record", dept: "hardware" }); setPickerQ(""); }}
                className="mt-3 w-full rounded-lg border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                + Add hardware from stock
              </button>
            )}
          </section>
        );
      })()}

      </>

      {/* ================ Assembly (tally, not stock) ================ */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="section-title">Assembly</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cabinets assembled — for the daily report. No stock impact.</p>
          </div>
          <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Draft</span>
        </div>
        <div className="space-y-2.5">
          {cabinetTypes.map((type) => (
            <Counter
              key={type.key}
              label={type.label}
              value={counts[type.key] || 0}
              onIncrement={() => increment(type.key)}
              onDecrement={() => decrement(type.key)}
              onChange={(value) => setCounterValue(type.key, value)}
            />
          ))}
        </div>
      </section>

      {/* Material picker modal (dropdown from stock catalogue) —
          filtered by pickerOpen.dept so "+ Add board" only shows CNC
          items and "+ Add hardware" only shows hardware items. */}
      {pickerOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setPickerOpen(null)}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
            <div className="mb-2 text-base font-semibold text-gray-900">
              {pickerOpen.dept === "hardware" ? "Pick hardware" : pickerOpen.dept === "cnc" ? "Pick a board" : "Pick a material"}
            </div>
            <input
              type="search"
              value={pickerQ}
              onChange={(e) => setPickerQ(e.target.value)}
              placeholder="Search…"
              className="input mb-3 w-full"
              autoFocus
            />
            <div className="max-h-72 overflow-y-auto">
              {(() => {
                const filtered = stockList
                  .filter((s) => !pickerOpen.dept || pickDept(s) === pickerOpen.dept)
                  .filter((s) => !pickerQ || s.name.toLowerCase().includes(pickerQ.toLowerCase()));
                if (filtered.length === 0) {
                  return <div className="p-6 text-center text-sm text-gray-400">No {pickerOpen.dept === "hardware" ? "hardware" : pickerOpen.dept === "cnc" ? "boards" : "materials"} match.</div>;
                }
                return filtered.map((s) => (
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
                ));
              })()}
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
        {saving ? "Saving…" : "Submit today's tally + notes"}
      </button>
      <p className="mt-2 text-center text-[11px] text-gray-500">
        Sends the assembly tally + notes. CNC and Hardware above are already saved.
      </p>
    </div>
  );
}

function Counter({
  label,
  value,
  onIncrement,
  onDecrement,
  onChange,
}: {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (value: number) => void;
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
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={`${label} quantity`}
          className={`h-11 w-16 rounded-lg border border-ink-200 bg-white text-center font-heading text-xl font-semibold tabular-nums outline-none focus:border-brand-orange ${
            value > 0 ? "text-brand-orange" : "text-ink-300"
          }`}
        />
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
