"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

interface FloorWorker {
  id: string;
  name?: string;
  role?: string;
  active?: boolean;
}

interface JobOption {
  id: string;
  jobNum?: string | number;
  client?: string;
  projectName?: string;
}

interface StockOption {
  id: string;
  name: string;
  unit?: string;
  on_hand_qty?: number;
  allocated_qty?: number;
  reserved_qty?: number;
}

const FLOOR_ROLES = new Set(["cabinet_maker", "employee", "contractor", "installer", "supervisor"]);

export default function MaterialAssignmentPanel() {
  const [workers, setWorkers] = useState<FloorWorker[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [stock, setStock] = useState<StockOption[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [jobId, setJobId] = useState("");
  const [stockItemId, setStockItemId] = useState("");
  const [assignedQty, setAssignedQty] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [userRows, jobRows, stockRows] = await Promise.all([
          api.get<FloorWorker[]>("/users"),
          api.get<JobOption[]>("/jobs"),
          api.get<StockOption[]>("/stock/items?active=true"),
        ]);
        setWorkers(userRows.filter(worker => worker.active !== false && FLOOR_ROLES.has(worker.role || "")));
        setJobs(jobRows || []);
        setStock(stockRows || []);
      } catch {
        setError("The assignment lists could not be loaded.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredStock = stock.filter(item =>
    !search.trim() || item.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const selectedStock = stock.find(item => item.id === stockItemId);
  const reserved = selectedStock?.reserved_qty ?? selectedStock?.allocated_qty ?? 0;
  const available = selectedStock ? Math.max(0, Number(selectedStock.on_hand_qty || 0) - Number(reserved)) : 0;

  const assignMaterial = async () => {
    if (!employeeId || !jobId || !stockItemId || assignedQty <= 0) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api.post("/entries/assign-material", {
        employeeId,
        jobId,
        stockItemId,
        assignedQty,
        date: new Date().toISOString().split("T")[0],
      });
      const worker = workers.find(item => item.id === employeeId);
      const material = stock.find(item => item.id === stockItemId);
      setMessage(`${material?.name || "Material"} assigned to ${worker?.name || "the floor team member"}. Stock will only be deducted when actual use is recorded.`);
      setStockItemId("");
      setAssignedQty(1);
      setSearch("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "The material could not be assigned.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-7 overflow-hidden rounded-2xl border border-brand-orange/20 bg-white shadow-card">
      <div className="border-b border-ink-200 bg-gradient-to-r from-brand-orange/10 to-white px-4 py-4 md:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-orange">Materials — live</p>
            <h2 className="mt-1 font-heading text-lg font-semibold text-ink-900">Assign material to the floor</h2>
            <p className="mt-1 text-xs text-ink-500">Choose a team member, job, and material. Assignment does not deduct stock; recorded usage does.</p>
          </div>
          <span className="badge badge-brand">Supervisor tools</span>
        </div>
      </div>

      <div className="p-4 md:p-5">
        {loading ? (
          <div className="skeleton h-40 rounded-xl" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Assign to *</label>
              <select className="input" value={employeeId} onChange={event => setEmployeeId(event.target.value)}>
                <option value="">Select floor team member…</option>
                {workers.map(worker => <option key={worker.id} value={worker.id}>{worker.name} — {(worker.role || "team").replace(/_/g, " ")}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Job *</label>
              <select className="input" value={jobId} onChange={event => setJobId(event.target.value)}>
                <option value="">Select job…</option>
                {jobs.map(job => <option key={job.id} value={job.id}>{[job.jobNum, job.client || job.projectName].filter(Boolean).join(" — ") || job.id}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="label">Find material</label>
              <input className="input mb-2" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search stock by name…" />
              <select className="input" value={stockItemId} onChange={event => setStockItemId(event.target.value)} size={Math.min(5, Math.max(2, filteredStock.length + 1))}>
                <option value="">Select material…</option>
                {filteredStock.map(item => {
                  const itemReserved = item.reserved_qty ?? item.allocated_qty ?? 0;
                  const itemAvailable = Math.max(0, Number(item.on_hand_qty || 0) - Number(itemReserved));
                  return <option key={item.id} value={item.id}>{item.name} — {itemAvailable} {item.unit || ""} available</option>;
                })}
              </select>
            </div>

            <div>
              <label className="label">Assigned quantity *</label>
              <div className="flex items-center gap-2">
                <button type="button" className="grid h-11 w-11 place-items-center rounded-lg border border-ink-300 bg-white text-xl font-bold" onClick={() => setAssignedQty(value => Math.max(1, value - 1))} aria-label="Decrease assigned quantity">−</button>
                <input
                  className="input h-11 min-w-0 text-center text-lg font-bold tabular-nums"
                  type="number"
                  min="1"
                  step="1"
                  value={assignedQty}
                  onChange={event => setAssignedQty(Math.max(1, Number(event.target.value) || 1))}
                  aria-label="Assigned quantity"
                />
                <button type="button" className="grid h-11 w-11 place-items-center rounded-lg bg-brand-orange text-xl font-bold text-white" onClick={() => setAssignedQty(value => value + 1)} aria-label="Increase assigned quantity">+</button>
              </div>
            </div>

            <div className="rounded-xl bg-ink-50 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Live stock</p>
              {selectedStock ? (
                <p className={`mt-1 font-semibold ${available < assignedQty ? "text-danger" : "text-success-dark"}`}>
                  {available} {selectedStock.unit || ""} available
                  {available < assignedQty ? " — assignment exceeds available stock" : ""}
                </p>
              ) : <p className="mt-1 text-ink-500">Select a material to see availability.</p>}
            </div>

            <div className="md:col-span-2">
              <button className="btn-primary w-full" disabled={saving || !employeeId || !jobId || !stockItemId || assignedQty <= 0} onClick={assignMaterial}>
                {saving ? "Assigning…" : "Assign material"}
              </button>
            </div>
          </div>
        )}

        {message && <div className="alert-success mt-4" role="status">{message}</div>}
        {error && <div className="alert-danger mt-4" role="alert">{error}</div>}
      </div>
    </section>
  );
}
