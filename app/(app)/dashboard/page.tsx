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

const DRAFTER_ROLES = new Set(["drafter", "design"]);

export default function DashboardPage() {
  const { user } = useAuth();
  if (user && EXECUTIVE_ROLES.has(user.role)) {
    return <ExecutiveOverview />;
  }
  if (user && DRAFTER_ROLES.has(user.role)) {
    return <DrafterDashboard />;
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
          <StatTile icon="wrench" label="In queue" value={totals?.productionQueue ?? null} href="/queue" />
          <StatTile icon="alert" label="Overdue" value={totals?.overdue ?? null} href="/jobs" />
        </div>
      </section>

      {/* Needs attention */}
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

      {/* Job pipeline */}
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

      {/* Quick actions */}
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

/* ---- Executive dashboard data + helpers ---- */

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

const STAGE_COLORS: Record<string, string> = {
  in_design: "#FCD34D",
  released: "#FBBF24",
  awaiting_materials: "#EF4444",
  materials_ready: "#FB923C",
  in_production: "#F5822A",
  ready_to_deliver: "#84CC16",
  delivered: "#16A34A",
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
   Drafter / Design dashboard
   ========================================================================== */

function DrafterHeader({ name, jobCount }: { name: string; jobCount?: number }) {
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="mb-6 rounded-card bg-ink-950 px-5 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-orange">
        Design &amp; Drafting
      </p>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-white">
            {greeting}, {name}
          </h1>
          <p className="mt-0.5 text-xs text-white/50">{today}</p>
        </div>
        {jobCount != null && (
          <div className="shrink-0 text-right">
            <p className="font-heading text-3xl font-bold tabular tracking-tight text-brand-orange">
              {jobCount}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
              jobs assigned
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Drafter job-view helpers ---- */

interface DrafterJobView {
  id: string;
  jobNum?: string;
  client?: string;
  projectName?: string;
  stage?: string;
  brief_status?: "pending" | "uploaded" | "checked";
  variation_count?: number;
}

function drafterStageMeta(stage?: string): { label: string; className: string } {
  const s = (stage || "").toLowerCase();
  if (s.includes("design") || s.includes("drawing") || s === "in_design")
    return { label: "Drawing", className: "bg-blue-100 text-blue-700" };
  if (s.includes("production") || s === "in_production")
    return { label: "Production", className: "bg-orange-100 text-brand-orange-dark" };
  if (s.includes("complete") || s.includes("delivered"))
    return { label: "Complete", className: "bg-ink-100 text-ink-400" };
  if (s.includes("confirm"))
    return { label: "Confirmed", className: "bg-ink-200 text-ink-600" };
  if (s.includes("released"))
    return { label: "Released", className: "bg-yellow-100 text-yellow-700" };
  return { label: stage || "Active", className: "bg-ink-100 text-ink-600" };
}

function DrafterDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<DrafterJobView[]>([]);
  const [loading, setLoading] = useState(true);
  const firstName = user?.name?.split(" ")[0] || "there";

  useEffect(() => {
    let alive = true;
    api
      .get<DrafterJobView[]>("/jobs")
      .then((data) => {
        if (alive) {
          setJobs(data || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const activeJobs = jobs.filter(
    (j) => !["complete", "delivered", "completed"].includes((j.stage || "").toLowerCase())
  );
  const completeJobs = jobs.filter(
    (j) => ["complete", "delivered", "completed"].includes((j.stage || "").toLowerCase())
  );
  const displayJobs = [...activeJobs, ...completeJobs].slice(0, 10);

  return (
    <div className="page pb-28">
      <DrafterHeader name={firstName} jobCount={loading ? undefined : jobs.length} />

      <section>
        <SectionHeading
          action={
            <Link href="/jobs" className="text-xs font-medium text-brand-orange">
              View all
            </Link>
          }
        >
          My jobs
        </SectionHeading>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-ink-100" />
            ))}
          </div>
        ) : displayJobs.length === 0 ? (
          <div className="rounded-card border border-ink-200 p-6 text-center text-sm text-ink-400">
            No jobs assigned yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayJobs.map((j) => {
              const stageMeta = drafterStageMeta(j.stage);
              const isComplete = ["complete", "delivered", "completed"].includes(
                (j.stage || "").toLowerCase()
              );
              const briefOk =
                j.brief_status === "checked" || j.brief_status === "uploaded";
              const hasVariation = (j.variation_count || 0) > 0;
              const title = j.projectName || j.client || "Unnamed job";
              const jobLabel = j.jobNum ? `#${j.jobNum}` : `#${j.id.slice(0, 6)}`;

              return (
                <Link
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className={`card-interactive flex items-center justify-between gap-3 p-4 ${
                    isComplete ? "opacity-60" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-ink-400">{jobLabel}</span>
                      <span className="text-[11px] text-ink-300">·</span>
                      <span className="truncate text-sm font-semibold text-ink-900">{title}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${stageMeta.className}`}
                      >
                        {stageMeta.label}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          briefOk
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {j.brief_status === "checked"
                          ? "✓ checked"
                          : j.brief_status === "uploaded"
                          ? "✓ uploaded"
                          : "pending brief"}
                      </span>
                      {hasVariation && (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                          {j.variation_count} variation{j.variation_count === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>
                  <Icon name="chevronRight" size={16} className="shrink-0 text-ink-300" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ==========================================================================
   Floor-worker daily log
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

// ─── Floor header — replaces WorkshopHero for workers, loads instantly ─────────

function FloorHeader({ name, total }: { name: string; total: number }) {
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="mb-6 rounded-card bg-ink-950 px-5 py-5">
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
          <p className="font-heading text-3xl font-bold tabular tracking-tight text-brand-orange">
            {total}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
            units today
          </p>
        </div>
      </div>
    </div>
  );
}

function FloorLogDashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(true);

  const [materials, setMaterials] = useState<EntryMaterial[]>([]);
  const [stockList, setStockList] = useState<StockPick[]>([]);
  const [jobList, setJobList] = useState<{
    id: string;
    jobNum?: string;
    client?: string;
    projectName?: string;
    assignedStaff?: string;
    status?: string;
    currentStatus?: string;
    dueDate?: string;
  }[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, { progress: number; stage: string }>>({});

  const [matsTab, setMatsTab] = useState<"assigned" | "record">("record");
  const [recordJobId, setRecordJobId] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState<null | {
    target: "assigned" | "record";
    jobId?: string;
    dept?: "cnc" | "hardware";
  }>(null);
  const [pickerQ, setPickerQ] = useState("");
  const [assemblyJobId, setAssemblyJobId] = useState<string>("");
  const [assemblyDone, setAssemblyDone] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved" | "error">("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const materialsRef = useRef(materials);
  useEffect(() => {
    materialsRef.current = materials;
  }, [materials]);

  const cabinetTypes = [
    { key: "cab_small",     label: "Small"    },
    { key: "cab_tall",      label: "Tall"     },
    { key: "cab_corner",    label: "Corner"   },
    { key: "cab_drawer",    label: "Drawer"   },
    { key: "cab_special",   label: "Special"  },
    { key: "cab_kickbase",  label: "Kickbase" },
  ];

  useEffect(() => {
    loadTodayEntry();
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
        setAssemblyJobId((data as any).assemblyJobId || "");
        setAssemblyDone(!!(data as any).assemblyDone);
      }
    } catch {
      console.log("No entry yet for today");
    }
  };

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
      prev.map((row, index) =>
        index === rowIdx ? { ...row, qty: Math.max(0, value || 0) } : row
      )
    );
    scheduleSave();
  };

  const addMaterialFromCatalogue = (matId: string) => {
    const jobId = pickerOpen?.jobId || (pickerOpen?.target === "record" ? recordJobId : "");
    const already = materials.findIndex(
      (m) => m.stockItemId === matId && (m.jobId || "") === jobId
    );
    if (already >= 0) {
      bumpMaterial(already, 1);
    } else {
      setMaterials((prev) => [
        ...prev,
        { stockItemId: matId, jobId, qty: 1, wastageQty: 0 },
      ]);
      scheduleSave();
    }
    setPickerOpen(null);
    setPickerQ("");
  };

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
        await api.post("/entries", { date: today, counts, note, materials: rows, assemblyJobId, assemblyDone });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "" : s)), 1600);
      } catch {
        setSaveStatus("error");
      }
    }, 500);
  };

  const increment = (key: string) =>
    setCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));

  const decrement = (key: string) =>
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - 1) }));

  const setCounterValue = (key: string, value: number) =>
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, Math.round(value || 0)) }));

  const submitLog = async () => {
    setSaving(true);
    setMessage("");
    try {
      const today = new Date().toISOString().split("T")[0];
      const cleanMaterials = materials
        .filter((m) => m.stockItemId && ((m.qty || 0) > 0 || (m.wastageQty || 0) > 0))
        .map((m) => {
          const job = jobList.find((j) => j.id === m.jobId);
          return { ...m, jobNum: job?.jobNum || m.jobNum || "" };
        });
      await api.post("/entries", { date: today, counts, note, materials: cleanMaterials, assemblyJobId, assemblyDone });
      setOk(true);
      setMessage(
        cleanMaterials.length > 0 ? "Daily log saved — stock updated." : "Daily log saved."
      );
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setOk(false);
      setMessage("Failed to save: " + (err.response?.data?.detail || "Server error"));
    } finally {
      setSaving(false);
    }
  };

  // Total units tapped today (assembly only — materials are tracked separately)
  const assemblyTotal = Object.values(counts).reduce((a, b) => a + b, 0);

  const firstName = user?.name?.split(" ")[0] ?? "";

  const floorJobs = jobList.filter((job) => {
    const status = `${job.status || ""} ${job.currentStatus || ""}`.toLowerCase();
    if (/completed|delivered|done/.test(status)) return false;
    if (user?.role === "supervisor") return true;
    return job.assignedStaff === user?.id || job.assignedStaff === user?.name;
  });

  return (
    <>
      {/* Extra bottom padding for the fixed submit bar */}
      <div className="page pb-32">

        {/* Compact header — loads instantly, no photo */}
        <FloorHeader name={firstName} total={assemblyTotal} />

        {/* ── Build queue ── */}
        {floorJobs.length > 0 && (
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">Your build queue</h2>
              <span className="rounded-md border border-ink-200 bg-ink-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                {floorJobs.length} job{floorJobs.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-3">
              {floorJobs.map((job) => {
                const prog = progressMap[job.id];
                const pct = prog?.progress ?? 0;
                const isDone = pct >= 100;
                const isBuilding = pct > 0 && !isDone;
                const barColor = isDone ? "#16a34a" : isBuilding ? "#F5822A" : "#d1d5db";
                return (
                  <a
                    key={job.id}
                    href="/queue"
                    className="block rounded-xl border border-ink-200 bg-white p-4 active:bg-ink-50"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink-900">
                          {[job.jobNum && `#${job.jobNum}`, job.client || job.projectName || "Job"]
                            .filter(Boolean)
                            .join(" — ")}
                        </div>
                        {job.dueDate && (
                          <div className="mt-0.5 text-xs text-ink-400">
                            Due{" "}
                            {new Date(job.dueDate).toLocaleDateString("en-AU", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        )}
                      </div>
                      <span
                        className="shrink-0 font-heading text-sm font-bold tabular-nums"
                        style={{ color: isDone ? "#16a34a" : isBuilding ? "#F5822A" : "#9ca3af" }}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, pct)}%`, background: barColor }}
                      />
                    </div>
                    {prog?.stage && (
                      <div className="mt-1 text-[10px] font-medium capitalize text-ink-400">
                        {prog.stage === "done"
                          ? "✓ Built"
                          : `Building — ${prog.stage.replace(/_/g, " ")}`}
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
            <a
              href="/queue"
              className="mt-3 block text-center text-xs font-semibold text-brand-orange"
            >
              Full build queue →
            </a>
          </section>
        )}

        {/* ── Materials — Live (CNC + Hardware) ── */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
            Materials — live
          </span>
          {saveStatus ? (
            <span
              className="text-xs font-semibold"
              style={{ color: saveStatus === "error" ? "#b91c1c" : "#059669" }}
            >
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "saved"
                ? "Saved ✓"
                : "Save failed — try again"}
            </span>
          ) : (
            <span className="text-[11px] text-ink-400">Auto-saves on every tap</span>
          )}
        </div>

        {/* Assigned / Record tab */}
        <div className="mb-4 flex gap-1 rounded-xl bg-ink-100 p-1">
          <button
            type="button"
            onClick={() => setMatsTab("assigned")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              matsTab === "assigned"
                ? "bg-white text-ink-900 shadow-sm"
                : "text-ink-500"
            }`}
          >
            Assigned
          </button>
          <button
            type="button"
            onClick={() => setMatsTab("record")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              matsTab === "record"
                ? "bg-white text-ink-900 shadow-sm"
                : "text-ink-500"
            }`}
          >
            Record
          </button>
        </div>

        {matsTab === "record" && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-ink-500">
              Job (optional)
            </label>
            <select
              value={recordJobId}
              onChange={(e) => setRecordJobId(e.target.value)}
              className="input w-full"
            >
              <option value="">— no job (general workshop use) —</option>
              {jobList.map((j) => (
                <option key={j.id} value={j.id}>
                  {[j.jobNum, j.client || j.projectName].filter(Boolean).join(" — ") || j.id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* CNC boards */}
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
              <div className="mb-3">
                <h2 className="section-title">CNC boards</h2>
                <p className="mt-0.5 text-xs text-ink-400">
                  Each tap = 1 sheet off the shelf.
                </p>
              </div>
              {rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink-200 p-5 text-center text-sm text-ink-400">
                  {matsTab === "assigned"
                    ? "No boards assigned to you today."
                    : "No boards yet."}
                </div>
              ) : (
                <div className="space-y-2">
                  {rows.map(({ m, i }) => {
                    const stk = stockList.find((s) => s.id === m.stockItemId);
                    const job = jobList.find((j) => j.id === m.jobId);
                    const low =
                      stk &&
                      typeof stk.on_hand_qty === "number" &&
                      stk.on_hand_qty <= 3;
                    return (
                      <MaterialRow
                        key={`cnc${i}`}
                        name={stk?.name || "Material"}
                        detail={
                          matsTab === "assigned" && job
                            ? [job.jobNum, job.client || job.projectName]
                                .filter(Boolean)
                                .join(" · ")
                            : [
                                stk?.unit,
                                typeof stk?.on_hand_qty === "number"
                                  ? `${stk.on_hand_qty} on hand`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")
                        }
                        low={!!low}
                        assignedQty={m.assignedQty}
                        assignedByName={m.assignedByName}
                        unit={stk?.unit}
                        qty={m.qty || 0}
                        onMinus={() => bumpMaterial(i, -1)}
                        onPlus={() => bumpMaterial(i, 1)}
                        onQtyChange={(v) => setMaterialQty(i, v)}
                        showAssigned={matsTab === "assigned"}
                      />
                    );
                  })}
                </div>
              )}
              {matsTab === "record" && (
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen({ target: "record", dept: "cnc" });
                    setPickerQ("");
                  }}
                  className="mt-3 w-full rounded-xl border border-ink-200 bg-white py-3.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  + Add board from stock
                </button>
              )}
            </section>
          );
        })()}

        {/* Hardware fitted */}
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
              <div className="mb-3">
                <h2 className="section-title">Hardware fitted</h2>
                <p className="mt-0.5 text-xs text-ink-400">
                  Hinges, runners, handles — each tap deducts stock.
                </p>
              </div>
              {rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink-200 p-5 text-center text-sm text-ink-400">
                  {matsTab === "assigned"
                    ? "No hardware assigned to you today."
                    : "No hardware yet."}
                </div>
              ) : (
                <div className="space-y-2">
                  {rows.map(({ m, i }) => {
                    const stk = stockList.find((s) => s.id === m.stockItemId);
                    const job = jobList.find((j) => j.id === m.jobId);
                    const low =
                      stk &&
                      typeof stk.on_hand_qty === "number" &&
                      stk.on_hand_qty <= 3;
                    return (
                      <MaterialRow
                        key={`hw${i}`}
                        name={stk?.name || "Material"}
                        detail={
                          matsTab === "assigned" && job
                            ? [job.jobNum, job.client || job.projectName]
                                .filter(Boolean)
                                .join(" · ")
                            : [
                                stk?.unit,
                                typeof stk?.on_hand_qty === "number"
                                  ? `${stk.on_hand_qty} on hand`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")
                        }
                        low={!!low}
                        assignedQty={m.assignedQty}
                        assignedByName={m.assignedByName}
                        unit={stk?.unit}
                        qty={m.qty || 0}
                        onMinus={() => bumpMaterial(i, -1)}
                        onPlus={() => bumpMaterial(i, 1)}
                        onQtyChange={(v) => setMaterialQty(i, v)}
                        showAssigned={matsTab === "assigned"}
                      />
                    );
                  })}
                </div>
              )}
              {matsTab === "record" && (
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen({ target: "record", dept: "hardware" });
                    setPickerQ("");
                  }}
                  className="mt-3 w-full rounded-xl border border-ink-200 bg-white py-3.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  + Add hardware from stock
                </button>
              )}
            </section>
          );
        })()}

        {/* ── Assembly in materials view — summary card ── */}
        {(() => {
          const jobKey = recordJobId || "";
          const hasAny = Object.values(counts).some((v) => v > 0);
          const jobMatch =
            matsTab === "assigned"
              ? hasAny && !!assemblyJobId
              : hasAny && assemblyJobId === jobKey;
          if (!jobMatch) return null;
          const aJob = jobList.find((j) => j.id === assemblyJobId);
          const aTotal = Object.values(counts).reduce((a, b) => a + b, 0);
          return (
            <section className="mb-6">
              <div className="mb-3">
                <h2 className="section-title">Assembly — this job</h2>
                <p className="mt-0.5 text-xs text-ink-400">
                  {aJob
                    ? [aJob.jobNum && `#${aJob.jobNum}`, aJob.client || aJob.projectName]
                        .filter(Boolean)
                        .join(" · ")
                    : "General workshop"}
                </p>
              </div>
              <div className="rounded-xl border border-ink-200 bg-white p-4">
                <div className="grid grid-cols-3 gap-x-6 gap-y-2.5">
                  {cabinetTypes
                    .filter((t) => (counts[t.key] || 0) > 0)
                    .map((t) => (
                      <div key={t.key} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-ink-500">{t.label}</span>
                        <span className="font-heading text-sm font-bold tabular-nums text-brand-orange">
                          {counts[t.key]}
                        </span>
                      </div>
                    ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
                  <span className="text-xs font-semibold text-ink-500">Total units</span>
                  <span className="font-heading text-base font-bold tabular-nums text-ink-900">
                    {aTotal}
                  </span>
                </div>
                {assemblyDone && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-green-700">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Assembly complete
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* ── Assembly — job selector + 3×2 grid + done tick ── */}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="section-title">Assembly</h2>
              <p className="mt-0.5 text-xs text-ink-400">
                Cabinets built today — no stock impact.
              </p>
            </div>
            {assemblyDone ? (
              <span className="rounded-md border border-green-300 bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                Done
              </span>
            ) : (
              <span className="rounded-md border border-ink-200 bg-ink-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                Draft
              </span>
            )}
          </div>

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
                  {[j.jobNum && `#${j.jobNum}`, j.client || j.projectName]
                    .filter(Boolean)
                    .join(" — ") || j.id}
                </option>
              ))}
            </select>
          </div>

          {/* 3×2 counter grid */}
          <div className="grid grid-cols-2 gap-3">
            {cabinetTypes.map((type) => (
              <Counter
                key={type.key}
                label={type.label}
                value={counts[type.key] || 0}
                onIncrement={() => increment(type.key)}
                onDecrement={() => decrement(type.key)}
                onChange={(v) => setCounterValue(type.key, v)}
              />
            ))}
          </div>

          {/* Done tick — manual confirmation once assembly is finished */}
          <button
            type="button"
            onClick={() => setAssemblyDone((v) => !v)}
            className={`mt-4 flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors active:scale-[0.98] ${
              assemblyDone
                ? "border-green-300 bg-green-50"
                : "border-ink-200 bg-white"
            }`}
          >
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                assemblyDone
                  ? "border-green-500 bg-green-500"
                  : "border-ink-300 bg-white"
              }`}
            >
              {assemblyDone && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </span>
            <div>
              <p
                className={`text-sm font-semibold ${
                  assemblyDone ? "text-green-700" : "text-ink-700"
                }`}
              >
                {assemblyDone
                  ? "Assembly marked as done ✓"
                  : "Mark assembly as done"}
              </p>
              <p className="text-xs text-ink-400">
                Confirms all cabinets built — used for installer payment &amp; invoicing
              </p>
            </div>
          </button>
        </section>

        {/* Notes */}
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
          <div
            className={ok ? "alert-success mb-4" : "alert-danger mb-4"}
            role="status"
          >
            <Icon name={ok ? "check" : "alert"} size={17} className="mt-px" />
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* ── Fixed submit bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-100 bg-white/95 px-4 pb-6 pt-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {/* Running tally */}
          <div className="shrink-0 rounded-xl border border-ink-200 bg-ink-50 px-4 py-2 text-center">
            <p className="font-heading text-xl font-bold tabular tracking-tight text-ink-900">
              {assemblyTotal}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">
              built
            </p>
          </div>
          <button
            onClick={submitLog}
            disabled={saving}
            className="btn-primary flex-1"
            style={{ minHeight: "3rem" }}
          >
            <Icon name="uploads" size={18} />
            {saving ? "Saving…" : "Submit assembly + notes"}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-400">
          CNC and Hardware above are already saved on each tap.
        </p>
      </div>

      {/* Material picker modal */}
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
            <div className="mb-2 text-base font-semibold text-ink-900">
              {pickerOpen.dept === "hardware"
                ? "Pick hardware"
                : pickerOpen.dept === "cnc"
                ? "Pick a board"
                : "Pick a material"}
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
                  .filter(
                    (s) =>
                      !pickerQ ||
                      s.name.toLowerCase().includes(pickerQ.toLowerCase())
                  );
                if (filtered.length === 0) {
                  return (
                    <div className="p-6 text-center text-sm text-ink-400">
                      No{" "}
                      {pickerOpen.dept === "hardware"
                        ? "hardware"
                        : pickerOpen.dept === "cnc"
                        ? "boards"
                        : "materials"}{" "}
                      match.
                    </div>
                  );
                }
                return filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addMaterialFromCatalogue(s.id)}
                    className="mb-2 flex w-full items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-3 text-left hover:border-ink-300"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink-900">
                        {s.name}
                      </div>
                      <div className="truncate text-xs text-ink-500">
                        {[
                          s.unit,
                          typeof s.on_hand_qty === "number"
                            ? `${s.on_hand_qty} on hand`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
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

// ─── Material row — extracted from the two IIFE sections ──────────────────────

function MaterialRow({
  name,
  detail,
  low,
  assignedQty,
  assignedByName,
  unit,
  qty,
  onMinus,
  onPlus,
  onQtyChange,
  showAssigned,
}: {
  name: string;
  detail: string;
  low: boolean;
  assignedQty?: number;
  assignedByName?: string;
  unit?: string;
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
  onQtyChange: (v: number) => void;
  showAssigned: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink-900">{name}</div>
        <div className="truncate text-xs text-ink-500">
          {detail}
          {low && (
            <span className="ml-1 font-semibold text-red-600"> · low stock</span>
          )}
        </div>
        {showAssigned && (assignedQty || 0) > 0 && (
          <div className="mt-1 text-[11px] font-medium text-brand-orange-dark">
            Target: {assignedQty} {unit || ""}
            {assignedByName ? ` · by ${assignedByName}` : ""}
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

// ─── Counter — assembly cabinet types ────────────────────────────────────────

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
    <div className="card flex flex-col gap-3 px-4 py-4">
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-semibold leading-snug text-ink-800">
          {label}
        </span>
        {value > 0 && (
          <span className="shrink-0 rounded-full bg-brand-orange/10 px-2 py-0.5 text-[11px] font-bold text-brand-orange">
            {value}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDecrement}
          disabled={value === 0}
          aria-label={`Decrease ${label}`}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-ink-200 bg-white text-2xl font-light text-ink-600 transition active:scale-95 disabled:opacity-30"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${label} quantity`}
          className={`h-14 flex-1 rounded-xl border bg-white text-center font-heading text-3xl font-bold tabular-nums outline-none transition-colors focus:border-brand-orange ${
            value > 0
              ? "border-brand-orange/40 text-brand-orange"
              : "border-ink-200 text-ink-300"
          }`}
        />
        <button
          onClick={onIncrement}
          aria-label={`Increase ${label}`}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-orange text-white transition active:scale-95 active:bg-brand-orange-dark"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
