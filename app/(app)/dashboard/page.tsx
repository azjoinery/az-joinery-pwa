"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";
import { DailyEntry, EntryMaterial, Job } from "@/lib/types";
import Icon, { type IconName } from "@/lib/components/Icon";

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
        <div className="mt-1.5 text-xs font-normal text-white/60">{subtitle}</div>
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
   Executive / management overview  (UNCHANGED)
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

  const seesMoney =
    !!user && ["managing_director", "manager", "admin"].includes(user.role);

  useEffect(() => {
    let alive = true;
    api
      .get<PipelineSummary>("/pipeline/summary")
      .then((d) => {
        if (alive) { setSummary(d); setLoading(false); }
      })
      .catch(() => { if (alive) { setFailed(true); setLoading(false); } });

    api
      .get<unknown[]>("/stock/items?lowOnly=true&active=true")
      .then((r) => { if (alive) setLowStock(Array.isArray(r) ? r.length : 0); })
      .catch(() => {});

    if (seesMoney) {
      api
        .get<MoneySummary>("/accounts/dashboard")
        .then((d) => { if (alive) setMoney(d); })
        .catch(() => {});
    }
    return () => { alive = false; };
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

      <section className="mb-7">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon="jobs" label="Active jobs" value={totals?.activeJobs ?? null} href="/jobs" />
          <StatTile icon="inventory" label="Needs materials" value={totals?.officeJobs ?? null} href="/materials" />
          <StatTile icon="wrench" label="In queue" value={totals?.productionQueue ?? null} href="/queue" />
          <StatTile icon="alert" label="Overdue" value={totals?.overdue ?? null} href="/jobs" />
        </div>
      </section>

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

/* ---- Executive helpers ---- */

type PipelineStage = { key: string; label: string; href: string; color: string; owner: string; count: number };
type PipelineJob = { id: string; jobNum?: string; client?: string; stage?: string; dueDate?: string };
type PipelineSummary = {
  stages: PipelineStage[];
  totals: { activeJobs: number; overdue: number; officeJobs: number; officeLines: number; productionQueue: number };
  overdueJobs: PipelineJob[];
};
type MoneySummary = { outstanding: number; overdueInvoices: number; monthlyRevenue?: number };

const STAGE_COLORS: Record<string, string> = {
  in_design: "#FCD34D", released: "#FBBF24", awaiting_materials: "#EF4444",
  materials_ready: "#FB923C", in_production: "#F5822A",
  ready_to_deliver: "#84CC16", delivered: "#16A34A",
};
function stageColor(key: string) { return STAGE_COLORS[key] || "#F5822A"; }

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
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function execToday() {
  return new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
}
function execCurrency(n?: number) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}
function execStageLabel(key?: string) {
  const map: Record<string, string> = {
    in_design: "In Design", released: "Released", awaiting_materials: "Awaiting Materials",
    materials_ready: "Materials Ready", in_production: "In Production",
    ready_to_deliver: "Ready to Deliver", delivered: "Delivered",
  };
  return map[key || ""] || "In progress";
}

function FlowCard({ href, icon, title, main, mainLabel, detail }: {
  href: string; icon: IconName; title: string; main: string; mainLabel: string; detail: string;
}) {
  return (
    <Link href={href} className="card-interactive group card-pad block">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-orange/10 text-brand-orange-dark">
          <Icon name={icon} size={20} />
        </span>
        <Icon name="chevronRight" size={16} className="mt-1 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500" />
      </div>
      <h3 className="mt-4 text-base">{title}</h3>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-heading text-2xl font-semibold tabular tracking-tight text-ink-900">{main}</span>
        <span className="pb-1 text-xs font-medium text-ink-500">{mainLabel}</span>
      </div>
      <p className="mt-1 text-xs text-ink-500">{detail}</p>
    </Link>
  );
}

function StatTile({ icon, label, value, href }: { icon: IconName; label: string; value: number | null; href: string }) {
  return (
    <Link href={href} className="card-interactive group card-pad block">
      <div className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-100 text-ink-500 transition-colors group-hover:bg-brand-orange/10 group-hover:text-brand-orange">
          <Icon name={icon} size={18} />
        </span>
        <Icon name="chevronRight" size={16} className="text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500" />
      </div>
      <div className="mt-3 font-heading text-2xl font-semibold tabular tracking-tight text-ink-900">{value ?? "—"}</div>
      <div className="mt-0.5 text-xs font-medium text-ink-500">{label}</div>
    </Link>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link href={href} className="card-interactive flex flex-col items-center gap-2 px-2 py-4 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink-100 text-ink-600 transition-colors hover:bg-brand-orange/10">
        <Icon name={icon} size={20} />
      </span>
      <span className="text-xs font-medium text-ink-700">{label}</span>
    </Link>
  );
}

/* ==========================================================================
   Floor-worker daily log  (REDESIGNED — job-based, no Assigned/Record tabs)
   ========================================================================== */

interface StockPick {
  id: string;
  name: string;
  unit?: string;
  on_hand_qty?: number;
  stockType?: string;
  category?: string;
}

function pickDept(stk?: StockPick): "cnc" | "hardware" {
  const t = ((stk?.stockType || "") + " " + (stk?.category || "")).toLowerCase();
  if (
    t.includes("hardware") || t.includes("hinge") || t.includes("runner") ||
    t.includes("handle") || t.includes("screw") || t.includes("fastener") ||
    t.includes("drawer runner") || t.includes("knob") || t.includes("pull")
  ) return "hardware";
  return "cnc";
}

function FloorHeader({ name, total }: { name: string; total: number }) {
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long",
  });
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="mb-5 rounded-card bg-ink-950 px-5 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-orange">
        Today on the floor
      </p>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-white">
            {greeting}, {name}
          </h1>
          <p className="mt-0.5 truncate text-xs text-white/50">{today}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-heading text-3xl font-bold tabular tracking-tight text-brand-orange">{total}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">units today</p>
        </div>
      </div>
    </div>
  );
}

function FloorLogDashboard() {
  const { user } = useAuth();
  const isSupervisor = user?.role === "supervisor";

  /* ── state ── */
  // asmCounts: per-job assembly counts  { [jobId]: { cab_small: 0, ... } }
  const [asmCounts, setAsmCounts] = useState<Record<string, Record<string, number>>>({});
  // asmDone: per-job "assembly marked done"  { [jobId]: true }
  const [asmDone, setAsmDone] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(true);
  const [materials, setMaterials] = useState<EntryMaterial[]>([]);
  const [stockList, setStockList] = useState<StockPick[]>([]);
  const [jobList, setJobList] = useState<{
    id: string; jobNum?: string; client?: string; projectName?: string;
    assignedStaff?: string; status?: string; currentStatus?: string; dueDate?: string;
  }[]>([]);

  // Top-level job selector — drives CNC & Hardware display
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  // Assembly accordion
  const [asmOpen, setAsmOpen] = useState(false);
  const [assemblyJobId, setAssemblyJobId] = useState<string>("");

  // Supervisor add modal (stock picker + mandatory note)
  const [pickerOpen, setPickerOpen] = useState<null | { dept: "cnc" | "hardware" }>(null);
  const [pickerQ, setPickerQ] = useState("");
  const [supNote, setSupNote] = useState("");

  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved" | "error">("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const materialsRef = useRef(materials);
  useEffect(() => { materialsRef.current = materials; }, [materials]);

  const cabinetTypes = [
    { key: "cab_small",     label: "Small"     },
    { key: "cab_tall",      label: "Tall"      },
    { key: "cab_corner",    label: "Corner"    },
    { key: "cab_drawer",    label: "Drawer"    },
    { key: "cab_special",   label: "Special"   },
    { key: "cab_kickbase",  label: "Kickbase"  },
  ];

  /* ── load on mount ── */
  useEffect(() => {
    loadTodayEntry();
    api.get<StockPick[]>("/stock/items?active=true").then((r) => setStockList(r || [])).catch(() => {});
    api.get<any[]>("/jobs").then((rows) => {
      const list = rows || [];
      setJobList(list);
      // auto-select first active job
      const first = list.find((j) => {
        const s = `${j.status || ""} ${j.currentStatus || ""}`.toLowerCase();
        return /in_production|materials_ready|released/.test(s);
      });
      if (first) setSelectedJobId((prev) => prev || first.id);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadTodayEntry = async () => {
    try {
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      const data = await api.get<DailyEntry>(`/entries/mine?date=${today}`);
      if (data) {
        setAsmCounts((data as any).asmCounts || {});
        setAsmDone((data as any).asmDone || {});
        setNote(data.note || "");
        setMaterials(data.materials || []);
        setAssemblyJobId((data as any).assemblyJobId || "");
      }
    } catch { console.log("No entry yet for today"); }
  };

  /* ── material helpers ── */
  const bumpMaterial = (rowIdx: number, delta: 1 | -1) => {
    setMaterials((prev) => {
      const next = [...prev];
      const cur = next[rowIdx];
      if (!cur) return prev;
      next[rowIdx] = { ...cur, qty: Math.max(0, (cur.qty || 0) + delta) };
      return next;
    });
    scheduleSave();
  };

  const setMaterialQty = (rowIdx: number, value: number) => {
    setMaterials((prev) =>
      prev.map((row, i) => (i === rowIdx ? { ...row, qty: Math.max(0, value || 0) } : row))
    );
    scheduleSave();
  };

  const addFromCatalogue = (stockId: string) => {
    const noteVal = supNote.trim();
    const already = materials.findIndex(
      (m) => m.stockItemId === stockId && (m.jobId || "") === selectedJobId
    );
    if (already >= 0) {
      bumpMaterial(already, 1);
    } else {
      setMaterials((prev) => [
        ...prev,
        {
          stockItemId: stockId,
          jobId: selectedJobId,
          qty: 1,
          wastageQty: 0,
          assignedQty: 1,
          assignedByName: noteVal
            ? `Supervisor — ${noteVal}`
            : user?.name || "Supervisor",
        },
      ]);
      scheduleSave();
    }
    setPickerOpen(null);
    setPickerQ("");
    setSupNote("");
  };

  /* ── auto-save ── */
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
            return { ...m, jobNum: job?.jobNum || (m as any).jobNum || "" };
          });
        await api.post("/entries", {
          date: new Date().toISOString().split("T")[0],
          note, materials: rows,
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "" : s)), 1600);
      } catch { setSaveStatus("error"); }
    }, 500);
  };

  /* ── assembly counters (per-job) ── */
  const increment = (key: string) => {
    if (!assemblyJobId) return;
    setAsmCounts((prev) => ({
      ...prev,
      [assemblyJobId]: { ...(prev[assemblyJobId] || {}), [key]: ((prev[assemblyJobId]?.[key]) || 0) + 1 },
    }));
  };
  const decrement = (key: string) => {
    if (!assemblyJobId) return;
    setAsmCounts((prev) => ({
      ...prev,
      [assemblyJobId]: { ...(prev[assemblyJobId] || {}), [key]: Math.max(0, ((prev[assemblyJobId]?.[key]) || 0) - 1) },
    }));
  };
  const setCounterValue = (key: string, value: number) => {
    if (!assemblyJobId) return;
    setAsmCounts((prev) => ({
      ...prev,
      [assemblyJobId]: { ...(prev[assemblyJobId] || {}), [key]: Math.max(0, Math.round(value || 0)) },
    }));
  };

  /* ── submit ── */
  const submitLog = async () => {
    setSaving(true);
    setMessage("");
    try {
      const today = new Date().toISOString().split("T")[0];
      const cleanMaterials = materials
        .filter((m) => m.stockItemId && ((m.qty || 0) > 0 || (m.wastageQty || 0) > 0))
        .map((m) => {
          const job = jobList.find((j) => j.id === m.jobId);
          return { ...m, jobNum: job?.jobNum || (m as any).jobNum || "" };
        });
      await api.post("/entries", {
        date: today, note, materials: cleanMaterials, assemblyJobId,
        asmCounts, asmDone,
      });

      // Move done-assembly jobs to "ready_to_deliver" on the Kanban.
      // Two PATCHes per job:
      //   1. job status field  → "ready_to_deliver"
      //   2. production stage  → "Hardware Fitted"  (moves the Kanban card)
      const doneJobIds = Object.keys(asmDone).filter((id) => asmDone[id]);
      await Promise.allSettled(
        doneJobIds.flatMap((jobId) => [
          (api as any).patch(`/jobs/${jobId}`, {
            status: "ready_to_deliver",
            assembly_counts: asmCounts[jobId] || {},
            assembly_done: true,
          }),
          (api as any).patch(`/jobs/${jobId}/production-stage`, {
            stage: "Hardware Fitted",
          }),
        ])
      );

      setOk(true);
      setMessage(cleanMaterials.length > 0 ? "Daily log saved — stock updated." : "Daily log saved.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setOk(false);
      setMessage("Failed to save: " + (err.response?.data?.detail || "Server error"));
    } finally { setSaving(false); }
  };

  /* ── derived ── */
  const curJobCounts = asmCounts[assemblyJobId] || {};
  const assemblyTotal = Object.values(asmCounts).reduce(
    (total, jc) => total + Object.values(jc).reduce((a, b) => a + b, 0), 0
  );
  const firstName = user?.name?.split(" ")[0] ?? "";

  const cncRows = materials
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => pickDept(stockList.find((s) => s.id === m.stockItemId)) === "cnc" && (m.jobId || "") === selectedJobId);

  const hwRows = materials
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => pickDept(stockList.find((s) => s.id === m.stockItemId)) === "hardware" && (m.jobId || "") === selectedJobId);

  const selectedJob = jobList.find((j) => j.id === selectedJobId);
  const jobStatusStr = `${selectedJob?.status || ""} ${selectedJob?.currentStatus || ""}`.toLowerCase();
  const matStatus: "full" | "partial" | null = selectedJob
    ? /materials_ready|in_production/.test(jobStatusStr) ? "full"
      : /awaiting_materials/.test(jobStatusStr) ? "partial"
      : null
    : null;

  const asmSummary = assemblyJobId
    ? cabinetTypes.filter((t) => (curJobCounts[t.key] || 0) > 0)
        .map((t) => `${curJobCounts[t.key]} ${t.label}`).join(" · ") || "Tap to enter counts"
    : "Select a job to begin";

  return (
    <>
      <div className="page pb-32">
        <FloorHeader name={firstName} total={assemblyTotal} />

        {/* ── Job selector ── */}
        <div className="mb-3 rounded-card border border-ink-200 bg-white p-4">
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            Select job
          </label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="input w-full"
          >
            <option value="">— choose a job —</option>
            {jobList
              .filter((j) => !/completed|delivered|done/.test(`${j.status || ""} ${j.currentStatus || ""}`.toLowerCase()))
              .map((j) => (
                <option key={j.id} value={j.id}>
                  {[j.jobNum && `#${j.jobNum}`, j.client || j.projectName].filter(Boolean).join(" — ") || j.id}
                </option>
              ))}
          </select>
        </div>

        {/* ── Status banner ── */}
        {matStatus === "full" && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" fill="none" className="mt-0.5 shrink-0">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
            </svg>
            <div>
              <p className="text-xs font-bold text-green-700">Full materials ready</p>
              <p className="text-xs text-green-700/70">All CNC &amp; hardware loaded and available.</p>
            </div>
          </div>
        )}
        {matStatus === "partial" && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" fill="none" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            <div>
              <p className="text-xs font-bold text-amber-700">Partial materials — production can start</p>
              <p className="text-xs text-amber-700/70">Some items pending PO · you&apos;ll be notified when they arrive.</p>
            </div>
          </div>
        )}

        {/* ── Materials live indicator ── */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
            Materials — live
          </span>
          {saveStatus ? (
            <span className="text-xs font-semibold" style={{ color: saveStatus === "error" ? "#b91c1c" : "#059669" }}>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save failed — try again"}
            </span>
          ) : (
            <span className="text-[11px] text-ink-400">Auto-saves on every tap</span>
          )}
        </div>

        {/* ── CNC boards ── */}
        <section className="mb-6">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="section-title">CNC boards</h2>
              <p className="mt-0.5 text-xs text-ink-400">Loaded at release · each tap records 1 sheet used.</p>
            </div>
            {isSupervisor && selectedJobId && (
              <button
                type="button"
                onClick={() => { setPickerOpen({ dept: "cnc" }); setPickerQ(""); setSupNote(""); }}
                className="shrink-0 text-xs font-bold text-brand-orange"
              >
                + Add
              </button>
            )}
          </div>
          {cncRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-200 p-5 text-center text-sm text-ink-400">
              {selectedJobId ? "No boards loaded for this job yet." : "Select a job above."}
            </div>
          ) : (
            <div className="space-y-2">
              {cncRows.map(({ m, i }) => {
                const stk = stockList.find((s) => s.id === m.stockItemId);
                const low = stk && typeof stk.on_hand_qty === "number" && stk.on_hand_qty <= 3;
                return (
                  <MaterialRow
                    key={`cnc${i}`}
                    name={stk?.name || "Material"}
                    detail={[stk?.unit, typeof stk?.on_hand_qty === "number" ? `${stk.on_hand_qty} on hand` : null].filter(Boolean).join(" · ")}
                    low={!!low}
                    assignedQty={m.assignedQty}
                    assignedByName={m.assignedByName}
                    unit={stk?.unit}
                    qty={m.qty || 0}
                    onMinus={() => bumpMaterial(i, -1)}
                    onPlus={() => bumpMaterial(i, 1)}
                    onQtyChange={(v) => setMaterialQty(i, v)}
                    showAssigned
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* ── Hardware fitted ── */}
        <section className="mb-6">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="section-title">Hardware fitted</h2>
              <p className="mt-0.5 text-xs text-ink-400">Hinges, runners, handles — each tap deducts stock.</p>
            </div>
            {isSupervisor && selectedJobId && (
              <button
                type="button"
                onClick={() => { setPickerOpen({ dept: "hardware" }); setPickerQ(""); setSupNote(""); }}
                className="shrink-0 text-xs font-bold text-brand-orange"
              >
                + Add
              </button>
            )}
          </div>
          {hwRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-200 p-5 text-center text-sm text-ink-400">
              {selectedJobId ? "No hardware loaded for this job yet." : "Select a job above."}
            </div>
          ) : (
            <div className="space-y-2">
              {hwRows.map(({ m, i }) => {
                const stk = stockList.find((s) => s.id === m.stockItemId);
                const low = stk && typeof stk.on_hand_qty === "number" && stk.on_hand_qty <= 3;
                return (
                  <MaterialRow
                    key={`hw${i}`}
                    name={stk?.name || "Material"}
                    detail={[stk?.unit, typeof stk?.on_hand_qty === "number" ? `${stk.on_hand_qty} on hand` : null].filter(Boolean).join(" · ")}
                    low={!!low}
                    assignedQty={m.assignedQty}
                    assignedByName={m.assignedByName}
                    unit={stk?.unit}
                    qty={m.qty || 0}
                    onMinus={() => bumpMaterial(i, -1)}
                    onPlus={() => bumpMaterial(i, 1)}
                    onQtyChange={(v) => setMaterialQty(i, v)}
                    showAssigned
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* ── Assembly accordion ── */}
        <section className="mb-6">
          <div className="overflow-hidden rounded-card border border-ink-200 bg-white">
            {/* Toggle header */}
            <button
              type="button"
              onClick={() => setAsmOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0">
                  <h2 className="section-title">Assembly</h2>
                  <p className="mt-0.5 truncate text-xs text-ink-400">{asmSummary}</p>
                </div>
                {asmDone[assemblyJobId] ? (
                  <span className="shrink-0 rounded-md border border-green-300 bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                    Done
                  </span>
                ) : (
                  <span className="shrink-0 rounded-md border border-ink-200 bg-ink-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                    Draft
                  </span>
                )}
              </div>
              <svg
                width="18" height="18" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"
                className={`shrink-0 text-ink-400 transition-transform duration-200 ${asmOpen ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Body */}
            {asmOpen && (
              <div className="border-t border-ink-200 px-4 pb-4 pt-4">
                {/* Job selector */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-semibold text-ink-500">
                    Job (for invoicing + installer payment)
                  </label>
                  <select
                    value={assemblyJobId}
                    onChange={(e) => setAssemblyJobId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">— general / no specific job —</option>
                    {jobList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {[j.jobNum && `#${j.jobNum}`, j.client || j.projectName].filter(Boolean).join(" — ") || j.id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6 cabinet type rows — same style as MaterialRow */}
                {!assemblyJobId ? (
                  <div className="mb-4 rounded-xl border border-dashed border-ink-200 p-5 text-center text-sm text-ink-400">
                    Select a job above to enter counts.
                  </div>
                ) : (
                <div className="mb-4 space-y-2">
                  {cabinetTypes.map((type) => (
                    <div
                      key={type.key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink-900">{type.label}</div>
                        <div className="text-xs text-ink-500">Cabinet count · no stock impact</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-xl bg-ink-100 p-1">
                        <button
                          type="button"
                          onClick={() => decrement(type.key)}
                          disabled={(curJobCounts[type.key] || 0) <= 0}
                          aria-label={`Decrease ${type.label}`}
                          className="grid h-12 w-12 place-items-center rounded-lg bg-white text-2xl font-bold text-ink-700 shadow-sm disabled:opacity-30 active:scale-95"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={curJobCounts[type.key] || 0}
                          onChange={(e) => setCounterValue(type.key, Number(e.target.value))}
                          className="h-12 w-14 rounded-lg border border-ink-200 bg-white text-center font-heading text-lg font-bold tabular-nums text-ink-900 outline-none focus:border-brand-orange"
                        />
                        <button
                          type="button"
                          onClick={() => increment(type.key)}
                          aria-label={`Increase ${type.label}`}
                          className="grid h-12 w-12 place-items-center rounded-lg bg-brand-orange text-white text-2xl font-bold shadow-sm active:scale-95 active:bg-brand-orange-dark"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                )}

                {/* Done tick */}
                <button
                  type="button"
                  disabled={!assemblyJobId}
                  onClick={() => {
                    if (!assemblyJobId) return;
                    setAsmDone((prev) => ({ ...prev, [assemblyJobId]: !prev[assemblyJobId] }));
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors active:scale-[0.98] disabled:opacity-40 ${
                    asmDone[assemblyJobId] ? "border-green-300 bg-green-50" : "border-ink-200 bg-white"
                  }`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                    asmDone[assemblyJobId] ? "border-green-500 bg-green-500" : "border-ink-300 bg-white"
                  }`}>
                    {asmDone[assemblyJobId] && (
                      <svg width="12" height="12" viewBox="0 0 24 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${asmDone[assemblyJobId] ? "text-green-700" : "text-ink-700"}`}>
                      {asmDone[assemblyJobId] ? "Assembly marked as done ✓" : "Mark assembly as done"}
                    </p>
                    <p className="text-xs text-ink-400">
                      Confirms all cabinets built — used for installer payment &amp; invoicing
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Notes ── */}
        <section className="mb-6">
          <div className="field">
            <label htmlFor="note" className="label">Notes</label>
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
      </div>

      {/* ── Fixed submit bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-100 bg-white/95 px-4 pb-6 pt-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="shrink-0 rounded-xl border border-ink-200 bg-ink-50 px-4 py-2 text-center">
            <p className="font-heading text-xl font-bold tabular tracking-tight text-ink-900">{assemblyTotal}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">built</p>
          </div>
          <button
            onClick={submitLog}
            disabled={saving}
            className="btn-primary flex-1"
            style={{ minHeight: "3rem" }}
          >
            <Icon name="uploads" size={18} />
            {saving ? "Saving…" : "Submit log"}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-400">
          CNC &amp; Hardware auto-save on every tap · Assembly saves on Submit
        </p>
      </div>

      {/* ── Supervisor add modal (stock picker + mandatory note) ── */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setPickerOpen(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-200 sm:hidden" />
            <div className="mb-1 text-base font-semibold text-ink-900">
              Add {pickerOpen.dept === "hardware" ? "hardware" : "CNC board"} — Supervisor
            </div>
            <p className="mb-3 text-xs text-ink-500">
              A note is required when adding items after job release.
            </p>
            <textarea
              value={supNote}
              onChange={(e) => setSupNote(e.target.value)}
              placeholder="Reason for adding (required)…"
              className="input mb-3 w-full resize-none"
              rows={2}
              autoFocus
            />
            <input
              type="search"
              value={pickerQ}
              onChange={(e) => setPickerQ(e.target.value)}
              placeholder="Search stock…"
              className="input mb-3 w-full"
            />
            <div className="max-h-52 overflow-y-auto">
              {(() => {
                const filtered = stockList
                  .filter((s) => pickDept(s) === pickerOpen.dept)
                  .filter((s) => !pickerQ || s.name.toLowerCase().includes(pickerQ.toLowerCase()));
                if (filtered.length === 0) {
                  return (
                    <div className="p-4 text-center text-sm text-ink-400">
                      No {pickerOpen.dept === "hardware" ? "hardware" : "boards"} match.
                    </div>
                  );
                }
                return filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addFromCatalogue(s.id)}
                    disabled={!supNote.trim()}
                    className="mb-2 flex w-full items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-3 text-left hover:border-ink-300 disabled:opacity-40"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink-900">{s.name}</div>
                      <div className="truncate text-xs text-ink-500">
                        {[s.unit, typeof s.on_hand_qty === "number" ? `${s.on_hand_qty} on hand` : null].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span className="text-lg font-bold text-ink-400">+</span>
                  </button>
                ));
              })()}
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(null)}
              className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-ink-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ==========================================================================
   Shared sub-components
   ========================================================================== */

function MaterialRow({
  name, detail, low, assignedQty, assignedByName, unit,
  qty, onMinus, onPlus, onQtyChange, showAssigned,
}: {
  name: string; detail: string; low: boolean;
  assignedQty?: number; assignedByName?: string; unit?: string;
  qty: number; onMinus: () => void; onPlus: () => void;
  onQtyChange: (v: number) => void; showAssigned: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink-900">{name}</div>
        <div className="truncate text-xs text-ink-500">
          {detail}
          {low && <span className="ml-1 font-semibold text-red-600"> · low stock</span>}
        </div>
        {showAssigned && ((assignedQty || 0) > 0 || assignedByName) && (
          <div className="mt-1 text-[11px] font-medium text-brand-orange-dark">
            {(assignedQty || 0) > 0 ? `Target: ${assignedQty} ${unit || ""}` : ""}
            {assignedByName
              ? `${(assignedQty || 0) > 0 ? " · " : ""}by ${assignedByName}`
              : ""}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-xl bg-ink-100 p-1">
        <button
          type="button"
          onClick={onMinus}
          disabled={qty <= 0}
          aria-label="one less"
          className="grid h-12 w-12 place-items-center rounded-lg bg-white text-2xl font-bold text-ink-700 shadow-sm disabled:opacity-30 active:scale-95"
        >
          −
        </button>
        <input
          type="number"
          min="0"
          step="1"
          value={qty}
          onChange={(e) => onQtyChange(Number(e.target.value))}
          className="h-12 w-14 rounded-lg border border-ink-200 bg-white text-center font-heading text-lg font-bold tabular-nums text-ink-900 outline-none focus:border-brand-orange"
        />
        <button
          type="button"
          onClick={onPlus}
          aria-label="one more"
          className="grid h-12 w-12 place-items-center rounded-lg bg-brand-orange text-white text-2xl font-bold shadow-sm active:scale-95 active:bg-brand-orange-dark"
        >
          +
        </button>
      </div>
    </div>
  );
}
