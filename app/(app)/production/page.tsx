"use client";

/**
 * Production — the build queue.
 *
 * Phase 4: this page now reads the shared pipeline instead of every job.
 * GET /pipeline/production-queue returns only the jobs Production can act on —
 * materials ready to build, plus jobs already in flight — in the right order
 * (ready-to-start first, then most-progressed). Finished and not-yet-released
 * jobs never appear here, so the floor sees a clean, short list of exactly
 * what to pick up.
 *
 * Each job still shows the one honest weighted % — Assembly 30%, CNC + Hardware
 * share 70% by size — with the same segmented bar, target steppers and assembly
 * tick. The per-job breakdown (targets, counts, shares) comes from
 * GET /jobs/progress, the single source of truth; CNC-done and Hardware-done
 * fill on their own from the material Log.
 *
 * Self-contained page at /production. Additive — touches nothing else.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";

// ── Segment colours (the three kinds of work — from the approved mockup) ─────
const COL = {
  cnc: "#3B82F6",
  assembly: "#8B5CF6",
  hw: "#22C55E",
  done: "#16A34A",
  priority: "#DC2626",
};

// ── Pipeline stage colours (match the graded dashboard pipeline) ─────────────
const STAGE = {
  ready: { key: "materials_ready", label: "Ready to build", color: "#FB923C" },
  building: { key: "in_production", label: "In progress", color: "#F5822A" },
};

const CAN_EDIT_TARGETS = new Set([
  "supervisor", "admin", "manager", "managing_director",
]);

// A job as it arrives from /pipeline/production-queue (_job_card shape).
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

type Progress = {
  progress: number;        // 0..100 integer
  progressRaw: number;     // 0..1
  shares: { cnc: number; assembly: number; hw: number };
  stage: string;
  cnc_target: number;
  cnc_done: number;
  hw_target: number;
  hw_done: number;
  assembly_done: boolean;
};

type Row = QueueJob & { p: Progress };

const EMPTY_P: Progress = {
  progress: 0, progressRaw: 0,
  shares: { cnc: 0.35, assembly: 0.3, hw: 0.35 },
  stage: "Not Started",
  cnc_target: 0, cnc_done: 0, hw_target: 0, hw_done: 0, assembly_done: false,
};

export default function ProductionPage() {
  const { user } = useAuth();
  const canEdit = Boolean(user && CAN_EDIT_TARGETS.has(user.role));

  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    } catch {
      setError("Could not load the production queue. Tap Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Optimistically patch one job's progress in place after a control change.
  const applyProgress = (jobId: string, p: Progress) =>
    setProgress((cur) => ({ ...cur, [jobId]: p }));

  // Merge queue order (from the server) with live progress detail, then bucket
  // by live progress so a job visibly moves to "In progress" the moment work
  // starts — without waiting for a refresh.
  const { ready, building } = useMemo(() => {
    const rows: Row[] = queue.map((j) => ({ ...j, p: progress[j.id] || EMPTY_P }));
    const readyRows = rows.filter((r) => r.p.progress <= 0);
    const buildingRows = rows.filter((r) => r.p.progress > 0);
    return { ready: readyRows, building: buildingRows };
  }, [queue, progress]);

  const total = ready.length + building.length;

  if (!user) return null;

  return (
    <div className="page pb-28">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Workshop</p>
          <h1 className="page-title mt-1">Production queue</h1>
          <p className="mt-1 text-sm text-ink-500">
            Jobs with materials ready, and jobs being built — in the order to pick them up.
          </p>
        </div>
        <button type="button" onClick={load} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700">
          Refresh
        </button>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div> : null}

      {/* Summary */}
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
          {ready.length > 0 ? (
            <Section title={STAGE.ready.label} color={STAGE.ready.color} count={ready.length}
              hint="Materials on hand — good to start.">
              {ready.map((row) => (
                <JobRow key={row.id} row={row} canEdit={canEdit} onProgress={(p) => applyProgress(row.id, p)} />
              ))}
            </Section>
          ) : null}

          {building.length > 0 ? (
            <Section title={STAGE.building.label} color={STAGE.building.color} count={building.length}
              hint="Work under way.">
              {building.map((row) => (
                <JobRow key={row.id} row={row} canEdit={canEdit} onProgress={(p) => applyProgress(row.id, p)} />
              ))}
            </Section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Section({ title, color, count, hint, children }: {
  title: string; color: string; count: number; hint: string; children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <h2 className="text-lg font-bold text-ink-950">{title}</h2>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-bold tabular-nums text-ink-600">{count}</span>
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
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink-950">{value == null ? "…" : value}</p>
    </div>
  );
}

function JobRow({ row, canEdit, onProgress }: {
  row: Row;
  canEdit: boolean;
  onProgress: (p: Progress) => void;
}) {
  const { p } = row;
  const [busy, setBusy] = useState(false);
  const title = row.client || row.projectName || "Job";
  const highPriority = (row.priority || "").toLowerCase() === "high"
    || (row.priority || "").toLowerCase() === "urgent";

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
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-ink-600">
              #{row.jobNum || "—"}
            </span>
            {highPriority ? (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: COL.priority }}>
                High
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 truncate text-base font-bold text-ink-950">{title}</h3>
          {row.siteAddress ? <p className="truncate text-xs text-ink-500">{row.siteAddress}</p> : null}
          {row.dueDate ? <p className="mt-0.5 text-xs text-ink-400">Due {row.dueDate}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-extrabold tabular-nums text-ink-950" style={p.progress >= 100 ? { color: COL.done } : undefined}>
            {p.progress}%
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{p.stage}</div>
        </div>
      </div>

      {/* Weighted segmented bar */}
      <WeightedBar p={p} />

      {/* Under-bar labels */}
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <Label color={COL.cnc} name="CNC" value={`${fmt(p.cnc_done)}/${p.cnc_target || "—"}`} />
        <Label color={COL.assembly} name="Assembly" value={p.assembly_done ? "✓" : "—"} />
        <Label color={COL.hw} name="Hardware" value={`${fmt(p.hw_done)}/${p.hw_target || "—"}`} />
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-col gap-3 border-t border-ink-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-4">
            <Stepper
              label="CNC boards target"
              value={p.cnc_target}
              disabled={busy}
              onChange={(v) => setTargets(v, p.hw_target)}
            />
            <Stepper
              label="Hardware target"
              value={p.hw_target}
              disabled={busy}
              onChange={(v) => setTargets(p.cnc_target, v)}
            />
          </div>
        ) : <span className="text-xs text-ink-400">Counts update from Materials — Live.</span>}

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

      {/* Completion note / reconciliation */}
      {p.progress < 100 ? (
        <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-center text-xs text-ink-400">
          Assigned-materials reconciliation unlocks when the job reaches 100%.
        </p>
      ) : (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-center text-xs font-semibold text-green-700">
          Complete — CNC {fmt(p.cnc_done)}/{p.cnc_target}, Hardware {fmt(p.hw_done)}/{p.hw_target}, Assembly done.
        </div>
      )}
    </div>
  );
}

/** The weighted bar: 3 segments whose WIDTHS are the weights, each FILLING by its own fraction. */
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
          style={{ flexGrow: Math.max(s.share, 0.001), flexBasis: 0, minWidth: 40, background: hexA(s.color, 0.16) }}
          title={`${Math.round(s.share * 100)}%`}
        >
          <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${s.fill * 100}%`, background: s.color, transition: "width .25s ease" }} />
          <span className="absolute inset-0 grid place-items-center text-[10px] font-bold tabular-nums" style={{ color: s.fill > 0.55 ? "#fff" : "#334155" }}>
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
        <button type="button" disabled={disabled || value <= 0} onClick={() => onChange(value - 1)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 bg-ink-50 text-lg font-bold disabled:opacity-40" aria-label={`Decrease ${label}`}>−</button>
        <span className="w-8 text-center text-base font-bold tabular-nums text-ink-900">{value}</span>
        <button type="button" disabled={disabled} onClick={() => onChange(value + 1)}
          className="grid h-9 w-9 place-items-center rounded-lg bg-brand-orange text-lg font-bold text-white disabled:opacity-40" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}

function Label({ color, name, value }: { color: string; name: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-50 px-2 py-1.5">
      <div className="flex items-center justify-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{name}</span>
      </div>
      <div className="mt-0.5 text-sm font-bold tabular-nums text-ink-900">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-400">{text}</div>;
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** hex + alpha → rgba string. */
function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
