"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";

interface Brief {
  id: string;
  jobId: string;
  jobNum?: string;
  jobName?: string;
  client?: string;
  status?: "pending" | "uploaded" | "checked" | "approved";
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  notes?: string;
  scope?: string;
}

function briefStatusMeta(status?: string): { label: string; className: string } {
  switch (status) {
    case "checked":
      return { label: "✓ Checked", className: "bg-green-100 text-green-700" };
    case "approved":
      return { label: "✓ Approved", className: "bg-green-100 text-green-700" };
    case "uploaded":
      return { label: "✓ Uploaded", className: "bg-blue-100 text-blue-700" };
    default:
      return { label: "Pending", className: "bg-amber-100 text-amber-700" };
  }
}

type FilterKey = "all" | "pending" | "uploaded" | "checked";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "uploaded", label: "Uploaded" },
  { key: "checked", label: "Checked" },
];

export default function BriefsPage() {
  const { user } = useAuth();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let alive = true;
    api
      .get<Brief[]>("/briefs/mine")
      .then((data) => {
        if (alive) {
          setBriefs(data || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const filtered =
    filter === "all" ? briefs : briefs.filter((b) => b.status === filter);

  const pendingCount = briefs.filter(
    (b) => !b.status || b.status === "pending"
  ).length;

  return (
    <div className="page pb-28">
      {/* Header */}
      <div className="mb-6 rounded-card bg-ink-950 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-orange">
          Design &amp; Drafting
        </p>
        <div className="mt-2.5 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-white">
              Drawing briefs
            </h1>
            <p className="mt-0.5 text-xs text-white/50">
              {pendingCount} pending upload
            </p>
          </div>
          {!loading && (
            <span className="font-heading text-3xl font-bold tabular tracking-tight text-brand-orange">
              {briefs.length}
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.key
                ? "bg-ink-900 text-white"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Brief list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-ink-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-ink-200 p-8 text-center text-sm text-ink-400">
          {filter === "all"
            ? "No briefs assigned yet."
            : `No ${filter} briefs.`}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((brief) => {
            const statusMeta = briefStatusMeta(brief.status);
            const isPending = !brief.status || brief.status === "pending";
            const jobLabel = brief.jobNum ? `#${brief.jobNum}` : `#${brief.jobId.slice(0, 6)}`;
            const jobTitle = brief.jobName || brief.client || "Unnamed job";

            return (
              <Link
                key={brief.id}
                href={`/jobs/${brief.jobId}`}
                className="card-interactive card-pad block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-ink-400">
                        {jobLabel}
                      </span>
                      <span className="text-[11px] text-ink-300">·</span>
                      <span className="truncate text-sm font-semibold text-ink-900">
                        {jobTitle}
                      </span>
                    </div>
                    {brief.scope && (
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {brief.scope}
                      </p>
                    )}
                    {brief.notes && (
                      <p className="mt-0.5 truncate text-xs text-ink-400">
                        {brief.notes}
                      </p>
                    )}
                  </div>
                  {brief.uploadedAt && !isPending && (
                    <span className="shrink-0 text-[11px] text-ink-400">
                      {new Date(brief.uploadedAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                  {brief.fileName && (
                    <span className="truncate text-[11px] text-ink-400">
                      {brief.fileName}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
