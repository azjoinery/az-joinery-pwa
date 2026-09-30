"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";

const FINANCIAL_ROLES = new Set(["managing_director", "manager", "admin"]);

const CAB_LABELS: Record<string, string> = {
  cab_small: "Small", cab_tall: "Tall", cab_corner: "Corner",
  cab_drawer: "Drawer", cab_special: "Special", cab_kickbase: "Kickbase",
};

const PERIODS = [
  { key: "daily",      label: "Daily"       },
  { key: "weekly",     label: "Weekly"      },
  { key: "monthly",    label: "Monthly"     },
  { key: "quarterly",  label: "Quarterly"   },
  { key: "halfyearly", label: "Half Yearly" },
  { key: "yearly",     label: "Yearly"      },
  { key: "custom",     label: "Custom Range"},
] as const;
type PeriodKey = typeof PERIODS[number]["key"];

interface WorkerRow { name: string; role: string; daysActive: number; units: number; unitsPrev: number; wastage: number; }
interface CompletedJob { jobNum: string; title: string; client: string; units: number; cycleDays: number | null; revenue: number; materialCost: number; }
interface PipelineAlert { jobNum: string; title: string; reason: string; daysOverdue: number; }
interface ReorderAlert { name: string; stock: number; reorderAt: number; }
interface WastageRow { date: string; material: string; jobNum: string; reason: string; worker: string; cost: number; }
interface UninvoicedJob { jobNum: string; title: string; client: string; completedAt: string; value: number; }
interface AgeingRow { client: string; invoice: string; ageDays: number; amount: number; }
interface IncidentRow { date: string; type: string; description: string; severity: string; openDays: number; status: string; }

interface ReportData {
  period: { start: string; end: string };
  production: {
    totalUnits: number; prevUnits: number; capacityPct: number; avgCycleDays: number | null;
    workerRows: WorkerRow[]; cabinetTotals: Record<string, number>;
    dailySeries: { date: string; value: number }[];
    heatmap: { date: string; value: number; events: string[] }[];
  };
  jobs: {
    forwardWeeks: number; pipelineCounts: Record<string, number>;
    completed: CompletedJob[]; overdue: PipelineAlert[];
  };
  inventory: {
    opening: number; purchased: number; used: number; wastage: number; closing: number;
    reorderAlerts: ReorderAlert[]; wastageRows: WastageRow[];
  };
  financial?: {
    invoiced: number; received: number; outstanding: number; overdueAmount: number;
    materialCost: number; wastageAmount: number; uninvoiced: UninvoicedJob[];
    weeklyRevenue: number[]; ageing: AgeingRow[];
  };
  compliance: { openCount: number; daysSinceInjury: number; incidents: IncidentRow[]; };
  outlook: { jobNum: string; title: string; date: string; note: string; type: string }[];
}

export default function ReportTab() {
  const { user } = useAuth();
  const isFinancial = FINANCIAL_ROLES.has(user?.role ?? "");

  const [period, setPeriod]     = useState<PeriodKey>("weekly");
  const [customStart, setCStart] = useState("");
  const [customEnd, setCEnd]     = useState("");
  const [calMonth, setCalMonth]  = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [data, setData]          = useState<ReportData | null>(null);
  const [loading, setLoading]    = useState(true);
  const [err, setErr]            = useState<string | null>(null);

  const getRange = useCallback(() => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (period === "custom" && customStart && customEnd) return { start: customStart, end: customEnd };
    const end = fmt(today); let start = new Date(today);
    if      (period === "weekly")     start.setDate(today.getDate() - 6);
    else if (period === "monthly")    start.setDate(1);
    else if (period === "quarterly")  start = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    else if (period === "halfyearly") start = today.getMonth() < 6 ? new Date(today.getFullYear(), 0, 1) : new Date(today.getFullYear(), 6, 1);
    else if (period === "yearly")     start = new Date(today.getFullYear(), 0, 1);
    return { start: fmt(start), end };
  }, [period, customStart, customEnd]);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const { start, end } = getRange();
    try {
      const res = await api.get<ReportData>(`/analytics/report?start=${start}&end=${end}`);
      setData(res);
    } catch {
      setErr("Could not load report data. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [getRange]);

  useEffect(() => { if (period !== "custom") load(); }, [period, load]);

  const { year, month } = calMonth;
  const offset   = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMo = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const fmtIso = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const MNAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const { start: rs, end: re } = getRange();
  const prevPct = (cur: number, prev: number) => prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #rpt-print { display: block !important; }
          .no-print { display: none !important; }
          @page { margin: 12mm; size: A4; }
          #rpt-print { font-size: 10.5px; color: #111; }
        }
        #rpt-print { display: block; }
      `}</style>

      <div id="rpt-print">
        {/* Period pills */}
        <div className="no-print mb-4 flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                period === p.key ? "bg-brand-orange text-white"
                : p.key === "custom" ? "border border-dashed border-brand-orange text-brand-orange hover:bg-brand-orange/10"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Calendar — Custom Range only */}
        {period === "custom" && (
          <div className="no-print mb-4 rounded-card border border-ink-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setCalMonth(({ year: y, month: m }) => m === 0 ? { year: y-1, month: 11 } : { year: y, month: m-1 })}
                className="rounded px-2 py-1 text-sm text-ink-600 hover:bg-ink-100">←</button>
              <span className="text-sm font-semibold">{MNAMES[month]} {year}</span>
              <button onClick={() => setCalMonth(({ year: y, month: m }) => m === 11 ? { year: y+1, month: 0 } : { year: y, month: m+1 })}
                className="rounded px-2 py-1 text-sm text-ink-600 hover:bg-ink-100">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-ink-400 pb-1">
              {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const iso = fmtIso(d);
                return (
                  <button key={i} onClick={() => {
                    if (!customStart || (customStart && customEnd)) { setCStart(iso); setCEnd(""); }
                    else iso < customStart ? (setCEnd(customStart), setCStart(iso)) : setCEnd(iso);
                  }}
                    className={`rounded py-1.5 text-xs transition-colors ${
                      iso === customStart || iso === customEnd ? "bg-brand-orange font-bold text-white"
                      : customStart && customEnd && iso > customStart && iso < customEnd ? "bg-brand-orange/15 text-brand-orange"
                      : "hover:bg-ink-100"}`}>
                    {d}
                  </button>
                );
              })}
            </div>
            {customStart && customEnd && (
              <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="text-xs text-ink-500">{customStart} → {customEnd}</span>
                <button onClick={load} className="btn-primary px-3 py-1.5 text-xs">Apply</button>
              </div>
            )}
          </div>
        )}

        {/* Report header */}
        <div className="mb-4 rounded-card bg-ink-950 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-orange">AZ Joinery</p>
              <h2 className="mt-1 font-heading text-xl font-bold tracking-tight text-white">Workshop Report</h2>
              <p className="mt-0.5 text-xs text-white/45">{rs} → {re}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <p className="text-[11px] capitalize text-white/40">{user?.name}</p>
              <button onClick={() => window.print()}
                className="no-print flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                ↓ Download PDF
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1,2,3,4].map((i) => <div key={i} className="h-28 animate-pulse rounded-card bg-ink-100" />)}
          </div>
        )}
        {err && <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div>}
        {!loading && !err && data && <ReportBody data={data} isFinancial={isFinancial} prevPct={prevPct} />}
      </div>
    </>
  );
}

function ReportBody({ data, isFinancial, prevPct }: {
  data: ReportData; isFinancial: boolean;
  prevPct: (cur: number, prev: number) => number | null;
}) {
  const p = data.production; const j = data.jobs;
  const inv = data.inventory; const fin = data.financial; const comp = data.compliance;
  const pChg = prevPct(p.totalUnits, p.prevUnits);

  const hmClass = (v: number) => {
    if (v === 0) return "bg-ink-100";
    if (v === 1) return "bg-orange-100";
    if (v === 2) return "bg-orange-200";
    if (v === 3) return "bg-orange-300";
    if (v === 4) return "bg-orange-400";
    return "bg-brand-orange text-white";
  };

  return (
    <div className="space-y-6">

      {/* Executive Summary */}
      <Section title="Executive Summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard label="Units Produced" value={String(p.totalUnits)}
            note={pChg !== null ? `${pChg >= 0 ? "▲" : "▼"} ${Math.abs(pChg)}% vs prev` : undefined}
            noteClass={pChg !== null && pChg >= 0 ? "text-green-600" : "text-red-600"} />
          <KpiCard label="Capacity Used" value={`${p.capacityPct}%`}
            noteClass={p.capacityPct > 85 ? "text-green-600" : p.capacityPct > 60 ? "text-amber-600" : "text-red-600"} />
          <KpiCard label="Avg Job Cycle" value={p.avgCycleDays !== null ? `${p.avgCycleDays}d` : "--"} />
          <KpiCard label="Forward Load" value={`${j.forwardWeeks} wks`}
            noteClass={j.forwardWeeks >= 6 ? "text-green-600" : "text-amber-600"}
            note={j.forwardWeeks < 6 ? "⚠ Target: 6+" : "✓ On track"} />
          {isFinancial && fin && <>
            <KpiCard label="Revenue Collected" value={`$${fin.received.toLocaleString()}`} />
            <KpiCard label="Gross Margin"
              value={fin.received > 0 ? `${Math.round(((fin.received - fin.materialCost - fin.wastageAmount) / fin.received) * 100)}%` : "--"}
              noteClass="text-green-600" />
          </>}
        </div>
        {j.overdue.map((a) => (
          <Alert key={a.jobNum} level="red" title={`${a.jobNum} — ${a.daysOverdue}d overdue`} body={a.reason} />
        ))}
        {isFinancial && fin && fin.uninvoiced.length > 0 && (
          <Alert level="amber"
            title={`$${fin.uninvoiced.reduce((s, u) => s + u.value, 0).toLocaleString()} in uninvoiced completed jobs`}
            body={fin.uninvoiced.map((u) => `${u.jobNum} ${u.title}`).join(" · ")} />
        )}
        {comp.openCount > 0 && (
          <Alert level="amber" title={`${comp.openCount} open safety ${comp.openCount === 1 ? "item" : "items"}`} />
        )}
      </Section>

      {/* 1. Production */}
      <Section title="1. Production">
        <SubTitle>1.1 Production calendar</SubTitle>
        <div className="mb-4 rounded-card border border-ink-200 bg-white p-3">
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
              <div key={d} className="pb-1 text-[9px] font-semibold uppercase text-ink-400">{d}</div>
            ))}
            {p.heatmap.map((cell) => (
              <div key={cell.date} className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-md ${hmClass(cell.value)}`}>
                <span className="text-[9px] opacity-60">{new Date(cell.date + "T12:00:00").getDate()}</span>
                {cell.value > 0 && <span className="text-sm font-bold leading-none">{cell.value}</span>}
                {cell.events.length > 0 && (
                  <div className="flex gap-0.5">
                    {cell.events.includes("purchase")  && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                    {cell.events.includes("wastage")   && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                    {cell.events.includes("incident")  && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-2 text-[10px] text-ink-400">
            <span>Output:</span>
            {["bg-ink-100","bg-orange-100","bg-orange-200","bg-orange-300","bg-orange-400","bg-brand-orange"].map((c, i) => (
              <span key={i} className="flex items-center gap-1"><span className={`h-3 w-3 rounded-sm ${c}`} />{i === 0 ? "0" : i < 5 ? String(i) : "5+"}</span>
            ))}
            <span className="ml-2 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />Purchase</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Wastage</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Incident</span>
          </div>
        </div>

        <SubTitle>1.2 Daily output</SubTitle>
        <div className="mb-4 rounded-card border border-ink-200 bg-white p-3">
          <ProdLineChart series={p.dailySeries} />
        </div>

        <SubTitle>1.3 Capacity &amp; efficiency</SubTitle>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard label="Capacity used" value={`${p.capacityPct}%`} />
          <KpiCard label="Avg job cycle" value={p.avgCycleDays !== null ? `${p.avgCycleDays}d` : "--"} />
        </div>

        <SubTitle>1.4 Worker performance</SubTitle>
        <p className="mb-2 text-[10px] italic text-ink-400">Shows staff who logged production units this period.</p>
        {p.workerRows.length === 0 ? (
          <EmptyState msg="No production logs found for this period." />
        ) : (
          <div className="mb-4 overflow-x-auto rounded-card border border-ink-200">
            <table className="w-full text-xs">
              <thead className="border-b border-ink-200 bg-ink-50">
                <tr>{["Worker","Role","Days","Units","Avg/day","vs Prev","Wastage"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-400">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {p.workerRows.map((w) => {
                  const chg = prevPct(w.units, w.unitsPrev);
                  return (
                    <tr key={w.name}>
                      <td className="px-3 py-2 font-semibold text-ink-900">{w.name}</td>
                      <td className="px-3 py-2 capitalize text-ink-500">{w.role.replace(/_/g," ")}</td>
                      <td className="px-3 py-2 text-right">{w.daysActive}</td>
                      <td className="px-3 py-2 text-right font-bold">{w.units}</td>
                      <td className="px-3 py-2 text-right">{w.daysActive > 0 ? (w.units / w.daysActive).toFixed(1) : "--"}</td>
                      <td className={`px-3 py-2 text-right ${chg === null ? "text-ink-400" : chg >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {chg !== null ? `${chg >= 0 ? "▲" : "▼"} ${Math.abs(chg)}%` : "--"}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600">${w.wastage.toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-ink-200 bg-ink-50">
                <tr>
                  <td colSpan={3} className="px-3 py-2 font-bold">Total</td>
                  <td className="px-3 py-2 text-right font-bold">{p.totalUnits}</td>
                  <td colSpan={2} />
                  <td className="px-3 py-2 text-right font-bold text-red-600">
                    ${p.workerRows.reduce((s, w) => s + w.wastage, 0).toFixed(0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <SubTitle>1.5 Cabinet type breakdown</SubTitle>
        <div className="mb-2 rounded-card border border-ink-200 bg-white p-3">
          {Object.entries(p.cabinetTotals).filter(([, v]) => v > 0).length === 0
            ? <EmptyState msg="No cabinet types logged." />
            : <TypeBars totals={p.cabinetTotals} />}
        </div>
      </Section>

      {/* 2. Jobs */}
      <Section title="2. Jobs">
        <SubTitle>2.1 Forward workload</SubTitle>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard label="Weeks confirmed ahead" value={`${j.forwardWeeks} wks`}
            note={j.forwardWeeks < 6 ? "⚠ Push quoting" : "✓ On track"}
            noteClass={j.forwardWeeks < 6 ? "text-amber-600" : "text-green-600"} />
          <KpiCard label="Jobs in pipeline" value={String(Object.values(j.pipelineCounts).reduce((a, b) => a + b, 0))} />
        </div>

        <SubTitle>2.2 Pipeline snapshot</SubTitle>
        <div className="mb-4 rounded-card border border-ink-200 bg-white p-3">
          {Object.entries(j.pipelineCounts).map(([status, count]) => {
            const max = Math.max(...Object.values(j.pipelineCounts), 1);
            return (
              <div key={status} className="mb-2 flex items-center gap-3">
                <span className="w-36 shrink-0 text-xs text-ink-600">{status}</span>
                <div className="flex-1 h-3.5 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-brand-orange/70" style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-xs font-bold">{count}</span>
              </div>
            );
          })}
        </div>

        {j.completed.length > 0 && (
          <>
            <SubTitle>2.3 Completed this period</SubTitle>
            <div className="mb-4 overflow-x-auto rounded-card border border-ink-200">
              <table className="w-full text-xs">
                <thead className="border-b border-ink-200 bg-ink-50">
                  <tr>
                    {["Job #","Title","Client","Units","Cycle",
                      ...(isFinancial ? ["Revenue","Mat. Cost","Margin"] : [])].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {j.completed.map((c) => (
                    <tr key={c.jobNum}>
                      <td className="px-3 py-2 text-ink-500">{c.jobNum || "--"}</td>
                      <td className="px-3 py-2 font-semibold text-ink-900">{c.title}</td>
                      <td className="px-3 py-2 text-ink-500">{c.client}</td>
                      <td className="px-3 py-2 text-right">{c.units}</td>
                      <td className="px-3 py-2 text-right">{c.cycleDays !== null ? `${c.cycleDays}d` : "--"}</td>
                      {isFinancial && <td className="px-3 py-2 text-right">${c.revenue.toLocaleString()}</td>}
                      {isFinancial && <td className="px-3 py-2 text-right text-amber-600">${c.materialCost.toLocaleString()}</td>}
                      {isFinancial && (
                        <td className="px-3 py-2 text-right font-bold text-green-600">
                          {c.revenue > 0 ? `${Math.round(((c.revenue - c.materialCost) / c.revenue) * 100)}%` : "--"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {j.overdue.length > 0 && (
          <>
            <SubTitle>2.4 Attention required</SubTitle>
            {j.overdue.map((a) => (
              <Alert key={a.jobNum} level={a.daysOverdue > 5 ? "red" : "amber"}
                title={`${a.jobNum} ${a.title} — ${a.daysOverdue}d overdue`} body={a.reason} />
            ))}
          </>
        )}
      </Section>

      {/* 3. Inventory */}
      <Section title="3. Inventory &amp; Materials">
        <SubTitle>3.1 Stock movement</SubTitle>
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 rounded-card border border-ink-200 bg-white p-4 text-center">
          <StockBlock label="Opening"   value={`$${inv.opening.toLocaleString()}`} />
          <Op sign="+" color="text-green-600" />
          <StockBlock label="Purchased" value={`$${inv.purchased.toLocaleString()}`} className="bg-green-50" />
          <Op sign="−" color="text-red-600" />
          <StockBlock label="Used"      value={`$${inv.used.toLocaleString()}`} className="bg-amber-50" />
          <Op sign="−" color="text-red-600" />
          <StockBlock label="Wastage"   value={`$${inv.wastage.toLocaleString()}`} className="bg-red-50" />
          <Op sign="=" color="text-ink-400" />
          <StockBlock label="Closing"   value={`$${inv.closing.toLocaleString()}`} className="border-2 border-ink-900" />
        </div>

        {inv.wastageRows.length > 0 && (
          <>
            <SubTitle>3.2 Wastage detail</SubTitle>
            <div className="mb-4 overflow-x-auto rounded-card border border-ink-200">
              <table className="w-full text-xs">
                <thead className="border-b border-ink-200 bg-ink-50">
                  <tr>{["Date","Material","Job","Reason","Worker","Cost"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-400">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {inv.wastageRows.map((w, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-ink-500">{w.date}</td>
                      <td className="px-3 py-2">{w.material}</td>
                      <td className="px-3 py-2 text-ink-500">{w.jobNum || "Workshop"}</td>
                      <td className="px-3 py-2 text-ink-500">{w.reason}</td>
                      <td className="px-3 py-2 text-ink-500">{w.worker}</td>
                      <td className="px-3 py-2 text-right font-semibold text-red-600">${w.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {inv.reorderAlerts.length > 0 && (
          <>
            <SubTitle>3.3 Reorder alerts</SubTitle>
            <div className="mb-2 space-y-2">
              {inv.reorderAlerts.map((r) => (
                <div key={r.name} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${r.stock === 0 ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                  <span className="text-xs font-medium">
                    {r.name} — <strong>{r.stock === 0 ? "Out of stock" : `${r.stock} in stock`}</strong> (reorder at {r.reorderAt})
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.stock === 0 ? "bg-red-600 text-white" : "bg-amber-600 text-white"}`}>
                    {r.stock === 0 ? "Out of stock" : "Low stock"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* 4. Financial — MD/Manager/Admin only */}
      {isFinancial && fin && (
        <Section title="4. Financial" badge="MD &amp; Admin only">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KpiCard label="Invoiced"    value={`$${fin.invoiced.toLocaleString()}`} />
            <KpiCard label="Received"    value={`$${fin.received.toLocaleString()}`} noteClass="text-green-600" />
            <KpiCard label="Outstanding" value={`$${fin.outstanding.toLocaleString()}`}
              noteClass={fin.overdueAmount > 0 ? "text-red-600" : "text-ink-400"}
              note={fin.overdueAmount > 0 ? `$${fin.overdueAmount.toLocaleString()} overdue` : undefined} />
          </div>

          {fin.uninvoiced.length > 0 && (
            <>
              <SubTitle>4.1 Uninvoiced completed jobs ⚠</SubTitle>
              <div className="mb-4 rounded-card border-2 border-amber-300 bg-amber-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">
                    {fin.uninvoiced.length} job{fin.uninvoiced.length > 1 ? "s" : ""} completed — no invoice raised
                  </span>
                  <span className="font-heading text-lg font-bold text-amber-900">
                    ${fin.uninvoiced.reduce((s, u) => s + u.value, 0).toLocaleString()}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr>{["Job #","Title","Client","Completed","Value"].map((h) => (
                      <th key={h} className="pb-1 text-left text-[10px] font-semibold uppercase text-ink-400">{h}</th>
                    ))}</tr></thead>
                    <tbody className="divide-y divide-amber-200">
                      {fin.uninvoiced.map((u) => (
                        <tr key={u.jobNum}>
                          <td className="py-1.5 text-ink-500">{u.jobNum}</td>
                          <td className="py-1.5 font-semibold">{u.title}</td>
                          <td className="py-1.5 text-ink-500">{u.client}</td>
                          <td className="py-1.5 text-ink-500">{u.completedAt}</td>
                          <td className="py-1.5 text-right font-bold">${u.value.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <SubTitle>4.2 Gross P&amp;L</SubTitle>
          <div className="mb-4 space-y-2 rounded-card border border-ink-200 bg-white p-4 text-xs">
            <PnlRow label="Revenue (received)" value={`$${fin.received.toLocaleString()}`} />
            <PnlRow label="Material cost" value={`−$${fin.materialCost.toLocaleString()}`} valueClass="text-amber-600" />
            <PnlRow label="Wastage" value={`−$${fin.wastageAmount.toLocaleString()}`} valueClass="text-red-600" />
            <div className="flex justify-between border-t border-ink-200 pt-2 font-bold">
              <span>Gross profit</span>
              <span className="text-green-600">
                ${Math.max(0, fin.received - fin.materialCost - fin.wastageAmount).toLocaleString()}
                {fin.received > 0 ? ` (${Math.round(((fin.received - fin.materialCost - fin.wastageAmount) / fin.received) * 100)}%)` : ""}
              </span>
            </div>
          </div>

          {fin.ageing.length > 0 && (
            <>
              <SubTitle>4.3 Ageing receivables</SubTitle>
              <div className="mb-2 overflow-x-auto rounded-card border border-ink-200">
                <table className="w-full text-xs">
                  <thead className="border-b border-ink-200 bg-ink-50">
                    <tr>{["Client","Invoice","Age","Amount","Status"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-ink-400">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {fin.ageing.map((a) => (
                      <tr key={a.invoice}>
                        <td className="px-3 py-2 font-medium">{a.client}</td>
                        <td className="px-3 py-2 text-ink-500">{a.invoice}</td>
                        <td className={`px-3 py-2 font-semibold ${a.ageDays > 30 ? "text-red-600" : a.ageDays > 14 ? "text-amber-600" : "text-green-600"}`}>{a.ageDays}d</td>
                        <td className="px-3 py-2 text-right font-bold">${a.amount.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.ageDays > 30 ? "bg-red-100 text-red-700" : a.ageDays > 14 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                            {a.ageDays > 30 ? "Overdue" : a.ageDays > 14 ? "30 day" : "Current"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>
      )}

      {/* 5. Compliance */}
      <Section title="5. Compliance &amp; Safety">
        <div className="mb-3 flex items-center gap-4 text-sm">
          <span className="text-ink-500">Days since last injury:</span>
          <span className={`font-heading text-2xl font-bold ${comp.daysSinceInjury > 30 ? "text-green-600" : "text-red-600"}`}>
            {comp.daysSinceInjury > 900 ? "0 recorded" : comp.daysSinceInjury}
          </span>
        </div>
        {comp.incidents.length === 0 ? (
          <EmptyState msg="No incidents this period." />
        ) : (
          <div className="overflow-x-auto rounded-card border border-ink-200">
            <table className="w-full text-xs">
              <thead className="border-b border-ink-200 bg-ink-50">
                <tr>{["Date","Type","Description","Severity","Open days","Status"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-ink-400">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {comp.incidents.map((inc, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-ink-500">{inc.date}</td>
                    <td className="px-3 py-2 font-medium">{inc.type}</td>
                    <td className="px-3 py-2 text-ink-600">{inc.description}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        inc.severity === "High" || inc.severity === "Critical" ? "bg-red-100 text-red-700"
                        : inc.severity === "Medium" ? "bg-amber-100 text-amber-700"
                        : "bg-ink-100 text-ink-600"}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${inc.openDays > 3 ? "text-red-600" : "text-ink-600"}`}>{inc.openDays}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${inc.status === "Resolved" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {inc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* 6. Outlook */}
      {data.outlook.length > 0 && (
        <Section title="6. Next Period Outlook">
          <div className="space-y-2">
            {data.outlook.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-card border border-ink-200 bg-white px-4 py-3">
                <span className="text-lg">{item.type === "delivery" ? "🚚" : item.type === "material" ? "📦" : "📅"}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                  {item.note && <p className="mt-0.5 text-xs text-ink-500">{item.note}</p>}
                </div>
                {item.date && <span className="shrink-0 text-xs text-ink-400">{item.date}</span>}
              </div>
            ))}
          </div>
          {j.forwardWeeks < 6 && (
            <Alert level="amber" title="Forward load below target — push quoting this week."
              body={`${j.forwardWeeks} weeks confirmed. Target: 6+ weeks.`} />
          )}
        </Section>
      )}
    </div>
  );
}

// ── Micro-components ─────────────────────────────────────────────────────────
function Section({ title, children, badge }: { title: string; children: React.ReactNode; badge?: string }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between border-b-2 border-ink-900 pb-2">
        <h3 className="font-heading text-base font-bold text-ink-900" dangerouslySetInnerHTML={{ __html: title }} />
        {badge && <span className="rounded-full bg-ink-900 px-2.5 py-1 text-[10px] font-semibold text-brand-orange" dangerouslySetInnerHTML={{ __html: badge }} />}
      </div>
      {children}
    </div>
  );
}
function SubTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-500">{children}</p>;
}
function KpiCard({ label, value, note, noteClass }: { label: string; value: string; note?: string; noteClass?: string }) {
  return (
    <div className="rounded-card border border-ink-200 bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-ink-900">{value}</p>
      {note && <p className={`mt-0.5 text-[10px] font-medium ${noteClass ?? "text-ink-400"}`}>{note}</p>}
    </div>
  );
}
function Alert({ level, title, body }: { level: "red" | "amber" | "green"; title: string; body?: string }) {
  const c = level === "red" ? "border-red-400 bg-red-50" : level === "amber" ? "border-amber-400 bg-amber-50" : "border-green-400 bg-green-50";
  const tc = level === "red" ? "text-red-800" : level === "amber" ? "text-amber-800" : "text-green-800";
  return (
    <div className={`my-2 rounded-r-lg border-l-4 px-3 py-2.5 ${c}`}>
      <p className={`text-xs font-bold ${tc}`}>{title}</p>
      {body && <p className={`mt-0.5 text-xs ${tc} opacity-80`}>{body}</p>}
    </div>
  );
}
function EmptyState({ msg }: { msg: string }) {
  return <p className="py-4 text-center text-sm text-ink-400">{msg}</p>;
}
function StockBlock({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-center ${className}`}>
      <p className="text-[10px] font-semibold uppercase text-ink-400">{label}</p>
      <p className="font-heading text-lg font-bold text-ink-900">{value}</p>
    </div>
  );
}
function Op({ sign, color }: { sign: string; color: string }) {
  return <span className={`text-xl font-bold ${color}`}>{sign}</span>;
}
function PnlRow({ label, value, valueClass = "text-ink-900" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-500">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

const CAB_COLORS = ["bg-brand-orange","bg-orange-400","bg-orange-300","bg-orange-200","bg-amber-400","bg-amber-300"];
function TypeBars({ totals }: { totals: Record<string, number> }) {
  const items = Object.entries(totals).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
  const max = Math.max(...items.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      {items.map(([k, v], i) => (
        <div key={k} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs text-ink-600">{CAB_LABELS[k] || k.replace("cab_", "")}</span>
          <div className="flex-1 h-4 overflow-hidden rounded-full bg-ink-100">
            <div className={`h-full rounded-full transition-all ${CAB_COLORS[i] ?? "bg-brand-orange"}`}
              style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-xs font-bold">{v}</span>
        </div>
      ))}
    </div>
  );
}
function ProdLineChart({ series }: { series: { date: string; value: number }[] }) {
  if (!series.length) return <EmptyState msg="No data for this period." />;
  const max = Math.max(...series.map((s) => s.value), 1);
  const W = 560; const H = 120; const PT = 20; const PB = 24; const PL = 6; const PR = 6;
  const cW = W - PL - PR; const cH = H - PT - PB;
  const step = series.length > 1 ? cW / (series.length - 1) : cW;
  const pts = series.map((s, i) => ({
    x: PL + i * step,
    y: PT + cH - (s.value / max) * cH,
    ...s,
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      <polyline
        points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((pt) => (
        <g key={pt.date}>
          <circle cx={pt.x} cy={pt.y} r="4" fill="#ea580c" />
          {pt.value > 0 && (
            <text x={pt.x} y={pt.y - 6} textAnchor="middle" fontSize="9" fontWeight="600" fill="#ea580c">{pt.value}</text>
          )}
          <text x={pt.x} y={H - 4} textAnchor="middle" fontSize="8" fill="#9ca3af">
            {new Date(pt.date + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short" })}
          </text>
        </g>
      ))}
    </svg>
  );
}
