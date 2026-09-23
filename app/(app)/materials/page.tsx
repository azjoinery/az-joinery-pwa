"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MaterialAssignmentPanel from "@/lib/components/MaterialAssignmentPanel";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import type { DailyEntry, EntryMaterial } from "@/lib/types";

type StockItem = {
  id: string;
  name: string;
  unit?: string;
  on_hand_qty?: number;
  reorder_point?: number;
};

type JobPick = {
  id: string;
  jobNum?: string;
  client?: string;
  projectName?: string;
};

type StockTransaction = {
  id: string;
  itemName?: string;
  qty?: number;
  unit?: string;
  new_on_hand?: number;
  jobId?: string;
  userName?: string;
  txType?: string;
  createdAt?: string;
};

type ManagementTab = "track" | "assign" | "mine";
type WorkerTab = "assigned" | "used";

const ASSIGN_ROLES = new Set(["supervisor", "admin", "manager", "managing_director"]);
const TRACK_ROLES = new Set([
  "supervisor",
  "admin",
  "manager",
  "managing_director",
  "department_manager",
  "office",
]);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateFromIso(value?: string) {
  return value ? value.slice(0, 10) : "";
}

function jobLabel(job?: JobPick) {
  if (!job) return "General workshop";
  return [job.jobNum, job.client || job.projectName].filter(Boolean).join(" · ") || "Job";
}

export default function MaterialsPage() {
  const { user } = useAuth();
  const canAssign = Boolean(user && ASSIGN_ROLES.has(user.role));
  const canTrack = Boolean(user && TRACK_ROLES.has(user.role));
  const [managementTab, setManagementTab] = useState<ManagementTab>("track");
  const [workerTab, setWorkerTab] = useState<WorkerTab>("assigned");
  const [period, setPeriod] = useState<"today" | "week">("today");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [jobs, setJobs] = useState<JobPick[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [mine, setMine] = useState<DailyEntry | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const common = [
        api.get<StockItem[]>("/stock/items?active=true"),
        api.get<JobPick[]>("/jobs"),
        api.get<DailyEntry>(`/entries/mine?date=${todayKey()}`),
      ] as const;
      const management = canTrack
        ? Promise.all([
            api.get<DailyEntry[]>("/entries"),
            api.get<StockTransaction[]>("/stock/transactions?limit=100"),
          ])
        : Promise.resolve<[DailyEntry[], StockTransaction[]]>([[], []]);
      const [[stockRows, jobRows, myEntry], [entryRows, txRows]] = await Promise.all([
        Promise.all(common),
        management,
      ]);
      setStock(stockRows || []);
      setJobs(jobRows || []);
      setMine(myEntry || null);
      setEntries(entryRows || []);
      setTransactions(txRows || []);
    } catch {
      setError("Materials could not be loaded. Pull down or tap Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, [canTrack, user]);

  useEffect(() => {
    load();
  }, [load]);

  const stockById = useMemo(() => new Map(stock.map((item) => [item.id, item])), [stock]);
  const jobsById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const periodStart = useMemo(() => {
    if (period === "today") return todayKey();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return start.toISOString().slice(0, 10);
  }, [period]);

  const usageRows = useMemo(() => entries.flatMap((entry) => {
    if (entry.date < periodStart) return [];
    return (entry.materials || [])
      .filter((row) => (row.assignedQty || 0) > 0 || (row.qty || 0) > 0)
      .map((row) => ({ entry, row }));
  }), [entries, periodStart]);

  const assemblyRows = useMemo(() => entries.filter((entry) => {
    if (entry.date < periodStart) return false;
    const total = Object.values(entry.counts || {}).reduce((s, v) => s + Number(v), 0);
    return total > 0;
  }), [entries, periodStart]);

  const usedTotal = usageRows.reduce((sum, item) => sum + Number(item.row.qty || 0), 0);
  const assignedTotal = usageRows.reduce((sum, item) => sum + Number(item.row.assignedQty || 0), 0);
  const lowStock = stock.filter((item) =>
    Number(item.on_hand_qty || 0) <= Number(item.reorder_point || 0)
  ).length;
  const activeJobs = new Set(usageRows.map((item) => item.row.jobId).filter(Boolean)).size;

  const myMaterials = mine?.materials || [];
  const visibleMine = myMaterials.filter((row) =>
    workerTab === "assigned" ? (row.assignedQty || 0) > 0 : (row.qty || 0) > 0
  );

  const setMyQuantity = (index: number, value: number) => {
    setMine((current) => {
      if (!current) return current;
      const materials = [...(current.materials || [])];
      materials[index] = { ...materials[index], qty: Math.max(0, value || 0) };
      return { ...current, materials };
    });
  };

  const saveMyUsage = async () => {
    if (!mine) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const saved = await api.post<DailyEntry>("/entries", {
        date: todayKey(),
        counts: mine.counts || {},
        note: mine.note || "",
        materials: mine.materials || [],
      });
      setMine(saved);
      setMessage("Saved. Inventory has been updated.");
      if (canTrack) await load();
    } catch {
      setError("Usage was not saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="page pb-28">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Workshop</p>
          <h1 className="page-title mt-1">{canTrack ? "Materials" : "My materials"}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {canTrack ? "Assign, track and review workshop materials." : "Record only what you actually used."}
          </p>
        </div>
        <button type="button" onClick={load} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700">
          Refresh
        </button>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div> : null}
      {message ? <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">{message}</div> : null}

      {canTrack ? (
        <>
          <div className="mb-5 grid grid-cols-3 gap-2 rounded-xl bg-ink-100 p-1">
            <TabButton active={managementTab === "track"} onClick={() => setManagementTab("track")}>Track</TabButton>
            {canAssign ? <TabButton active={managementTab === "assign"} onClick={() => setManagementTab("assign")}>Assign</TabButton> : <span />}
            <TabButton active={managementTab === "mine"} onClick={() => setManagementTab("mine")}>My usage</TabButton>
          </div>

          {managementTab === "track" ? (
            <TrackView
              loading={loading}
              period={period}
              setPeriod={setPeriod}
              usedTotal={usedTotal}
              assignedTotal={assignedTotal}
              lowStock={lowStock}
              activeJobs={activeJobs}
              rows={usageRows}
              assemblyRows={assemblyRows}
              transactions={transactions.filter((tx) => dateFromIso(tx.createdAt) >= periodStart)}
              stockById={stockById}
              jobsById={jobsById}
            />
          ) : null}

          {managementTab === "assign" && canAssign ? <MaterialAssignmentPanel /> : null}

          {managementTab === "mine" ? (
            <MyUsage
              loading={loading}
              tab={workerTab}
              setTab={setWorkerTab}
              rows={visibleMine}
              allRows={myMaterials}
              stockById={stockById}
              jobsById={jobsById}
              setQuantity={setMyQuantity}
              save={saveMyUsage}
              saving={saving}
            />
          ) : null}
        </>
      ) : (
        <MyUsage
          loading={loading}
          tab={workerTab}
          setTab={setWorkerTab}
          rows={visibleMine}
          allRows={myMaterials}
          stockById={stockById}
          jobsById={jobsById}
          setQuantity={setMyQuantity}
          save={saveMyUsage}
          saving={saving}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${active ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>
      {children}
    </button>
  );
}

const CABINET_LABELS: Record<string, string> = {
  cab_small: "Small",
  cab_tall: "Tall",
  cab_drawer: "Drawer / corner",
  cab_special: "Special",
};

function TrackView({ loading, period, setPeriod, usedTotal, assignedTotal, lowStock, activeJobs, rows, assemblyRows, transactions, stockById, jobsById }: {
  loading: boolean;
  period: "today" | "week";
  setPeriod: (value: "today" | "week") => void;
  usedTotal: number;
  assignedTotal: number;
  lowStock: number;
  activeJobs: number;
  rows: Array<{ entry: DailyEntry; row: EntryMaterial }>;
  assemblyRows: DailyEntry[];
  transactions: StockTransaction[];
  stockById: Map<string, StockItem>;
  jobsById: Map<string, JobPick>;
}) {
  return (
    <>
      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setPeriod("today")} className={`rounded-full px-4 py-2 text-sm font-semibold ${period === "today" ? "bg-brand-orange text-white" : "bg-white text-ink-600"}`}>Today</button>
        <button type="button" onClick={() => setPeriod("week")} className={`rounded-full px-4 py-2 text-sm font-semibold ${period === "week" ? "bg-brand-orange text-white" : "bg-white text-ink-600"}`}>This week</button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Used" value={usedTotal} />
        <Metric label="Assigned" value={assignedTotal} />
        <Metric label="Low stock" value={lowStock} warning />
        <Metric label="Active jobs" value={activeJobs} />
      </div>

      <section className="mb-6">
        <h2 className="section-title mb-3">Material usage</h2>
        {loading ? <Empty text="Loading materials…" /> : rows.length === 0 ? <Empty text="No material activity for this period." /> : (
          <div className="space-y-3">
            {rows.map(({ entry, row }, index) => {
              const item = stockById.get(row.stockItemId);
              const assigned = Number(row.assignedQty || 0);
              const used = Number(row.qty || 0);
              const complete = assigned > 0 && used >= assigned;
              const width = assigned > 0 ? Math.min(100, Math.round((used / assigned) * 100)) : 0;
              return (
                <div key={`${entry.id}-${row.stockItemId}-${index}`} className="rounded-xl border border-ink-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-ink-950">{item?.name || "Material"}</h3>
                      <p className="mt-0.5 truncate text-sm text-ink-500">{jobLabel(jobsById.get(row.jobId || ""))} · {entry.employeeName}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${complete ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      {complete ? "Complete" : "In progress"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-ink-500">Used / assigned</span>
                    <strong className="tabular-nums text-ink-900">{used} / {assigned || "—"} {item?.unit || ""}</strong>
                  </div>
                  {assigned > 0 ? <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100"><div className={`h-full rounded-full ${complete ? "bg-green-500" : "bg-brand-orange"}`} style={{ width: `${width}%` }} /></div> : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="section-title mb-3">Assembly output</h2>
        {loading ? <Empty text="Loading assembly data…" /> : assemblyRows.length === 0 ? <Empty text="No assembly recorded for this period." /> : (
          <div className="space-y-3">
            {assemblyRows.map((entry) => {
              const total = Object.values(entry.counts || {}).reduce((s, v) => s + Number(v), 0);
              return (
                <div key={entry.id} className="rounded-xl border border-ink-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink-950">{entry.employeeName || "Worker"}</h3>
                      <p className="mt-0.5 text-sm text-ink-500">{entry.date}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">{total} cabinets</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(entry.counts || {}).filter(([, v]) => Number(v) > 0).map(([key, v]) => (
                      <span key={key} className="rounded-full border border-ink-200 bg-ink-50 px-2.5 py-0.5 text-xs text-ink-700">
                        {CABINET_LABELS[key] || key}: <strong>{v}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title mb-3">Recent stock changes</h2>
        {transactions.length === 0 ? <Empty text="No stock changes for this period." /> : (
          <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
            {transactions.slice(0, 12).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 border-b border-ink-100 p-4 last:border-0">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{tx.itemName || "Material"}</p>
                  <p className="truncate text-xs text-ink-500">{tx.userName || "Team"} · {jobLabel(jobsById.get(tx.jobId || ""))}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold tabular-nums ${tx.txType === "return" || tx.txType === "receipt" ? "text-green-600" : "text-red-600"}`}>
                    {tx.txType === "return" || tx.txType === "receipt" ? "+" : "−"}{tx.qty || 0} {tx.unit || ""}
                  </p>
                  <p className="text-xs text-ink-400">{tx.new_on_hand ?? "—"} on hand</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function MyUsage({ loading, tab, setTab, rows, allRows, stockById, jobsById, setQuantity, save, saving }: {
  loading: boolean;
  tab: WorkerTab;
  setTab: (value: WorkerTab) => void;
  rows: EntryMaterial[];
  allRows: EntryMaterial[];
  stockById: Map<string, StockItem>;
  jobsById: Map<string, JobPick>;
  setQuantity: (index: number, value: number) => void;
  save: () => void;
  saving: boolean;
}) {
  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1">
        <TabButton active={tab === "assigned"} onClick={() => setTab("assigned")}>Assigned</TabButton>
        <TabButton active={tab === "used"} onClick={() => setTab("used")}>Used</TabButton>
      </div>
      {loading ? <Empty text="Loading your materials…" /> : rows.length === 0 ? <Empty text={tab === "assigned" ? "Nothing assigned to you today." : "You have not recorded any material today."} /> : (
        <div className="space-y-4">
          {rows.map((row, visibleIndex) => {
            const index = allRows.indexOf(row);
            const item = stockById.get(row.stockItemId);
            return (
              <div key={`${row.stockItemId}-${row.jobId}-${visibleIndex}`} className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-bold text-ink-950">{item?.name || "Material"}</h2>
                <p className="text-sm text-ink-500">{jobLabel(jobsById.get(row.jobId || ""))}</p>
                <p className="mt-2 text-sm font-semibold text-ink-700">Assigned {row.assignedQty || 0} {item?.unit || ""}</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button type="button" disabled={(row.qty || 0) <= 0} onClick={() => setQuantity(index, Number(row.qty || 0) - 1)} className="grid h-14 w-14 place-items-center rounded-xl border border-ink-200 bg-ink-50 text-2xl font-bold disabled:opacity-40" aria-label={`Decrease ${item?.name || "material"}`}>−</button>
                  <input type="number" min="0" step="1" value={row.qty || 0} onChange={(event) => setQuantity(index, Number(event.target.value))} className="h-14 w-24 rounded-xl border border-ink-200 text-center text-2xl font-bold tabular-nums" aria-label={`Quantity used for ${item?.name || "material"}`} />
                  <button type="button" onClick={() => setQuantity(index, Number(row.qty || 0) + 1)} className="grid h-14 w-14 place-items-center rounded-xl bg-brand-orange text-3xl font-bold text-white" aria-label={`Increase ${item?.name || "material"}`}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {rows.length > 0 ? (
        <div className="sticky bottom-20 mt-5 rounded-2xl border border-orange-200 bg-white p-3 shadow-lg lg:bottom-4">
          <button type="button" disabled={saving} onClick={save} className="btn-primary min-h-14 w-full text-base">
            {saving ? "Saving…" : "Save today's usage"}
          </button>
          <p className="mt-2 text-center text-xs text-ink-500">Inventory updates when you save.</p>
        </div>
      ) : null}
    </>
  );
}

function Metric({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className="rounded-xl border border-ink-200 bg-white p-3"><p className="text-xs font-semibold text-ink-500">{label}</p><p className={`mt-1 text-2xl font-bold tabular-nums ${warning && value > 0 ? "text-brand-orange" : "text-ink-950"}`}>{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-400">{text}</div>;
}
