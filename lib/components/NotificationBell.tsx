"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Icon, { type IconName } from "@/lib/components/Icon";
import { api } from "@/lib/api/client";

interface Notification {
  id: string;
  userId?: string;
  category?: string;
  kind?: string;
  title: string;
  body?: string;
  link?: string;
  meta?: { jobId?: string; queryId?: string };
  read: boolean;
  createdAt: string;
}

// Notification category -> app icon. Keeps the panel consistent with the
// rest of the UI instead of mixing in emoji, which render differently on
// every device and read as unprofessional in a business tool.
const CATEGORY_ICON: Record<string, IconName> = {
  job: "jobs",
  task: "tasks",
  flag: "alert",
  report: "invoices",
  stock: "inventory",
  design: "design",
  override: "alert",
  lead: "sales",
  followup: "messages",
  materials: "inventory",
  query: "messages",
  "query.reply": "messages",
};

// Best-effort mapping from a notification's entity type to a page in this
// app. Not every category has a dedicated detail view yet, so this routes
// to the closest list page rather than a specific record.
const ENTITY_PAGE: Record<string, string> = {
  job: "/jobs",
  task: "/tasks",
  flag: "/analytics",
  report: "/analytics",
  material: "/inventory",
  stock: "/inventory",
  lead: "/sales",
  followup: "/sales",
  verify: "/jobs",
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { count } = await api.get<{ count: number }>("/notifications/unread-count");
      setUnread(count);
    } catch {
      // Silent — a failed background poll shouldn't interrupt the user,
      // and the api client already handles auth-expiry redirects globally.
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Notification[]>("/notifications?limit=50");
      setItems(data);
    } catch {
      setError("Couldn't load notifications. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      // Best-effort — a failed mark-read isn't worth surfacing an error banner for.
    }
  };

  const markAllRead = async () => {
    const hadUnread = items.filter((n) => !n.read).length;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await api.post("/notifications/read-all");
    } catch {
      // Revert optimistic update on failure so the badge stays honest.
      setUnread(hadUnread);
      fetchList();
    }
  };

  const removeNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const wasUnread = items.find((n) => n.id === id)?.read === false;
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnread((c) => Math.max(0, c - 1));
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      fetchList();
    }
  };

  const handleItemClick = async (n: Notification) => {
    // Awaited deliberately: navigating away can remount this component (e.g.
    // a role-based redirect if the link's target page isn't allowed for the
    // current user), which re-fetches the unread count from the server. If
    // that refetch wins a race against an in-flight PATCH, the badge would
    // briefly show the old count. Waiting here closes that race.
    if (!n.read) await markRead(n.id);
    const entityType = (n.link || "").split(":")[0] || n.category || n.kind || "";
    const dest = ENTITY_PAGE[entityType];
    setOpen(false);
    if (dest) {
      router.push(dest);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
      >
        <Icon name="notifications" size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 flex max-h-[70vh] w-80 max-w-[90vw] flex-col overflow-hidden rounded-card border border-ink-200 bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
            <h3 className="font-heading text-sm font-semibold text-ink-900">Notifications</h3>
            {items.some((n) => !n.read) && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-brand-orange hover:text-brand-orange-dark"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && (
              <div className="p-4 text-center text-sm text-ink-500">Loading...</div>
            )}
            {error && (
              <div className="alert-danger m-2">
                {error}
              </div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="p-6 text-center text-sm text-ink-500">
                No notifications yet.
              </div>
            )}
            {!loading &&
              items.map((n) => {
                const icon = CATEGORY_ICON[n.category || n.kind || ""] || "notifications";
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`flex cursor-pointer gap-2.5 border-b border-ink-100 px-4 py-3 transition-colors hover:bg-ink-50 ${
                      !n.read ? "bg-brand-orange/[0.05]" : ""
                    }`}
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500">
                      <Icon name={icon} size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!n.read ? "font-semibold text-ink-900" : "text-ink-700"}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
                        )}
                      </div>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{n.body}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-ink-400">{timeAgo(n.createdAt)}</span>
                        <button
                          onClick={(e) => removeNotification(n.id, e)}
                          className="text-[11px] text-ink-400 transition-colors hover:text-danger"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
