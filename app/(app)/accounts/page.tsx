"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import Icon, { type IconName } from "@/lib/components/Icon";

/* ------------------------------------------------------------------ types */

interface ScheduleItem {
  milestone: string;
  percentage?: number;
  amount?: number;
  dueDate?: string;
  notes?: string;
  invoiced?: boolean;
}
interface Schedule {
  id: string;
  jobId: string;
  items: ScheduleItem[];
}
interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  method?: string;
  reference?: string;
  receiptNumber?: string;
  notes?: string;
}
interface Receivable {
  invoiceId: string;
  invoiceNumber: string;
  client?: string;
  total?: number;
  paid?: number;
  outstanding: number;
  dueDate?: string;
  daysOverdue: number;
  bucket: string;
}
interface CreditNote {
  id: string;
  creditNumber: string;
  invoiceId: string;
  invoiceNumber?: string;
  amount: number;
  reason: string;
  isRefund?: boolean;
  creditDate?: string;
}
interface Job {
  id: string;
  jobNum?: string;
  client?: string;
  projectName?: string;
}
interface Invoice {
  id: string;
  invoiceNumber?: string;
  client?: string;
  total?: number;
}

type TabId = "schedules" | "payments" | "receivables" | "credits";

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "schedules", label: "Schedules", icon: "calendar" },
  { id: "payments", label: "Payments", icon: "dollar" },
  { id: "receivables", label: "Receivables", icon: "trendingUp" },
  { id: "credits", label: "Credits", icon: "invoices" },
];

const MILESTONES = ["Deposit", "Progress 1", "Progress 2", "Final"];
const METHODS = ["Bank transfer", "Cash", "Card", "Cheque"];

/* -------------------------------------------------------------- utilities */

const money = (n?: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n || 0);

const money2 = (n?: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    n || 0
  );

const shortDate = (s?: string) =>
  s
    ? new Date(s).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
    : "—";

const today = () => new Date().toISOString().split("T")[0];
const errMsg = (e: any, fallback: string) =>
  e?.response?.data?.detail || e?.message || fallback;

type Runner = (
  fn: () => Promise<any>,
  ok: string,
  fail: string
) => Promise<boolean>;

/* =============================================================== component */

export default function AccountsPage() {
  const [tab, setTab] = useState<TabId>("schedules");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [credits, setCredits] = useState<CreditNote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [s, p, r, c, j, i] = await Promise.all([
        api.get<Schedule[]>("/accounts/schedules"),
        api.get<Payment[]>("/accounts/payments"),
        api.get<Receivable[]>("/accounts/ar"),
        api.get<CreditNote[]>("/accounts/credit-notes"),
        api.get<Job[]>("/jobs"),
        api.get<Invoice[]>("/invoices"),
      ]);
      setSchedules(s || []);
      setPayments(p || []);
      setReceivables(r || []);
      setCredits(c || []);
      setJobs(j || []);
      setInvoices(i || []);
    } catch (e: any) {
      setError(errMsg(e, "Could not load accounts data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const run: Runner = async (fn, ok, fail) => {
    try {
      setBusy(true);
      setError("");
      await fn();
      setNotice(ok);
      await load();
      return true;
    } catch (e: any) {
      setError(errMsg(e, fail));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const jobLabel = (id: string) => {
    const j = jobs.find((x) => x.id === id);
    if (!j) return id;
    return (
      [j.jobNum, j.client || j.projectName].filter(Boolean).join(" · ") || id
    );
  };

  const invLabel = (id: string) => {
    const i = invoices.find((x) => x.id === id);
    return i?.invoiceNumber || id;
  };

  const kpis = useMemo(() => {
    const scheduled = schedules.reduce(
      (sum, s) => sum + (s.items || []).reduce((t, i) => t + (i.amount || 0), 0),
      0
    );
    const received = payments.reduce((t, p) => t + (p.amount || 0), 0);
    const outstanding = receivables.reduce(
      (t, r) => t + (r.outstanding || 0),
      0
    );
    const overdue = receivables
      .filter((r) => r.daysOverdue > 0)
      .reduce((t, r) => t + (r.outstanding || 0), 0);
    return { scheduled, received, outstanding, overdue };
  }, [schedules, payments, receivables]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Accounts</h1>
          <p className="page-subtitle">
            Payment schedules, receipts, receivables and credit notes.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading || busy}
          className="btn-secondary btn-sm"
        >
          <Icon name="clock" size={16} />
          Refresh
        </button>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Outstanding" value={money(kpis.outstanding)} tone="brand" />
        <Stat
          label="Overdue"
          value={money(kpis.overdue)}
          tone={kpis.overdue > 0 ? "danger" : "default"}
        />
        <Stat label="Received" value={money(kpis.received)} tone="success" />
        <Stat label="Scheduled" value={money(kpis.scheduled)} />
      </div>

      {error && (
        <div className="alert-danger mb-4" role="alert">
          <Icon name="alert" size={17} className="mt-px" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="alert-success mb-4" role="status">
          <Icon name="check" size={17} className="mt-px" />
          <span>{notice}</span>
        </div>
      )}

      <div className="tabs mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab ${tab === t.id ? "tab-active" : ""}`}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <Icon name={t.icon} size={17} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingRows />
      ) : (
        <>
          {tab === "schedules" && (
            <SchedulesTab
              schedules={schedules}
              jobs={jobs}
              jobLabel={jobLabel}
              busy={busy}
              run={run}
            />
          )}
          {tab === "payments" && (
            <PaymentsTab
              payments={payments}
              invoices={invoices}
              invLabel={invLabel}
              busy={busy}
              run={run}
            />
          )}
          {tab === "receivables" && <ReceivablesTab rows={receivables} />}
          {tab === "credits" && (
            <CreditsTab
              credits={credits}
              invoices={invoices}
              invLabel={invLabel}
              busy={busy}
              run={run}
            />
          )}
        </>
      )}
    </div>
  );
}

/* =================================================================== parts */

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "brand" | "success" | "danger";
}) {
  const colour = {
    default: "text-ink-900",
    brand: "text-brand-orange-dark",
    success: "text-success",
    danger: "text-danger",
  }[tone];
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${colour}`}>{value}</span>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card card-pad">
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton mt-3 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function Empty({
  icon,
  title,
  body,
}: {
  icon: IconName;
  title: string;
  body: string;
}) {
  return (
    <div className="empty">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-400">
        <Icon name={icon} size={24} />
      </div>
      <p className="empty-title">{title}</p>
      <p className="empty-body">{body}</p>
    </div>
  );
}

/* ------------------------------------------------------------- schedules */

function SchedulesTab({
  schedules,
  jobs,
  jobLabel,
  busy,
  run,
}: {
  schedules: Schedule[];
  jobs: Job[];
  jobLabel: (id: string) => string;
  busy: boolean;
  run: Runner;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState("");
  const [jobId, setJobId] = useState("");
  const [items, setItems] = useState<ScheduleItem[]>([
    { milestone: "Deposit", percentage: 50, amount: 0, dueDate: "", notes: "" },
  ]);

  const total = items.reduce((t, i) => t + (i.amount || 0), 0);

  const reset = () => {
    setOpen(false);
    setJobId("");
    setItems([
      { milestone: "Deposit", percentage: 50, amount: 0, dueDate: "", notes: "" },
    ]);
  };

  const save = async () => {
    const ok = await run(
      () => api.post("/accounts/schedules", { jobId, items }),
      "Payment schedule saved.",
      "Could not save the schedule."
    );
    if (ok) reset();
  };

  const patch = (idx: number, key: keyof ScheduleItem, value: any) =>
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it))
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Payment schedules</h2>
        <button onClick={() => setOpen((v) => !v)} className="btn-primary btn-sm">
          <Icon name="plus" size={16} />
          New schedule
        </button>
      </div>

      {open && (
        <div className="card animate-fade-up">
          <div className="card-header">
            <h3 className="section-title">Create schedule</h3>
            <button onClick={reset} className="btn-ghost btn-sm" aria-label="Close">
              <Icon name="close" size={17} />
            </button>
          </div>

          <div className="card-pad space-y-4">
            <div className="field">
              <label className="label">Job</label>
              <select
                className="input"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
              >
                <option value="">Select a job…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {jobLabel(j.id)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-ink-200 bg-ink-50/60 p-3"
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="eyebrow">Milestone {idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        onClick={() =>
                          setItems((p) => p.filter((_, i) => i !== idx))
                        }
                        className="text-ink-400 transition-colors hover:text-danger"
                        aria-label="Remove milestone"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="field">
                      <label className="label">Stage</label>
                      <select
                        className="input"
                        value={it.milestone}
                        onChange={(e) => patch(idx, "milestone", e.target.value)}
                      >
                        {MILESTONES.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label className="label">Percentage</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="input"
                        value={it.percentage ?? ""}
                        onChange={(e) =>
                          patch(idx, "percentage", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="field">
                      <label className="label">Amount (AUD)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="input"
                        value={it.amount ?? ""}
                        onChange={(e) =>
                          patch(idx, "amount", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="field">
                      <label className="label">Due date</label>
                      <input
                        type="date"
                        className="input"
                        value={it.dueDate || ""}
                        onChange={(e) => patch(idx, "dueDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field mt-3">
                    <label className="label">Notes</label>
                    <input
                      className="input"
                      placeholder="Optional"
                      value={it.notes || ""}
                      onChange={(e) => patch(idx, "notes", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 pt-4">
              <div className="text-sm text-ink-500">
                Schedule total{" "}
                <span className="font-heading text-base font-semibold tabular text-ink-900">
                  {money2(total)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setItems((p) => [
                      ...p,
                      {
                        milestone: "Progress 1",
                        percentage: 0,
                        amount: 0,
                        dueDate: "",
                        notes: "",
                      },
                    ])
                  }
                  className="btn-secondary btn-sm"
                >
                  <Icon name="plus" size={15} />
                  Add milestone
                </button>
                <button
                  onClick={save}
                  disabled={busy || !jobId}
                  className="btn-primary btn-sm"
                >
                  Save schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {schedules.length === 0 ? (
        <Empty
          icon="calendar"
          title="No payment schedules yet"
          body="Create a schedule to break a job into deposit and progress claims, then raise invoices from each milestone."
        />
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => {
            const isOpen = expanded === s.id;
            const sum = (s.items || []).reduce((t, i) => t + (i.amount || 0), 0);
            const done = (s.items || []).filter((i) => i.invoiced).length;
            return (
              <div key={s.id} className="card">
                <button
                  onClick={() => setExpanded(isOpen ? "" : s.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left md:px-5"
                  aria-expanded={isOpen}
                >
                  <Icon
                    name="chevronRight"
                    size={17}
                    className={`text-ink-400 transition-transform ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink-900">
                      {jobLabel(s.jobId)}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-500">
                      {s.items?.length || 0} milestones · {done} invoiced
                    </div>
                  </div>
                  <div className="font-heading text-sm font-semibold tabular text-ink-900">
                    {money(sum)}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-ink-200 px-4 py-3 md:px-5">
                    <div className="space-y-2">
                      {(s.items || []).map((it, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap items-center gap-3 rounded-lg bg-ink-50 px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-ink-900">
                              {it.milestone}
                              {it.percentage ? (
                                <span className="ml-2 text-xs font-normal text-ink-500">
                                  {it.percentage}%
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-0.5 text-xs text-ink-500">
                              Due {shortDate(it.dueDate)}
                              {it.notes ? ` · ${it.notes}` : ""}
                            </div>
                          </div>
                          <div className="font-heading text-sm font-semibold tabular text-ink-900">
                            {money2(it.amount)}
                          </div>
                          {it.invoiced ? (
                            <span className="badge-success">
                              <Icon name="check" size={12} />
                              Invoiced
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                run(
                                  () =>
                                    api.post(
                                      `/accounts/schedules/${s.id}/invoice/${idx}`,
                                      {}
                                    ),
                                  "Invoice raised from milestone.",
                                  "Could not raise the invoice."
                                )
                              }
                              disabled={busy}
                              className="btn-secondary btn-sm"
                            >
                              Raise invoice
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex justify-end border-t border-ink-200 pt-3">
                      <button
                        onClick={() => {
                          if (!confirm("Delete this payment schedule?")) return;
                          run(
                            () => api.delete(`/accounts/schedules/${s.id}`),
                            "Schedule deleted.",
                            "Could not delete the schedule."
                          );
                        }}
                        disabled={busy}
                        className="btn-ghost btn-sm text-danger hover:bg-danger-light"
                      >
                        <Icon name="trash" size={15} />
                        Delete schedule
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- payments */

function PaymentsTab({
  payments,
  invoices,
  invLabel,
  busy,
  run,
}: {
  payments: Payment[];
  invoices: Invoice[];
  invLabel: (id: string) => string;
  busy: boolean;
  run: Runner;
}) {
  const [open, setOpen] = useState(false);
  const blank = {
    invoiceId: "",
    paymentDate: today(),
    amount: 0,
    method: "Bank transfer",
    reference: "",
    receiptNumber: "",
    notes: "",
  };
  const [form, setForm] = useState(blank);

  const reset = () => {
    setOpen(false);
    setForm(blank);
  };

  const save = async () => {
    const ok = await run(
      () => api.post("/accounts/payments", form),
      "Payment recorded.",
      "Could not record the payment."
    );
    if (ok) reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Recorded payments</h2>
        <button onClick={() => setOpen((v) => !v)} className="btn-primary btn-sm">
          <Icon name="plus" size={16} />
          Record payment
        </button>
      </div>

      {open && (
        <div className="card animate-fade-up">
          <div className="card-header">
            <h3 className="section-title">Record a payment</h3>
            <button onClick={reset} className="btn-ghost btn-sm" aria-label="Close">
              <Icon name="close" size={17} />
            </button>
          </div>
          <div className="card-pad grid gap-4 sm:grid-cols-2">
            <div className="field sm:col-span-2">
              <label className="label">Invoice</label>
              <select
                className="input"
                value={form.invoiceId}
                onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
              >
                <option value="">Select an invoice…</option>
                {invoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {invLabel(i.id)}
                    {i.client ? ` · ${i.client}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Amount (AUD)</label>
              <input
                type="number"
                inputMode="decimal"
                className="input"
                value={form.amount || ""}
                onChange={(e) =>
                  setForm({ ...form, amount: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="field">
              <label className="label">Payment date</label>
              <input
                type="date"
                className="input"
                value={form.paymentDate}
                onChange={(e) =>
                  setForm({ ...form, paymentDate: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label className="label">Method</label>
              <select
                className="input"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Reference</label>
              <input
                className="input"
                placeholder="Bank reference"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </div>
            <div className="field sm:col-span-2">
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={2}
                placeholder="Optional"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button onClick={reset} className="btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy || !form.invoiceId || form.amount <= 0}
                className="btn-primary btn-sm"
              >
                Record payment
              </button>
            </div>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <Empty
          icon="dollar"
          title="No payments recorded"
          body="Payments logged here update the matching invoice balance and flow through to receivables."
        />
      ) : (
        <div className="table-wrap">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th className="text-right">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="ref">{invLabel(p.invoiceId)}</span>
                    </td>
                    <td className="whitespace-nowrap text-ink-600">
                      {shortDate(p.paymentDate)}
                    </td>
                    <td className="text-ink-600">{p.method || "—"}</td>
                    <td className="text-ink-600">{p.reference || "—"}</td>
                    <td className="num text-ink-900">{money2(p.amount)}</td>
                    <td className="text-right">
                      <button
                        onClick={() => {
                          if (
                            !confirm(
                              "Delete this payment? The invoice balance will be restored."
                            )
                          )
                            return;
                          run(
                            () => api.delete(`/accounts/payments/${p.id}`),
                            "Payment deleted.",
                            "Could not delete the payment."
                          );
                        }}
                        disabled={busy}
                        className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-danger-light hover:text-danger"
                        aria-label="Delete payment"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- receivables */

function ReceivablesTab({ rows }: { rows: Receivable[] }) {
  const buckets = useMemo(() => {
    const order = [
      "Current",
      "1–7 days",
      "8–30 days",
      "31–60 days",
      "61–90 days",
      "90+ days",
    ];
    const map = new Map<string, number>();
    rows.forEach((r) =>
      map.set(r.bucket, (map.get(r.bucket) || 0) + (r.outstanding || 0))
    );
    return order
      .filter((b) => map.has(b))
      .map((b) => ({ bucket: b, total: map.get(b)! }));
  }, [rows]);

  if (rows.length === 0) {
    return (
      <Empty
        icon="trendingUp"
        title="Nothing outstanding"
        body="Every invoice is settled. Unpaid invoices appear here automatically, aged by how far past due they are."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title mb-3">Ageing</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {buckets.map((b) => (
            <div key={b.bucket} className="card card-pad">
              <div className="stat-label">{b.bucket}</div>
              <div
                className={`mt-1 font-heading text-lg font-semibold tabular ${
                  b.bucket === "Current" ? "text-ink-900" : "text-danger"
                }`}
              >
                {money(b.total)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="section-title mb-3">Outstanding invoices</h2>
        <div className="table-wrap">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th className="text-right">Invoiced</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.invoiceId}>
                    <td>
                      <span className="ref">{r.invoiceNumber}</span>
                    </td>
                    <td className="text-ink-800">{r.client || "—"}</td>
                    <td className="whitespace-nowrap text-ink-600">
                      {shortDate(r.dueDate)}
                    </td>
                    <td>
                      {r.daysOverdue > 0 ? (
                        <span className="badge-danger">
                          {r.daysOverdue}d overdue
                        </span>
                      ) : (
                        <span className="badge-neutral">Current</span>
                      )}
                    </td>
                    <td className="num text-ink-600">{money2(r.total)}</td>
                    <td className="num text-ink-600">{money2(r.paid)}</td>
                    <td className="num font-semibold text-ink-900">
                      {money2(r.outstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- credits */

function CreditsTab({
  credits,
  invoices,
  invLabel,
  busy,
  run,
}: {
  credits: CreditNote[];
  invoices: Invoice[];
  invLabel: (id: string) => string;
  busy: boolean;
  run: Runner;
}) {
  const [open, setOpen] = useState(false);
  const blank = {
    invoiceId: "",
    amount: 0,
    reason: "",
    isRefund: false,
    creditDate: today(),
  };
  const [form, setForm] = useState(blank);

  const reset = () => {
    setOpen(false);
    setForm(blank);
  };

  const save = async () => {
    const ok = await run(
      () => api.post("/accounts/credit-notes", form),
      "Credit note created.",
      "Could not create the credit note."
    );
    if (ok) reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Credit notes</h2>
        <button onClick={() => setOpen((v) => !v)} className="btn-primary btn-sm">
          <Icon name="plus" size={16} />
          New credit note
        </button>
      </div>

      {open && (
        <div className="card animate-fade-up">
          <div className="card-header">
            <h3 className="section-title">Create credit note</h3>
            <button onClick={reset} className="btn-ghost btn-sm" aria-label="Close">
              <Icon name="close" size={17} />
            </button>
          </div>
          <div className="card-pad grid gap-4 sm:grid-cols-2">
            <div className="field sm:col-span-2">
              <label className="label">Invoice</label>
              <select
                className="input"
                value={form.invoiceId}
                onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
              >
                <option value="">Select an invoice…</option>
                {invoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {invLabel(i.id)}
                    {i.client ? ` · ${i.client}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Amount (AUD)</label>
              <input
                type="number"
                inputMode="decimal"
                className="input"
                value={form.amount || ""}
                onChange={(e) =>
                  setForm({ ...form, amount: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="field">
              <label className="label">Credit date</label>
              <input
                type="date"
                className="input"
                value={form.creditDate}
                onChange={(e) =>
                  setForm({ ...form, creditDate: e.target.value })
                }
              />
            </div>
            <div className="field sm:col-span-2">
              <label className="label">Reason</label>
              <textarea
                className="input"
                rows={2}
                placeholder="e.g. variation credit, damaged panel, agreed discount"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-ink-200 bg-ink-50/60 p-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isRefund}
                onChange={(e) =>
                  setForm({ ...form, isRefund: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 accent-brand-orange"
              />
              <span>
                <span className="block text-sm font-medium text-ink-900">
                  Money refunded to the client
                </span>
                <span className="block text-xs text-ink-500">
                  Leave unticked for a credit held against the account.
                </span>
              </span>
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button onClick={reset} className="btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={
                  busy || !form.invoiceId || form.amount <= 0 || !form.reason.trim()
                }
                className="btn-primary btn-sm"
              >
                Create credit note
              </button>
            </div>
          </div>
        </div>
      )}

      {credits.length === 0 ? (
        <Empty
          icon="invoices"
          title="No credit notes"
          body="Credit notes reduce the balance on an invoice — use them for variations, agreed discounts or refunds."
        />
      ) : (
        <div className="space-y-3">
          {credits.map((c) => (
            <div key={c.id} className="card card-pad">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ref font-semibold">{c.creditNumber}</span>
                    <span className="text-ink-300">·</span>
                    <span className="ref">
                      {c.invoiceNumber || invLabel(c.invoiceId)}
                    </span>
                    <span className={c.isRefund ? "badge-warning" : "badge-info"}>
                      {c.isRefund ? "Refunded" : "Credit held"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-600">{c.reason}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {shortDate(c.creditDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-heading text-lg font-semibold tabular text-danger">
                    −{money2(c.amount)}
                  </span>
                  <button
                    onClick={() => {
                      if (
                        !confirm(
                          "Delete this credit note? The invoice balance will be restored."
                        )
                      )
                        return;
                      run(
                        () => api.delete(`/accounts/credit-notes/${c.id}`),
                        "Credit note deleted.",
                        "Could not delete the credit note."
                      );
                    }}
                    disabled={busy}
                    className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-danger-light hover:text-danger"
                    aria-label="Delete credit note"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
