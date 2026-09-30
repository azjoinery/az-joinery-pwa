"use client";

/**
 * Queue — build queue + executive overview.
 *
 * URL: /queue  (routed by this folder name; kept backend calls untouched:
 * /pipeline/production-queue and /jobs/:id/production-targets stay as-is
 * because that's what server.py exposes.)
 *
 * For floor staff and supervisors: the build queue unchanged —
 * materials-ready + in-progress jobs with weighted progress bars.
 *
 * For executive roles (MD / Manager / Admin / Department Manager):
 * a 3-tab view (Queue / Inventory / Materials) replacing the separate
 * Inventory and Materials nav items.
 *
 * Auto-advancement: whenever progress thresholds are met (cnc_done ≥
 * cnc_target, assembly_done, hw_done ≥ hw_target) the queue automatically
 * PATCHes the job's production stage — no manual step needed. This fires:
 *   1. After every load / silent 30-second refresh
 *   2. After "Mark assembled" is tapped
 *   3. After CNC / Hardware target steppers are changed
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import type { DailyEntry } from "@/lib/types";

// ── Segment colours ───────────────────────────────────────────────────────────
const COL = {
  cnc: "#3B82F6",
  assembly: "#8B5CF6",
  hw: "#22C55E",
  done: "#16A34A",
  priority: "#DC2626",
};

const STAGE = {
  ready: { key: "materials_ready", label: "Ready to build", color: "#FB923C" },
  building: { key: "in_production", label: "In progress", color: "#F5822A" },
};

const CAN_EDIT_TARGETS = new Set([
  "supervisor", "admin", "manager", "managing_director",
]);

const EXECUTIVE_ROLES = new Set([
  "managing_director", "manager", "department_manager", "admin",
]);

// ── Types ─────────────────────────────────────────────────────────────────────
type QueueJob = {
  id: string;
  jobNum?: string;
  client?: string;
  projectName?: string;
  siteAddress?: string;
  priority?: string;
  dueDate?: string;
  stage?: string;
};

type MaterialItem = {
  description: string;
  category: "cnc" | "hardware";
  target: number;
  done: number;
};

type Progress = {
  progress: number;
  progressRaw: number;
  shares: { cnc: number; assembly: number; hw: number };
  stage: string;
  cnc_target: number;
  cnc_done: number;
  hw_target: number;
  hw_done: number;
  assembly_done: boolean;
  materials?: MaterialItem[];
};

type Row = QueueJob & { p: Progress };

type StockItem = {
  id: string;
  name: string;
  category?: string;
  on_hand_qty: number;
  reserved_qty?: number;
  allocated_qty?: number;
  available_qty?: number;
  unit: string;
  reorder_point: number;
  supplier?: string;
};

type JobPick = {
  id: string;
  jobNum?: string;
  client?: string;
  projectName?: string;
};

const EMPTY_P: Progress = {
  progress: 0, progressRaw: 0,
  shares: { cnc: 0.35, assembly: 0.3, hw: 0.35 },
  stage: "Not Started",
  cnc_target: 0, cnc_done: 0, hw_target: 0, hw_done: 0, assembly_done: false,
};

// ── Stage advancement helpers ─────────────────────────────────────────────────

/**
 * Ordered production sub-stages. Higher rank = further along.
 * Advancement is always forward-only (never demotes a stage).
 */
const PROD_STAGE_RANK: Record<string, number> = {
  "Not Started": 0,
  "CNC Cut": 1,
  "Assembling": 2,
  "Hardware Fitted": 3,
  "Ready to Deliver": 4,
  "Delivered": 5,
};
function prodStageRank(stage?: string) {
  return PROD_STAGE_RANK[stage || ""] ?? -1;
}

/**
 * Returns the stage the job SHOULD be in based on current progress,
 * or null if no advancement is warranted.
 *
 * Rules (forward-only — won't regress a stage):
 *   Any CNC usage recorded  → advance to "CNC Cut"
 *   assembly_done = true    → advance to "Hardware Fitted"
 *   hw_done ≥ hw_target > 0 AND assembly done → advance to "Ready to Deliver"
 */
function targetProdStage(p: Progress): string | null {
  const candidates: string[] = [];
  if (p.cnc_done > 0) candidates.push("CNC Cut");
  if (p.cnc_target > 0 && p.cnc_done >= p.cnc_target && !p.assembly_done)
    candidates.push("Assembling");
  if (p.assembly_done) candidates.push("Hardware Fitted");
  if (p.assembly_done && p.hw_target > 0 && p.hw_done >= p.hw_target)
    candidates.push("Ready to Deliver");

  // Pick the highest-rank candidate that is strictly ahead of the current stage
  let best: string | null = null;
  let bestRank = prodStageRank(p.stage);
  for (const c of candidates) {
    const r = prodStageRank(c);
    if (r > bestRank) { best = c; bestRank = r; }
  }
  return best;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProductionPage() {
  const { user } = useAuth();
  const canEdit = Boolean(user && CAN_EDIT_TARGETS.has(user.role));
  const isExecutive = Boolean(user && EXECUTIVE_ROLES.has(user.role));

  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Visual feedback when a stage was auto-advanced: jobId → new stage name
  const [advanced, setAdvanced] = useState<Record<string, string>>({});

  // Reserved for future executive-tab data (not yet rendered)

  // Keep a ref so autoAdvanceJob can call setProgress without stale closure issues
  const progressRef = useRef<Record<string, Progress>>({});
  useEffect(() => { progressRef.current = progress; }, [progress]);

  /**
   * Attempt to advance a job's production stage if its progress now meets a
   * threshold. Fires the PATCH, updates local state, and briefly shows a
   * "stage advanced" badge on the card. Silent on failure.
   */
  const autoAdvanceJob = useCallback(async (jobId: string, p: Progress) => {
    const newStage = targetProdStage(p);
    if (!newStage) return;
    try {
      await api.patch(`/jobs/${jobId}/production-stage`, { stage: newStage });
      setProgress((cur) => ({
        ...cur,
        [jobId]: { ...p, stage: newStage },
      }));
      setAdvanced((prev) => ({ ...prev, [jobId]: newStage }));
      setTimeout(
        () => setAdvanced((prev) => { const n = { ...prev }; delete n[jobId]; return n; }),
        4000
      );
    } catch {
      // Silently ignore — the stage will be advanced on next load
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [q, prog] = await Promise.all([
        api.get<{ count: number; jobs: QueueJob[] }>("/pipeline/production-queue"),
        api.get<Record<string, Progress>>("/jobs/progress"),
      ]);
      setQueue(q?.jobs || []);
      setProgress(prog || {});

      // Auto-advance stages for any job that now meets a threshold.
      // This is the "queue detects completion" step — no manual action needed.
      const progMap = prog || {};
      await Promise.allSettled(
        Object.entries(progMap).map(([jobId, p]) => autoAdvanceJob(jobId, p))
      );
    } catch {
      setError("Could not load production data. Tap Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, [autoAdvanceJob]);

  useEffect(() => { load(); }, [load]);

  // Silent 30-second poll — picks up newly released jobs and live progress
  // without requiring a manual refresh. No spinner so it doesn't flash.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const [q, prog] = await Promise.all([
          api.get<{ count: number; jobs: QueueJob[] }>("/pipeline/production-queue"),
          api.get<Record<string, Progress>>("/jobs/progress"),
        ]);
        if (q) setQueue(q.jobs || []);
        if (!prog) return;
        setProgress(prog);
        await Promise.allSettled(
          Object.entries(prog).map(([jobId, p]) => autoAdvanceJob(jobId, p))
        );
      } catch { /* network blip — skip this tick */ }
    }, 30_000);
    return () => clearInterval(timer);
  }, [autoAdvanceJob]);

  /**
   * Called by JobRow whenever a progress update arrives (toggle assembly,
   * change targets). Applies the update locally AND runs auto-advancement.
   */
  const handleProgress = useCallback(
    (jobId: string, p: Progress) => {
      setProgress((cur) => ({ ...cur, [jobId]: p }));
      autoAdvanceJob(jobId, p);
    },
    [autoAdvanceJob]
  );

  const { ready, building } = useMemo(() => {
    const rows: Row[] = queue.map((j) => ({ ...j, p: progress[j.id] || EMPTY_P }));
    return {
      ready: rows.filter((r) => r.p.progress <= 0),
      building: rows.filter((r) => r.p.progress > 0),
    };
  }, [queue, progress]);

  if (!user) return null;

  return (
    <div className="page pb-28">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Workshop</p>
          <h1 className="page-title mt-1">Queue</h1>
          <p className="mt-1 text-sm text-ink-500">
            Jobs with materials ready, and jobs being built — in the order to pick them up.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>
      ) : null}

      <ProductionQueueView
        ready={ready}
        building={building}
        loading={loading}
        canEdit={canEdit}
        advanced={advanced}
        onProgress={handleProgress}
      />
    </div>
  );
}

// ── Production queue ──────────────────────────────────────────────────────────
function ProductionQueueView({ ready, building, loading, canEdit, advanced, onProgress }: {
  ready: Row[];
  building: Row[];
  loading: boolean;
  canEdit: boolean;
  advanced: Record<string, string>;
  onProgress: (jobId: string, p: Progress) => void;
}) {
  const total = ready.length + building.length;
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Metric label="Ready to build" value={loading ? null : ready.length} color={STAGE.ready.color} />
        <Metric label="In progress" value={loading ? null : building.length} color={STAGE.building.color} />
      </div>
      {loading ? (
        <Empty text="Loading production queue…" />
      ) : total === 0 ? (
        <Empty text="Nothing to build right now — no released job has its materials ready." />
      ) : (
        <div className="space-y-8">
          {ready.length > 0 && (
            <Section title={STAGE.ready.label} color={STAGE.ready.color} count={ready.length} hint="Materials on hand — good to start.">
              {ready.map((row) => (
                <JobRow
                  key={row.id}
                  row={row}
                  canEdit={canEdit}
                  advancedTo={advanced[row.id]}
                  onProgress={(p) => onProgress(row.id, p)}
                />
              ))}
            </Section>
          )}
          {building.length > 0 && (
            <Section title={STAGE.building.label} color={STAGE.building.color} count={building.length} hint="Work under way.">
              {building.map((row) => (
                <JobRow
                  key={row.id}
                  row={row}
                  canEdit={canEdit}
                  advancedTo={advanced[row.id]}
                  onProgress={(p) => onProgress(row.id, p)}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </>
  );
}

function InventoryView({ stock, loading }: { stock: StockItem[]; loading: boolean }) {
  const [filter, setFilter] = useState<"all" | "low">("all");
  const lowStock = stock.filter(
    (item) => Number(item.on_hand_qty || 0) <= Number(item.reorder_point || 0)
  );
  const visible = filter === "low" ? lowStock : stock;

  if (loading) return <Empty text="Loading inventory…" />;

  return (
    <>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === "all" ? "bg-brand-orange text-white" : "bg-white text-ink-600"}`}
        >
          All ({stock.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("low")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === "low" ? "bg-brand-orange text-white" : "bg-white text-ink-600"}`}
        >
          Low stock ({lowStock.length})
        </button>
      </div>

      {visible.length === 0 ? (
        <Empty text={filter === "low" ? "No stock items below reorder point." : "No active stock items."} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
          {visible.map((item, i) => {
            const available =
              item.available_qty ??
              (Number(item.on_hand_qty || 0) - Number(item.reserved_qty || item.allocated_qty || 0));
            const isLow = Number(item.on_hand_qty || 0) <= Number(item.reorder_point || 0);
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 p-4 ${
                  i < visible.length - 1 ? "border-b border-ink-100" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{item.name}</p>
                  <p className="truncate text-xs text-ink-500">
                    {item.category || "General"}
                    {item.supplier ? ` · ${item.supplier}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold tabular-nums text-ink-950">{item.on_hand_qty} {item.unit}</p>
                  <p className="text-xs text-ink-500">
                    avail {available} / reorder @{item.reorder_point}
                  </p>
                  {isLow && (
                    <span className="inline-block rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                      Low
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Materials — usage log from daily entries ───────────────────────────────────
function MaterialsSummaryView({ entries, stock, jobs, loading }: {
  entries: DailyEntry[];
  stock: StockItem[];
  jobs: JobPick[];
  loading: boolean;
}) {
  const [period, setPeriod] = useState<"today" | "week">("today");

  const today = new Date().toISOString().slice(0, 10);
  const periodStart = period === "today"
    ? today
    : (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })();

  const stockById = useMemo(() => new Map(stock.map((s) => [s.id, s])), [stock]);
  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);

  const usageRows = useMemo(() =>
    entries
      .filter((e) => e.date >= periodStart)
      .flatMap((entry) =>
        (entry.materials || [])
          .filter((m) => (m.qty || 0) > 0)
          .map((m) => ({ entry, m }))
      ),
    [entries, periodStart]
  );

  if (loading) return <Empty text="Loading usage data…" />;

  return (
    <>
      <div className="mb-4 flex gap-2">
        {(["today", "week"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${period === p ? "bg-brand-orange text-white" : "bg-white text-ink-600"}`}
          >
            {p === "today" ? "Today" : "This week"}
          </button>
        ))}
      </div>

      {usageRows.length === 0 ? (
        <Empty text="No material usage recorded for this period." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
          {usageRows.slice(0, 30).map(({ entry, m }, i) => {
            const item = stockById.get(m.stockItemId);
            const job = m.jobId ? jobsById.get(m.jobId) : null;
            const jobLabel = job
              ? [job.jobNum && `#${job.jobNum}`, job.client || job.projectName].filter(Boolean).join(" — ")
              : "General workshop";
            return (
              <div
                key={i}
                className={`flex items-center justify-between gap-3 p-4 ${i < usageRows.length - 1 ? "border-b border-ink-100" : ""}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{item?.name || "Material"}</p>
                  <p className="truncate text-xs text-ink-500">
                    {jobLabel} · {entry.employeeName || "Worker"} · {entry.date}
                  </p>
                </div>
                <span className="shrink-0 font-bold tabular-nums text-ink-950">
                  {m.qty} {item?.unit || ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function Section({ title, color, count, hint, children }: {
  title: string; color: string; count: number; hint: string; children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <h2 className="text-lg font-bold text-ink-950">{title}</h2>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-bold tabular-nums text-ink-600">
          {count}
        </span>
        <span className="ml-auto text-xs text-ink-400">{hint}</span>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Metric({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink-950">
        {value == null ? "…" : value}
      </p>
    </div>
  );
}

function JobRow({ row, canEdit, advancedTo, onProgress }: {
  row: Row;
  canEdit: boolean;
  advancedTo?: string;
  onProgress: (p: Progress) => void;
}) {
  const { p } = row;
  const [busy, setBusy] = useState(false);
  const title = row.client || row.projectName || "Job";
  const highPriority =
    (row.priority || "").toLowerCase() === "high" ||
    (row.priority || "").toLowerCase() === "urgent";

  const setTargets = async (cnc: number, hw: number) => {
    setBusy(true);
    try {
      const next = await api.patch<Progress>(`/jobs/${row.id}/production-targets`, {
        cnc_target: Math.max(0, cnc),
        hw_target: Math.max(0, hw),
      });
      onProgress(next);
    } catch { /* keep previous on failure */ }
    finally { setBusy(false); }
  };

  const toggleAssembly = async () => {
    setBusy(true);
    try {
      const next = await api.patch<Progress>(`/jobs/${row.id}/assembly`, { done: !p.assembly_done });
      onProgress(next);
    } catch { /* ignore */ }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-ink-600">
              #{row.jobNum || "—"}
            </span>
            {highPriority ? (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                style={{ background: COL.priority }}
              >
                High
              </span>
            ) : null}
            {p.stage && p.stage !== "Not Started" && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                {p.stage}
              </span>
            )}
          </div>
          <h3 className="mt-1 truncate text-base font-bold text-ink-950">{title}</h3>
          {row.siteAddress ? (
            <p className="truncate text-xs text-ink-500">{row.siteAddress}</p>
          ) : null}
          {row.dueDate ? (
            <p className="mt-0.5 text-xs text-ink-400">Due {row.dueDate}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <div
            className="text-2xl font-extrabold tabular-nums text-ink-950"
            style={p.progress >= 100 ? { color: COL.done } : undefined}
          >
            {p.progress}%
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            {p.stage}
          </div>
        </div>
      </div>

      <WeightedBar p={p} />

      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <Label
          color={COL.cnc}
          name="CNC"
          value={p.cnc_target > 0 ? `${fmt(p.cnc_done)} / ${p.cnc_target} sheets` : `${fmt(p.cnc_done)} sheets`}
          over={p.cnc_target > 0 && p.cnc_done > p.cnc_target}
        />
        <Label color={COL.assembly} name="Assembly" value={p.assembly_done ? "done ✓" : "pending"} />
        <Label
          color={COL.hw}
          name="Hardware"
          value={p.hw_target > 0 ? `${fmt(p.hw_done)} / ${p.hw_target} pcs` : `${fmt(p.hw_done)} pcs`}
          over={p.hw_target > 0 && p.hw_done > p.hw_target}
        />
      </div>

      <MaterialBreakdown materials={p.materials} />

      <div className="mt-4 flex flex-col gap-3 border-t border-ink-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-ink-400">Tallied from released material list — capped at target.</span>
        <button
          type="button"
          onClick={toggleAssembly}
          disabled={busy}
          className="min-h-11 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: p.assembly_done ? COL.done : COL.assembly }}
        >
          {p.assembly_done ? "Assembled ✓" : "Mark assembled"}
        </button>
      </div>

      {/* Status / auto-advance feedback */}
      {advancedTo ? (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-semibold text-blue-700">
          ✦ Stage auto-advanced → {advancedTo}
        </div>
      ) : p.progress < 100 ? (
        <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-center text-xs text-ink-400">
          Assigned-materials reconciliation unlocks when the job reaches 100%.
        </p>
      ) : (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
          <div className="text-center">Complete — CNC {fmt(p.cnc_done)}/{p.cnc_target}, Hardware {fmt(p.hw_done)}/{p.hw_target}, Assembly done.</div>
          <Link
            href="/invoices"
            className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-green-800 hover:bg-green-50"
          >
            Invoice this job →
          </Link>
        </div>
      )}
    </div>
  );
}

function WeightedBar({ p }: { p: Progress }) {
  const cncFill = p.cnc_target > 0 ? Math.min(1, p.cnc_done / p.cnc_target) : 1;
  const asmFill = p.assembly_done ? 1 : 0;
  const hwFill = p.hw_target > 0 ? Math.min(1, p.hw_done / p.hw_target) : 1;
  const segs = [
    { key: "cnc", share: p.shares.cnc, fill: cncFill, color: COL.cnc },
    { key: "assembly", share: p.shares.assembly, fill: asmFill, color: COL.assembly },
    { key: "hw", share: p.shares.hw, fill: hwFill, color: COL.hw },
  ];
  return (
    <div className="mt-4 flex h-7 w-full gap-1 overflow-hidden">
      {segs.map((s) => (
        <div
          key={s.key}
          className="relative h-full overflow-hidden rounded"
          style={{
            flexGrow: Math.max(s.share, 0.001),
            flexBasis: 0,
            minWidth: 40,
            background: hexA(s.color, 0.16),
          }}
          title={`${Math.round(s.share * 100)}%`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded"
            style={{ width: `${s.fill * 100}%`, background: s.color, transition: "width .25s ease" }}
          />
          <span
            className="absolute inset-0 grid place-items-center text-[10px] font-bold tabular-nums"
            style={{ color: s.fill > 0.55 ? "#fff" : "#334155" }}
          >
            {Math.round(s.share * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function Stepper({ label, value, onChange, disabled }: {
  label: string; value: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled || value <= 0}
          onClick={() => onChange(value - 1)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 bg-ink-50 text-lg font-bold disabled:opacity-40"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="w-8 text-center text-base font-bold tabular-nums text-ink-900">{value}</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(value + 1)}
          className="grid h-9 w-9 place-items-center rounded-lg bg-brand-orange text-lg font-bold text-white disabled:opacity-40"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Label({ color, name, value, over }: { color: string; name: string; value: string; over?: boolean }) {
  return (
    <div className={`rounded-lg px-2 py-1.5 ${over ? "bg-amber-50" : "bg-ink-50"}`}>
      <div className="flex items-center justify-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{name}</span>
      </div>
      <div className={`mt-0.5 text-sm font-bold tabular-nums ${over ? "text-amber-700" : "text-ink-900"}`}>{value}</div>
      {over && <div className="text-[9px] font-semibold text-amber-600">needs correction</div>}
    </div>
  );
}

function MaterialBreakdown({ materials }: { materials?: MaterialItem[] }) {
  const [open, setOpen] = useState(false);
  if (!materials || materials.length === 0) return null;
  const cncItems = materials.filter((m) => m.category === "cnc");
  const hwItems = materials.filter((m) => m.category === "hardware");
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-1.5 text-[11px] font-semibold text-ink-500 hover:bg-ink-100"
      >
        <span className="text-[9px]">{open ? "▼" : "▶"}</span>
        Material breakdown ({materials.length} items)
      </button>
      {open && (
        <div className="mt-1.5 space-y-2 rounded-xl border border-ink-100 bg-ink-50/50 px-3 py-2">
          {cncItems.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: COL.cnc }} />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">CNC materials</span>
              </div>
              {cncItems.map((m, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5 pl-3.5 text-[11px]">
                  <span className="min-w-0 flex-1 truncate text-ink-500">{m.description}</span>
                  <span className="whitespace-nowrap font-semibold tabular-nums text-ink-700">
                    {m.done} / {m.target}
                  </span>
                  <div className="h-1 w-12 overflow-hidden rounded-full bg-ink-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${m.target > 0 ? Math.min(100, (m.done / m.target) * 100) : 0}%`,
                        background: COL.cnc,
                      }}
                    />
                  </div>
                  {m.target > 0 && m.done >= m.target && (
                    <span className="text-[9px] font-bold text-green-600">✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {hwItems.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: COL.hw }} />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Hardware</span>
              </div>
              {hwItems.map((m, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5 pl-3.5 text-[11px]">
                  <span className="min-w-0 flex-1 truncate text-ink-500">{m.description}</span>
                  <span className="whitespace-nowrap font-semibold tabular-nums text-ink-700">
                    {m.done} / {m.target}
                  </span>
                  <div className="h-1 w-12 overflow-hidden rounded-full bg-ink-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${m.target > 0 ? Math.min(100, (m.done / m.target) * 100) : 0}%`,
                        background: COL.hw,
                      }}
                    />
                  </div>
                  {m.target > 0 && m.done >= m.target && (
                    <span className="text-[9px] font-bold text-green-600">✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-400">
      {text}
    </div>
  );
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
