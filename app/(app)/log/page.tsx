"use client";

/**
 * Log page — the searchable history of stock movements.
 *
 * Every counter tap on the maker dashboard, every Receive, every Consume,
 * every Reserve and every adjustment ends up in `stock_transactions` on the
 * server. This page is the single searchable view of that ledger.
 *
 * Reads: GET /stock/transactions?limit=500
 * (Backend already computes and returns time-stamped rows with itemName,
 * qty, txType, jobId, userName, notes, createdAt.)
 *
 * Filters:
 *   - search box: material, job number/id, user, notes
 *   - kind chips: All / Used / Wastage / Received / Returns / Adjust
 *
 * Grouped by business date (Australia/Sydney), newest day first.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import Icon from "@/lib/components/Icon";

interface StockTx {
  id: string;
  itemId: string;
  itemName?: string;
  stockType?: string;
  txType: string;
  qty: number;
  unit?: string;
  prev_on_hand?: number;
  new_on_hand?: number;
  unit_cost_at_time?: number;
  jobId?: string;
  jobMaterialId?: string;
  reason?: string;
  notes?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  createdAt: string;
}

interface JobLite {
  id: string;
  jobNum?: string;
  client?: string;
  projectName?: string;
}

type FilterKind = "all" | "issue" | "wastage" | "receipt" | "return" | "adjustment";

const KIND_CHIPS: { id: FilterKind; label: string; match: (t: string) => boolean }[] = [
  { id: "all",        label: "All",        match: () => true },
  { id: "issue",      label: "Used",       match: (t) => t === "issue" },
  { id: "wastage",    label: "Wastage",    match: (t) => t === "wastage" || t === "damaged" || t === "written_off" },
  { id: "receipt",    label: "Received",   match: (t) => t === "receipt" },
  { id: "return",     label: "Returns",    match: (t) => t === "return" },
  { id: "adjustment", label: "Adjust",     match: (t) => t === "adjustment" || t === "reversal" || t === "transferred" },
];

// The type prints small: neutral for +, red for -, gray for zero.
function qtySign(txType: string, qty: number): { sign: string; cls: string } {
  const q = Math.abs(qty);
  const positive = ["receipt", "return", "offcut_in"];
  const negative = ["issue", "wastage", "damaged", "offcut_out", "transferred", "written_off"];
  if (positive.includes(txType)) return { sign: `+${q}`, cls: "text-green-700" };
  if (negative.includes(txType)) return { sign: `−${q}`, cls: "text-red-700" };
  return { sign: `${qty}`, cls: "text-gray-600" };
}

// The label under the qty — short, neutral: "used", "received", etc.
function txTypeLabel(txType: string): string {
  const map: Record<string, string> = {
    issue: "used",
    receipt: "received",
    wastage: "wastage",
    damaged: "damaged",
    return: "returned",
    adjustment: "adjusted",
    reversal: "reversed",
    offcut_in: "offcut in",
    offcut_out: "offcut out",
    transferred: "transferred",
    written_off: "written off",
  };
  return map[txType] || txType;
}

// Group by local business date. dayjs would be nicer but the app doesn't
// import it consistently — a small manual grouping keeps this file self-contained.
function businessDay(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return iso.slice(0, 10);
  }
}

function timeOfDay(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
}

export default function LogPage() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<StockTx[]>([]);
  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<FilterKind>("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tx, jb] = await Promise.all([
        api.get<StockTx[]>("/stock/transactions?limit=500").catch(() => null),
        api.get<JobLite[]>("/jobs").catch(() => []),
      ]);
      if (tx === null) throw new Error("Couldn't load history — check your connection.");
      setTxs(tx || []);
      setJobs(jb || []);
    } catch (err: any) {
      setError(err?.message || "Couldn't load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const jobById = (id?: string) => (id ? jobs.find((j) => j.id === id) : undefined);

  // Search + kind filter combined
  const filtered = useMemo(() => {
    const chip = KIND_CHIPS.find((c) => c.id === kind)!;
    const needle = q.trim().toLowerCase();
    return txs.filter((t) => {
      if (!chip.match(t.txType)) return false;
      if (!needle) return true;
      const job = jobById(t.jobId);
      const hay = [
        t.itemName, t.txType, t.notes, t.reason,
        t.userName, t.userRole,
        job?.jobNum, job?.client, job?.projectName,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [txs, kind, q, jobs]);

  // Group by day (business date), newest day first, entries within a day newest first
  const groups = useMemo(() => {
    const map = new Map<string, StockTx[]>();
    for (const t of filtered) {
      const day = businessDay(t.createdAt);
      const arr = map.get(day) || [];
      arr.push(t);
      map.set(day, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[1][0]?.createdAt < b[1][0]?.createdAt ? 1 : -1));
  }, [filtered]);

  return (
    <div className="page">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Everything recorded — searchable. Every counter tap, receive and adjustment lands here.
        </p>
      </div>

      {/* Search + Clear */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search material, job, person, note…"
          className="flex-1 border-0 bg-transparent px-1 py-1 text-[15px] outline-none placeholder:text-gray-400"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="rounded-md px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
      </div>

      {/* Kind chips */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {KIND_CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setKind(c.id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
              kind === c.id
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Loading / error / empty / no-results / list */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-gray-100 bg-gray-50" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-medium text-red-800">{error}</div>
          <button
            type="button"
            onClick={load}
            className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : txs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Nothing logged yet.</p>
          <p className="mt-1 text-xs text-gray-400">
            Counter taps on the maker dashboard and stock movements will appear here.
          </p>
          <Link href="/dashboard" className="mt-3 inline-block text-sm font-semibold text-orange-600 hover:text-orange-700">
            Go to Dashboard →
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No entries match this search.</p>
          <button
            type="button"
            onClick={() => { setQ(""); setKind("all"); }}
            className="mt-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, entries]) => (
            <section key={day}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {day} · {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </h2>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                {entries.map((t, i) => {
                  const job = jobById(t.jobId);
                  const q = qtySign(t.txType, t.qty || 0);
                  return (
                    <div
                      key={t.id || i}
                      className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold tabular-nums text-gray-500">
                            {timeOfDay(t.createdAt)}
                          </span>
                          <span className="truncate text-sm font-semibold text-gray-900">
                            {t.itemName || "Item"}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-gray-500">
                          {[
                            txTypeLabel(t.txType),
                            job ? `${job.jobNum || ""}${job.client ? ` · ${job.client}` : ""}`.trim() : null,
                            t.userName ? `by ${t.userName}` : null,
                            t.notes || t.reason || null,
                          ].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className={`text-sm font-bold tabular-nums ${q.cls}`}>
                        {q.sign} {t.unit || ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
