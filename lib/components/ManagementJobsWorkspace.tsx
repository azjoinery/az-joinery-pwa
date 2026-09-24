"use client";

import { useState, useEffect } from "react";
import { isPast, parseISO } from "date-fns";
import { api } from "@/lib/api/client";
import JobsKanban from "@/lib/components/JobsKanban";
import DesignWorkspace from "@/app/(app)/design/page";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ManagementJobSnapshot {
  id: string;
  status?: string;
  currentStatus?: string;
  dueDate?: string;
  targetProductionDate?: string;
  assignedStaff?: string;
  blocked?: boolean;
}

// ─── Summary banner ──────────────────────────────────────────────────────────

function ManagementJobSummary() {
  const [jobs, setJobs] = useState<ManagementJobSnapshot[]>([]);

  useEffect(() => {
    let mounted = true;
    api.get<ManagementJobSnapshot[]>("/jobs")
      .then(data => { if (mounted) setJobs(data); })
      .catch(() => { if (mounted) setJobs([]); });
    return () => { mounted = false; };
  }, []);

  const attention = jobs.filter(job => {
    const status = `${job.status || ""} ${job.currentStatus || ""}`.toLowerCase();
    const complete = /completed|done|delivered/.test(status);
    const due = job.targetProductionDate || job.dueDate;
    const overdue = due ? (() => {
      try { return isPast(parseISO(due)); } catch { return false; }
    })() : false;
    return !complete && (Boolean(job.blocked) || status.includes("blocked") || overdue);
  }).length;
  const active = jobs.filter(job => {
    const status = `${job.status || ""} ${job.currentStatus || ""}`.toLowerCase();
    return !status.includes("completed") && !status.includes("done") && !status.includes("delivered");
  }).length;
  const unassigned = jobs.filter(job => !job.assignedStaff).length;

  const items = [
    { label: "Needs attention", value: attention, tone: attention ? "text-danger" : "text-success-dark" },
    { label: "Active jobs", value: active, tone: "text-brand-orange" },
    { label: "Unassigned", value: unassigned, tone: unassigned ? "text-warning-dark" : "text-ink-600" },
  ];

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Job control</p>
          <h1 className="mt-1 font-heading text-lg font-semibold text-ink-950">Keep every job moving</h1>
        </div>
        <span className="hidden rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600 sm:inline-flex">MD view</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {items.map(item => (
          <div key={item.label} className="rounded-xl bg-ink-50 px-3 py-2.5">
            <p className="text-[11px] font-medium leading-tight text-ink-500">{item.label}</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold text-ink-500">
        {["Lead", "Quote", "Design", "Approval", "Materials", "Production", "Install", "Invoice"].map((step, index, all) => (
          <span key={step} className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full border border-ink-200 bg-white px-2.5 py-1">{step}</span>
            {index < all.length - 1 && <span className="text-ink-300">›</span>}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-500">Open a job below when you need the full details or an action.</p>
    </section>
  );
}

// ─── Main workspace component ────────────────────────────────────────────────

export default function ManagementJobsWorkspace({ canManage }: { canManage: boolean }) {
  const [category, setCategory] = useState<"design" | "production">("design");

  return (
    <div className="space-y-5">
      <ManagementJobSummary />
      <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCategory("design")}
            className={`min-h-12 rounded-xl px-4 text-sm font-semibold transition-colors ${
              category === "design"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Design
          </button>
          <button
            type="button"
            onClick={() => setCategory("production")}
            className={`min-h-12 rounded-xl px-4 text-sm font-semibold transition-colors ${
              category === "production"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Production
          </button>
        </div>
      </div>

      {category === "design" ? (
        <DesignWorkspace />
      ) : (
        <JobsKanban canManage={canManage} />
      )}
    </div>
  );
}
