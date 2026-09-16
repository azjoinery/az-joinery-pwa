"use client";

/**
 * Trash page — Slice 8a/8b.
 *
 * A unified view of everything that's been archived across the app. Items
 * are grouped by kind (Jobs / Tasks / Materials), shown newest-first, with
 * two actions per row:
 *   • Restore — puts the item back into normal lists (any manager-ish role)
 *   • Delete permanently — hard purge (admin / MD / manager only)
 *
 * Backend contract:
 *   GET    /trash                          → TrashItem[]
 *   POST   /trash/{kind}/{id}/restore      → { ok, restored: true }
 *   DELETE /trash/{kind}/{id}              → { ok, purged: true }  (admin only)
 *
 * Auto-purge lives on the backend later; for now items stay in Trash until
 * an admin empties them. This page treats a 30-day mark as informational
 * only — it doesn't delete anything client-side.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";

interface TrashItem {
  kind: "job" | "task" | "material" | string;
  id: string;
  title: string;
  archivedAt: string;
  archivedBy?: string;
  archivedById?: string;
}

type FilterKind = "all" | "job" | "task" | "material";

const KIND_LABEL: Record<string, string> = {
  job: "Job",
  task: "Task",
  material: "Material",
};

const PURGE_ROLES = new Set(["admin", "managing_director", "manager"]);

// Days between archived_at and now. Negative if archived in the future
// (clock skew — treat as 0). Used only for the "purges in N days" hint.
function daysSince(iso: string): number {
  const t = Date.parse(iso);
  if (isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86400_000));
}
function whenLabel(iso: string): string {
  const days = daysSince(iso);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function TrashPage() {
  const { user } = useAuth();
  const canPurge = !!user && PURGE_ROLES.has(user.role);

  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<TrashItem[]>("/trash");
      setItems(data || []);
    } catch (err) {
      setError("Couldn't load Trash — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.kind === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, job: 0, task: 0, material: 0 };
    for (const i of items) {
      c[i.kind] = (c[i.kind] || 0) + 1;
    }
    return c;
  }, [items]);

  const restore = async (item: TrashItem) => {
    setBusyId(item.id);
    setRowMsg(null);
    try {
      await api.post(`/trash/${item.kind}/${item.id}/restore`);
      setItems((prev) => prev.filter((x) => !(x.kind === item.kind && x.id === item.id)));
      setRowMsg({ id: item.id, text: "Restored — it's back in the list.", ok: true });
      setTimeout(() => setRowMsg((m) => (m?.id === item.id ? null : m)), 2500);
    } catch (err) {
      setRowMsg({ id: item.id, text: "Couldn't restore — try again.", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  const purge = async (item: TrashItem) => {
    setBusyId(item.id);
    setRowMsg(null);
    try {
      await api.delete(`/trash/${item.kind}/${item.id}`);
      setItems((prev) => prev.filter((x) => !(x.kind === item.kind && x.id === item.id)));
      setConfirmPurgeId(null);
    } catch (err) {
      setRowMsg({ id: item.id, text: "Couldn't delete permanently — try again.", ok: false });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Trash</h1>
          <p className="page-subtitle">Deleted items across Jobs, Tasks and Materials — restore any time, or delete permanently.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-orange-600 font-medium">← Dashboard</Link>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {(["all", "job", "task", "material"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filter === f
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            {f === "all" ? "All" : `${KIND_LABEL[f]}s`}
            <span className="ml-1 opacity-70">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* States: loading / error / empty / list */}
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
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Trash is empty.</p>
          <p className="mt-1 text-xs text-gray-400">Deleted jobs, tasks and materials appear here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No {KIND_LABEL[filter] || "items"} in Trash.</p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="mt-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400"
          >
            Show all
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const days = daysSince(item.archivedAt);
            const key = `${item.kind}-${item.id}`;
            return (
              <div key={key} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex flex-shrink-0 items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 border border-gray-200">
                    {KIND_LABEL[item.kind] || item.kind}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-gray-900 line-through">{item.title}</div>
                    <div className="mt-0.5 truncate text-xs text-gray-500">
                      Deleted {whenLabel(item.archivedAt)}
                      {item.archivedBy ? ` by ${item.archivedBy}` : ""}
                    </div>
                    {rowMsg && rowMsg.id === item.id && (
                      <div className={`mt-1 text-xs font-medium ${rowMsg.ok ? "text-green-700" : "text-red-700"}`}>
                        {rowMsg.text}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {confirmPurgeId !== key ? (
                      <>
                        <button
                          onClick={() => restore(item)}
                          disabled={busyId === item.id}
                          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400 disabled:bg-gray-100"
                        >
                          {busyId === item.id ? "…" : "Restore"}
                        </button>
                        {canPurge && (
                          <button
                            onClick={() => setConfirmPurgeId(key)}
                            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                            title="Delete permanently (admin only)"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => purge(item)}
                          disabled={busyId === item.id}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-gray-400"
                        >
                          {busyId === item.id ? "Deleting…" : "Yes, delete forever"}
                        </button>
                        <button
                          onClick={() => setConfirmPurgeId(null)}
                          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!canPurge && items.length > 0 && (
        <p className="text-[11px] text-gray-500 text-center">Permanent deletion is available to admin / MD / manager roles only.</p>
      )}
    </div>
  );
}
