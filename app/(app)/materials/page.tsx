"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type ReleaseListItem = { description: string; quantity: number; unit?: string; stockItemId?: string; };

type JobPick = {
  id: string;
  jobNum?: string;
  client?: string;
  projectName?: string;
  releasedMaterialList?: ReleaseListItem[];
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
  notes?: string;
  createdAt?: string;
};

type ManagementTab = "track" | "mine";
const CAP_ADJUST_ROLES = new Set(["supervisor", "manager", "managing_director", "admin", "department_manager"]);
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
  const canTrack = Boolean(user && TRACK_ROLES.has(user.role));
  const canAdjustCap = Boolean(user && CAP_ADJUST_ROLES.has(user.role));
  const [managementTab, setManagementTab] = useState<ManagementTab>("track");
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
  const lowStock = stock.filter((item) =>
    Number(item.on_hand_qty || 0) <= Number(item.reorder_point || 0)
  ).length;
  const activeJobs = new Set(usageRows.map((item) => item.row.jobId).filter(Boolean)).size;

  const myMaterials = mine?.materials || [];
  const visibleMine = myMaterials.filter((row) =>
    (row.assignedQty || 0) > 0 || (row.qty || 0) > 0
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
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object" && Array.isArray(detail.violations)) {
        setError("Allocation exceeded:\n• " + detail.violations.join("\n• "));
      } else {
        setError("Usage was not saved. Please try again.");
      }
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
            {canTrack ? "Track and review workshop material usage." : "Record only what you actually used."}
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
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-ink-100 p-1">
            <TabButton active={managementTab === "track"} onClick={() => setManagementTab("track")}>Track</TabButton>
            <TabButton active={managementTab === "mine"} onClick={() => setManagementTab("mine")}>My usage</TabButton>
          </div>

          {managementTab === "track" ? (
            <TrackView
              loading={loading}
              period={period}
              setPeriod={setPeriod}
              usedTotal={usedTotal}
              lowStock={lowStock}
              activeJobs={activeJobs}
              rows={usageRows}
              assemblyRows={assemblyRows}
              transactions={transactions.filter((tx) => dateFromIso(tx.createdAt) >= periodStart)}
              stockById={stockById}
              jobsById={jobsById}
              canAdjustCap={canAdjustCap}
              onDeleteEntry={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
              onCapAdjusted={(jobId, stockItemId, newQty) => {
                setJobs((prev) => prev.map((j) => {
                  if (j.id !== jobId) return j;
                  const list = (j.releasedMaterialList || []).map((m) =>
                    m.stockItemId === stockItemId ? { ...m, quantity: newQty } : m
                  );
                  return { ...j, releasedMaterialList: list };
                }));
              }}
            />
          ) : null}

          {managementTab === "mine" ? (
            <MyUsage
              loading={loading}
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

function TrackView({ loading, period, setPeriod, usedTotal, lowStock, activeJobs, rows, assemblyRows, transactions, stockById, jobsById, canAdjustCap, onDeleteEntry, onCapAdjusted }: {
  loading: boolean;
  period: "today" | "week";
  setPeriod: (value: "today" | "week") => void;
  usedTotal: number;
  lowStock: number;
  activeJobs: number;
  rows: Array<{ entry: DailyEntry; row: EntryMaterial }>;
  assemblyRows: DailyEntry[];
  transactions: StockTransaction[];
  stockById: Map<string, StockItem>;
  jobsById: Map<string, JobPick>;
  canAdjustCap: boolean;
  onDeleteEntry: (id: string) => void;
  onCapAdjusted: (jobId: string, stockItemId: string, newQty: number) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterJobId, setFilterJobId] = useState<string>("");
  const [adjusting, setAdjusting] = useState<{ jobId: string; stockItemId: string; currentQty: number; description: string } | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  const deleteEntry = async (id: string) => {
    if (!window.confirm("Delete this daily log entry? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/entries/${id}`);
      onDeleteEntry(id);
    } catch {
      // non-fatal — entry stays in list if delete fails
    } finally {
      setDeletingId(null);
    }
  };

  const jobOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ id: string; label: string }> = [];
    for (const { row } of rows) {
      if (row.jobId && !seen.has(row.jobId)) {
        seen.add(row.jobId);
        const job = jobsById.get(row.jobId);
        options.push({ id: row.jobId, label: job ? jobLabel(job) : row.jobId });
      }
    }
    return options;
  }, [rows, jobsById]);

  const filteredRows = filterJobId ? rows.filter(({ row }) => row.jobId === filterJobId) : rows;
  const filteredAssembly = filterJobId
    ? assemblyRows.filter((e) => e.jobCounts && Number(e.jobCounts[filterJobId] || 0) > 0)
    : assemblyRows;

  // Per-(jobId, stockItemId) total usage across all entries in the period
  const usageTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const { row } of rows) {
      if (!row.jobId || !row.stockItemId) continue;
      const k = `${row.jobId}__${row.stockItemId}`;
      map.set(k, (map.get(k) || 0) + Number(row.qty || 0));
    }
    return map;
  }, [rows]);

  // Cap allocation rows: derived from each job's releasedMaterialList for jobs visible in rows
  const allocationRows = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ jobId: string; stockItemId: string; description: string; cap: number; unit: string; used: number; job: JobPick }> = [];
    for (const { row } of rows) {
      if (!row.jobId) continue;
      const job = jobsById.get(row.jobId);
      const relList = job?.releasedMaterialList;
      if (!relList) continue;
      for (const r of relList) {
        if (!r.stockItemId) continue;
        const k = `${row.jobId}__${r.stockItemId}`;
        if (seen.has(k)) continue;
        seen.add(k);
        result.push({
          jobId: row.jobId,
          stockItemId: r.stockItemId,
          description: r.description,
          cap: Number(r.quantity),
          unit: r.unit || "",
          used: usageTotals.get(k) || 0,
          job: job!,
        });
      }
    }
    return result;
  }, [rows, jobsById, usageTotals]);

  // Per-(jobId, stockItemId) → list of { worker, qty } for per-worker breakdown
  const workersByMaterial = useMemo(() => {
    const map = new Map<string, Array<{ worker: string; qty: number }>>();
    for (const { entry, row } of rows) {
      if (!row.jobId || !row.stockItemId) continue;
      const k = `${row.jobId}__${row.stockItemId}`;
      const list = map.get(k) || [];
      const qty = Number(row.qty || 0);
      if (qty > 0) list.push({ worker: entry.employeeName || "Worker", qty });
      map.set(k, list);
    }
    return map;
  }, [rows]);

  const submitAdjust = async () => {
    if (!adjusting) return;
    const newQty = parseFloat(adjustQty);
    if (!newQty || newQty <= 0 || !adjustNote.trim()) return;
    setAdjustSaving(true);
    setAdjustError("");
    try {
      await api.patch(`/jobs/${adjusting.jobId}/material-allocation`, {
        stockItemId: adjusting.stockItemId,
        newQuantity: newQty,
        note: adjustNote.trim(),
      });
      onCapAdjusted(adjusting.jobId, adjusting.stockItemId, newQty);
      setAdjusting(null);
      setAdjustQty("");
      setAdjustNote("");
    } catch {
      setAdjustError("Could not update — check your connection and try again.");
    } finally {
      setAdjustSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setPeriod("today")} className={`rounded-full px-4 py-2 text-sm font-semibold ${period === "today" ? "bg-brand-orange text-white" : "bg-white text-ink-600"}`}>Today</button>
        <button type="button" onClick={() => setPeriod("week")} className={`rounded-full px-4 py-2 text-sm font-semibold ${period === "week" ? "bg-brand-orange text-white" : "bg-white text-ink-600"}`}>This week</button>
        {jobOptions.length > 0 && (
          <select value={filterJobId} onChange={(e) => setFilterJobId(e.target.value)} className="ml-auto rounded-full border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700">
            <option value="">All jobs</option>
            {jobOptions.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select>
        )}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Metric label="Used today" value={usedTotal} />
        <Metric label="Low stock" value={lowStock} warning />
        <Metric label="Active jobs" value={activeJobs} />
      </div>

      {/* Allocation caps — only shown when at least one job has a releasedMaterialList */}
      {allocationRows.length > 0 && (
        <section className="mb-6">
          <h2 className="section-title mb-3">Allocation caps</h2>
          <div className="space-y-3">
            {(filterJobId ? allocationRows.filter((r) => r.jobId === filterJobId) : allocationRows).map((r) => {
              const pct = r.cap > 0 ? Math.min(100, Math.round((r.used / r.cap) * 100)) : 0;
              const over = r.used > r.cap;
              const near = !over && pct >= 80;
              const barColor = over ? "bg-red-500" : near ? "bg-amber-400" : "bg-green-500";
              return (
                <div key={`${r.jobId}__${r.stockItemId}`} className="rounded-xl border border-ink-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-950">{r.description}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{jobLabel(r.job)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${over ? "bg-red-100 text-red-700" : near ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {r.used} / {r.cap} {r.unit}
                      </span>
                      {canAdjustCap && (
                        <button
                          type="button"
                          onClick={() => { setAdjusting({ jobId: r.jobId, stockItemId: r.stockItemId, currentQty: r.cap, description: r.description }); setAdjustQty(String(r.cap)); setAdjustNote(""); setAdjustError(""); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Adjust
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  {over && <p className="mt-1.5 text-xs font-semibold text-red-600">Over allocation — supervisor review needed.</p>}
                  {(() => {
                    const workers = workersByMaterial.get(`${r.jobId}__${r.stockItemId}`) || [];
                    if (workers.length === 0) return null;
                    return (
                      <div className="mt-3 border-t border-ink-100 pt-2.5">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">Used by</p>
                        <div className="space-y-1">
                          {workers.map((w, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-ink-600">{w.worker}</span>
                              <span className="font-semibold tabular-nums text-ink-900">{w.qty} {r.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Adjust allocation inline modal */}
          {adjusting && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-900">Adjust allocation — {adjusting.description}</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-blue-700">New quantity</label>
                  <input type="number" min={0} value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} className="mt-1 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-blue-700">Reason / note (required)</label>
                <textarea value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm resize-none" placeholder="e.g. Extra sheet needed for panel rework" />
              </div>
              {adjustError && <p className="text-xs text-red-600">{adjustError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={submitAdjust} disabled={adjustSaving || !adjustQty || !adjustNote.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                  {adjustSaving ? "Saving…" : "Save adjustment"}
                </button>
                <button type="button" onClick={() => setAdjusting(null)} className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700">Cancel</button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="mb-6">
        <h2 className="section-title mb-3">Material usage</h2>
        {loading ? <Empty text="Loading materials…" /> : filteredRows.length === 0 ? <Empty text="No material activity for this period." /> : (
          <div className="space-y-3">
            {filteredRows.map(({ entry, row }, index) => {
              const item = stockById.get(row.stockItemId);
              const used = Number(row.qty || 0);
              return (
                <div key={`${entry.id}-${row.stockItemId}-${index}`} className="rounded-xl border border-ink-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-ink-950">{item?.name || row.notes?.replace("Released material: ", "") || "Material"}</h3>
                      <p className="mt-0.5 truncate text-xs text-ink-500">{jobLabel(jobsById.get(row.jobId || ""))}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold tabular-nums text-ink-900">{used} {item?.unit || ""}</p>
                      <p className="text-xs text-ink-500">{entry.employeeName || "Worker"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="section-title mb-3">Assembly output</h2>
        {loading ? <Empty text="Loading assembly data…" /> : filteredAssembly.length === 0 ? <Empty text="No assembly recorded for this period." /> : (
          <div className="space-y-3">
            {filteredAssembly.map((entry) => {
              const total = Object.values(entry.counts || {}).reduce((s, v) => s + Number(v), 0);
              return (
                <div key={entry.id} className="rounded-xl border border-ink-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink-950">{entry.employeeName || "Worker"}</h3>
                      <p className="mt-0.5 text-sm text-ink-500">{entry.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">{total} cabinets</span>
                      <button onClick={() => deleteEntry(entry.id)} disabled={deletingId === entry.id} className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40">
                        {deletingId === entry.id ? "…" : "Delete"}
                      </button>
                    </div>
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
                  {tx.txType === "return" && tx.notes?.startsWith("entry:") && (
                    <span className="mb-0.5 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">correction</span>
                  )}
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

function MyUsage({ loading, rows, allRows, stockById, jobsById, setQuantity, save, saving }: {
  loading: boolean;
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
      {loading ? <Empty text="Loading your materials…" /> : rows.length === 0 ? <Empty text="No materials recorded yet." /> : (
        <div className="space-y-4">
          {rows.map((row, visibleIndex) => {
            const index = allRows.indexOf(row);
            const item = stockById.get(row.stockItemId);
            const displayName = item?.name || row.notes?.replace("Released material: ", "") || "Material";
            return (
              <div key={`${row.stockItemId}-${row.jobId}-${visibleIndex}`} className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-bold text-ink-950">{displayName}</h2>
                <p className="text-sm text-ink-500">{jobLabel(jobsById.get(row.jobId || ""))}</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button type="button" disabled={(row.qty || 0) <= 0} onClick={() => setQuantity(index, Number(row.qty || 0) - 1)} className="grid h-14 w-14 place-items-center rounded-xl border border-ink-200 bg-ink-50 text-2xl font-bold disabled:opacity-40" aria-label={`Decrease ${displayName}`}>−</button>
                  <input type="number" min="0" step="1" value={row.qty || 0} onChange={(event) => setQuantity(index, Number(event.target.value))} className="h-14 w-24 rounded-xl border border-ink-200 text-center text-2xl font-bold tabular-nums" aria-label={`Quantity used for ${displayName}`} />
                  <button type="button" onClick={() => setQuantity(index, Number(row.qty || 0) + 1)} className="grid h-14 w-14 place-items-center rounded-xl bg-brand-orange text-3xl font-bold text-white" aria-label={`Increase ${displayName}`}>+</button>
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
