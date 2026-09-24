"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";

interface Variation {
  id: string;
  jobId: string;
  jobNum?: string;
  jobName?: string;
  client?: string;
  title: string;
  description?: string;
  status?: "pending" | "approved" | "rejected" | "in_progress" | "done";
  requestedAt?: string;
  resolvedAt?: string;
  requestedBy?: string;
}

function variationStatusMeta(status?: string): { label: string; className: string } {
  switch (status) {
    case "approved":
      return { label: "Approved", className: "bg-green-100 text-green-700" };
    case "in_progress":
      return { label: "In progress", className: "bg-blue-100 text-blue-700" };
    case "done":
      return { label: "Done", className: "bg-ink-100 text-ink-400" };
    case "rejected":
      return { label: "Rejected", className: "bg-red-100 text-red-700" };
    default:
      return { label: "Pending", className: "bg-amber-100 text-amber-700" };
  }
}

type FilterKey = "all" | "pending" | "approved" | "in_progress" | "done";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export default function VariationsPage() {
  const { user } = useAuth();
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let alive = true;
    api
      .get<Variation[]>("/variations/mine")
      .then((data) => {
        if (alive) {
          setVariations(data || []);
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
    filter === "all"
      ? variations
      : variations.filter((v) => v.status === filter);

  const pendingCount = variations.filter(
    (v) => !v.status || v.status === "pending"
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
              Variations
            </h1>
            <p className="mt-0.5 text-xs text-white/50">
              {pendingCount} pending action
            </p>
          </div>
          {!loading && (
            <span className="font-heading text-3xl font-bold tabular tracking-tight text-brand-orange">
              {variations.length}
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

      {/* Variation list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-ink-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-ink-200 p-8 text-center text-sm text-ink-400">
          {filter === "all"
            ? "No variations assigned yet."
            : `No ${filter.replace("_", " ")} variations.`}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((v) => {
            const statusMeta = variationStatusMeta(v.status);
            const isDone = v.status === "done" || v.status === "rejected";
            const jobLabel = v.jobNum ? `#${v.jobNum}` : `#${v.jobId.slice(0, 6)}`;
            const jobTitle = v.jobName || v.client || "Unnamed job";

            return (
              <Link
                key={v.id}
                href={`/jobs/${v.jobId}`}
                className={`card-interactive card-pad block ${isDone ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-ink-400">
                        {jobLabel}
                      </span>
                      <span className="text-[11px] text-ink-300">·</span>
                      <span className="truncate text-[11px] text-ink-500">
                        {jobTitle}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold leading-snug text-ink-900">
                      {v.title}
                    </p>
                    {v.description && (
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {v.description}
                      </p>
                    )}
                  </div>
                  {v.requestedAt && (
                    <span className="shrink-0 text-[11px] text-ink-400">
                      {new Date(v.requestedAt).toLocaleDateString("en-AU", {
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
                  {v.requestedBy && (
                    <span className="text-[11px] text-ink-400">
                      by {v.requestedBy}
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
