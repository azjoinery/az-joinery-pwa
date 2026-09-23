"use client";

/**
 * Office — Purchasing queue.
 *
 * The live replacement for the old mock "Purchase Alerts". Reads the real
 * pipeline office-queue (every released job's short materials, grouped by
 * supplier) and lets Office raise a draft purchase order for a job's lines in
 * one tap. Creating the PO flips those materials to "Ordered", which advances
 * the job out of "Awaiting Materials" on the dashboard automatically.
 *
 * New, self-contained page at /office. Reachable now by URL; add it to the
 * menu when ready.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";

type OfficeLine = {
  id: string;
  jobId: string;
  jobNum?: string;
  client?: string;
  description: string;
  category?: string;
  productCode?: string;
  qty: number;
  unit?: string;
  materialStatus?: string;
  requiredBy?: string;
};
type OfficeSupplier = {
  supplier: string;
  jobCount: number;
  lineCount: number;
  lines: OfficeLine[];
};
type OfficeQueue = {
  totalLines: number;
  totalJobs: number;
  suppliers: OfficeSupplier[];
};

const CAN_ORDER = new Set(["office", "admin", "manager", "managing_director"]);

export default function OfficePage() {
  const { user } = useAuth();
  const canOrder = !!user && CAN_ORDER.has(user.role);

  const [queue, setQueue] = useState<OfficeQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api.get<OfficeQueue>("/pipeline/office-queue");
      setQueue(d);
    } catch {
      setError("Couldn't load the purchasing queue. Tap Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createPO = async (supplier: string, jobId: string, jobNum: string, lineIds: string[]) => {
    const key = `${supplier}::${jobId}`;
    setBusyKey(key);
    setMessage("");
    try {
      const po = await api.post<{ poNumber?: string }>(
        `/jobs/${jobId}/materials/create-po`,
        { supplier, materialIds: lineIds }
      );
      setMessage(`Draft PO ${po?.poNumber || ""} created for job #${jobNum}. It's in the PO tracker.`);
      await load();
    } catch {
      setMessage("Couldn't create that PO. Please try again.");
    } finally {
      setBusyKey(null);
    }
  };

  const totals = queue
    ? { lines: queue.totalLines, jobs: queue.totalJobs, suppliers: queue.suppliers.length }
    : { lines: 0, jobs: 0, suppliers: 0 };

  if (!user) return null;

  return (
    <div className="page pb-28">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Office</p>
          <h1 className="page-title mt-1">Purchasing</h1>
          <p className="mt-1 text-sm text-ink-500">
            Everything released jobs still need — grouped by supplier.
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
        <div className="mb-4 rounded-card border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-card border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
          {message}
        </div>
      ) : null}

      {/* Summary */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Metric label="Items to order" value={totals.lines} />
        <Metric label="Jobs" value={totals.jobs} />
        <Metric label="Suppliers" value={totals.suppliers} />
      </div>

      {loading ? (
        <Empty text="Loading purchasing queue…" />
      ) : !queue || queue.suppliers.length === 0 ? (
        <Empty text="Nothing to order — every released job has its materials." />
      ) : (
        <div className="space-y-4">
          {queue.suppliers.map((sup) => (
            <SupplierCard
              key={sup.supplier}
              supplier={sup}
              canOrder={canOrder}
              busyKey={busyKey}
              onCreatePO={createPO}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierCard({
  supplier,
  canOrder,
  busyKey,
  onCreatePO,
}: {
  supplier: OfficeSupplier;
  canOrder: boolean;
  busyKey: string | null;
  onCreatePO: (supplier: string, jobId: string, jobNum: string, lineIds: string[]) => void;
}) {
  // Group this supplier's lines by job so a PO can be raised per job.
  const jobs = useMemo(() => {
    const map = new Map<string, { jobId: string; jobNum: string; client: string; lines: OfficeLine[] }>();
    for (const ln of supplier.lines) {
      const g = map.get(ln.jobId) || {
        jobId: ln.jobId,
        jobNum: ln.jobNum || "",
        client: ln.client || "",
        lines: [],
      };
      g.lines.push(ln);
      map.set(ln.jobId, g);
    }
    return Array.from(map.values());
  }, [supplier.lines]);

  return (
    <div className="overflow-hidden rounded-card border border-ink-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-heading text-base font-semibold text-ink-900">{supplier.supplier}</h2>
          <p className="text-xs text-ink-500">
            {supplier.lineCount} item{supplier.lineCount === 1 ? "" : "s"} · {supplier.jobCount} job
            {supplier.jobCount === 1 ? "" : "s"}
          </p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-orange/10 font-heading text-sm font-bold tabular text-brand-orange-dark">
          {supplier.lineCount}
        </span>
      </div>

      <div className="divide-y divide-ink-100">
        {jobs.map((job) => {
          const key = `${supplier.supplier}::${job.jobId}`;
          const busy = busyKey === key;
          return (
            <div key={job.jobId} className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Link href="/jobs" className="text-sm font-semibold text-ink-900">
                  #{job.jobNum} · {job.client}
                </Link>
                {canOrder ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      onCreatePO(
                        supplier.supplier,
                        job.jobId,
                        job.jobNum,
                        job.lines.map((l) => l.id)
                      )
                    }
                    className="shrink-0 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {busy ? "Creating…" : "Create draft PO"}
                  </button>
                ) : null}
              </div>
              <ul className="space-y-1">
                {job.lines.map((ln) => (
                  <li key={ln.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink-700">
                      {ln.description}
                      {ln.requiredBy ? (
                        <span className="text-ink-400"> · by {ln.requiredBy}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-heading font-semibold tabular text-ink-900">
                      {formatQty(ln.qty)} {ln.unit || ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-ink-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold tabular tracking-tight text-ink-900">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-card border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-400">
      {text}
    </div>
  );
}

function formatQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
