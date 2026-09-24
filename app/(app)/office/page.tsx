"use client";

/**
 * Office — 5 tabs for executive roles; Purchasing view only for office role.
 *
 * Executive tabs (Item E): Sales · Invoices · Purchasing · Accounts · Analytics
 * Office role sees Purchasing directly — no tab bar, same as before.
 *
 * URL: /office
 * Backend calls:
 *   Purchasing  → /pipeline/office-queue  (existing)
 *   Sales       → /pipeline/sales
 *   Invoices    → /invoices
 *   Accounts    → /pipeline/accounts
 *   Analytics   → /analytics/summary
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type Invoice = {
  id: string;
  invoiceNumber?: string;
  jobId?: string;
  jobNum?: string;
  client?: string;
  amount: number;
  status?: string; // draft | sent | paid | overdue
  issuedDate?: string;
  dueDate?: string;
  paidDate?: string;
};

type SalesItem = {
  id: string;
  jobNum?: string;
  client?: string;
  description?: string;
  stage?: string;
  value?: number;
  createdAt?: string;
  followUpDate?: string;
};

type AccountsSummary = {
  totalOutstanding: number;
  totalOverdue: number;
  totalPaid30d: number;
  invoices?: Invoice[];
};

type AnalyticsSummary = {
  revenueThisMonth: number;
  revenueLastMonth: number;
  jobsCompleted30d: number;
  avgJobValue: number;
  overdueCount: number;
  overdueAmount: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EXECUTIVE_ROLES = new Set([
  "managing_director",
  "manager",
  "department_manager",
  "admin",
]);
const CAN_ORDER = new Set([
  "office",
  "admin",
  "manager",
  "managing_director",
]);

const STATUS_STYLE: Record<string, string> = {
  paid:    "bg-green-50 text-green-700 border-green-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  sent:    "bg-blue-50 text-blue-700 border-blue-200",
  draft:   "bg-ink-100 text-ink-600 border-ink-200",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OfficePage() {
  const { user } = useAuth();

  if (!user) return null;

  const canOrder = CAN_ORDER.has(user.role);

  return (
    <div className="page pb-28">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">
          Office
        </p>
        <h1 className="page-title mt-1">Purchasing</h1>
        <p className="mt-1 text-sm text-ink-500">
          Everything released jobs still need — grouped by supplier.
        </p>
      </div>
      <PurchasingContent canOrder={canOrder} />
    </div>
  );
}

// ─── Purchasing tab ───────────────────────────────────────────────────────────

function PurchasingContent({ canOrder }: { canOrder: boolean }) {
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

  const createPO = async (
    supplier: string,
    jobId: string,
    jobNum: string,
    lineIds: string[]
  ) => {
    const key = `${supplier}::${jobId}`;
    setBusyKey(key);
    setMessage("");
    try {
      const po = await api.post<{ poNumber?: string }>(
        `/jobs/${jobId}/materials/create-po`,
        { supplier, materialIds: lineIds }
      );
      setMessage(
        `Draft PO ${po?.poNumber || ""} created for job #${jobNum}. It's in the PO tracker.`
      );
      await load();
    } catch {
      setMessage("Couldn't create that PO. Please try again.");
    } finally {
      setBusyKey(null);
    }
  };

  const totals = queue
    ? {
        lines: queue.totalLines,
        jobs: queue.totalJobs,
        suppliers: queue.suppliers.length,
      }
    : { lines: 0, jobs: 0, suppliers: 0 };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-500">Released jobs — grouped by supplier.</p>
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

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Metric label="Items to order" value={totals.lines} />
        <Metric label="Jobs"           value={totals.jobs} />
        <Metric label="Suppliers"      value={totals.suppliers} />
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
    </>
  );
}

// ─── Sales tab ────────────────────────────────────────────────────────────────

function SalesView() {
  const [items, setItems] = useState<SalesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<SalesItem[]>("/pipeline/sales")
      .then(setItems)
      .catch(() => setError("Couldn't load sales data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Empty text="Loading sales pipeline…" />;
  if (error)   return <ErrorBox text={error} />;
  if (!items.length) return <Empty text="No active sales entries." />;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-card border border-ink-200 bg-white px-4 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink-900">
                {item.client || "—"}
                {item.jobNum ? (
                  <span className="ml-1.5 text-ink-400">#{item.jobNum}</span>
                ) : null}
              </p>
              {item.description ? (
                <p className="mt-0.5 truncate text-sm text-ink-500">
                  {item.description}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              {item.value != null ? (
                <p className="font-heading font-semibold tabular text-ink-900">
                  {fmt$(item.value)}
                </p>
              ) : null}
              {item.stage ? (
                <span className="mt-1 inline-block rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
                  {item.stage}
                </span>
              ) : null}
            </div>
          </div>
          {item.followUpDate ? (
            <p className="mt-2 text-xs text-ink-400">
              Follow up: {fmtDate(item.followUpDate)}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ─── Invoices tab ─────────────────────────────────────────────────────────────

function InvoicesView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Invoice[]>("/invoices")
      .then(setInvoices)
      .catch(() => setError("Couldn't load invoices."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Empty text="Loading invoices…" />;
  if (error)   return <ErrorBox text={error} />;
  if (!invoices.length) return <Empty text="No invoices yet." />;

  return (
    <div className="space-y-3">
      {invoices.map((inv) => {
        const statusKey = (inv.status || "draft").toLowerCase();
        const badgeClass = STATUS_STYLE[statusKey] || STATUS_STYLE.draft;
        return (
          <div
            key={inv.id}
            className="rounded-card border border-ink-200 bg-white px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">
                  {inv.client || "—"}
                  {inv.invoiceNumber ? (
                    <span className="ml-1.5 text-ink-400">#{inv.invoiceNumber}</span>
                  ) : null}
                </p>
                {inv.jobNum ? (
                  <p className="mt-0.5 text-sm text-ink-500">Job #{inv.jobNum}</p>
                ) : null}
                {inv.dueDate ? (
                  <p className="mt-0.5 text-xs text-ink-400">
                    Due {fmtDate(inv.dueDate)}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-heading font-semibold tabular text-ink-900">
                  {fmt$(inv.amount)}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${badgeClass}`}
                >
                  {statusKey}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Accounts tab ─────────────────────────────────────────────────────────────

function AccountsView() {
  const [data, setData] = useState<AccountsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<AccountsSummary>("/pipeline/accounts")
      .then(setData)
      .catch(() => setError("Couldn't load accounts data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Empty text="Loading accounts…" />;
  if (error)   return <ErrorBox text={error} />;
  if (!data)   return <Empty text="No accounts data available." />;

  return (
    <>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <MetricCard label="Outstanding"  value={fmt$(data.totalOutstanding)} />
        <MetricCard
          label="Overdue"
          value={fmt$(data.totalOverdue)}
          sub={data.totalOverdue > 0 ? "Action needed" : undefined}
          subColor="text-red-600"
        />
        <MetricCard label="Paid (30d)" value={fmt$(data.totalPaid30d)} />
      </div>

      {data.invoices && data.invoices.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Outstanding invoices
          </p>
          {data.invoices.map((inv) => {
            const statusKey = (inv.status || "draft").toLowerCase();
            const badgeClass = STATUS_STYLE[statusKey] || STATUS_STYLE.draft;
            return (
              <div
                key={inv.id}
                className="rounded-card border border-ink-200 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">
                      {inv.client || "—"}
                    </p>
                    {inv.dueDate ? (
                      <p className="text-xs text-ink-400">
                        Due {fmtDate(inv.dueDate)}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-heading font-semibold tabular text-ink-900">
                      {fmt$(inv.amount)}
                    </p>
                    <span
                      className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${badgeClass}`}
                    >
                      {statusKey}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

// ─── Analytics tab ────────────────────────────────────────────────────────────

function AnalyticsView() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<AnalyticsSummary>("/analytics/summary")
      .then(setData)
      .catch(() => setError("Couldn't load analytics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Empty text="Loading analytics…" />;
  if (error)   return <ErrorBox text={error} />;
  if (!data)   return <Empty text="No analytics data available." />;

  const revDiff =
    data.revenueLastMonth > 0
      ? Math.round(
          ((data.revenueThisMonth - data.revenueLastMonth) /
            data.revenueLastMonth) *
            100
        )
      : 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard
        label="Revenue this month"
        value={fmt$(data.revenueThisMonth)}
        sub={
          revDiff !== 0
            ? `${revDiff > 0 ? "+" : ""}${revDiff}% vs last month`
            : "Same as last month"
        }
        subColor={revDiff >= 0 ? "text-green-600" : "text-red-600"}
      />
      <MetricCard
        label="Jobs completed (30d)"
        value={String(data.jobsCompleted30d)}
      />
      <MetricCard
        label="Avg job value"
        value={fmt$(data.avgJobValue)}
      />
      <MetricCard
        label="Overdue invoices"
        value={String(data.overdueCount)}
        sub={data.overdueAmount > 0 ? fmt$(data.overdueAmount) : undefined}
        subColor={data.overdueCount > 0 ? "text-red-600" : "text-green-600"}
      />
    </div>
  );
}

// ─── Supplier card (Purchasing tab) ──────────────────────────────────────────

function SupplierCard({
  supplier,
  canOrder,
  busyKey,
  onCreatePO,
}: {
  supplier: OfficeSupplier;
  canOrder: boolean;
  busyKey: string | null;
  onCreatePO: (
    supplier: string,
    jobId: string,
    jobNum: string,
    lineIds: string[]
  ) => void;
}) {
  const jobs = useMemo(() => {
    const map = new Map<
      string,
      { jobId: string; jobNum: string; client: string; lines: OfficeLine[] }
    >();
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
          <h2 className="truncate font-heading text-base font-semibold text-ink-900">
            {supplier.supplier}
          </h2>
          <p className="text-xs text-ink-500">
            {supplier.lineCount} item{supplier.lineCount === 1 ? "" : "s"} ·{" "}
            {supplier.jobCount} job{supplier.jobCount === 1 ? "" : "s"}
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
                <Link
                  href="/jobs"
                  className="text-sm font-semibold text-ink-900"
                >
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
                  <li
                    key={ln.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate text-ink-700">
                      {ln.description}
                      {ln.requiredBy ? (
                        <span className="text-ink-400">
                          {" "}
                          · by {ln.requiredBy}
                        </span>
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

// ─── Shared components ────────────────────────────────────────────────────────

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-ink-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-semibold tabular tracking-tight text-ink-900">
        {value}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="rounded-card border border-ink-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </p>
      <p className="mt-1 font-heading text-xl font-semibold tabular tracking-tight text-ink-900">
        {value}
      </p>
      {sub ? (
        <p className={`mt-1 text-xs font-medium ${subColor || "text-ink-500"}`}>
          {sub}
        </p>
      ) : null}
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

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
      {text}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function fmt$(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
