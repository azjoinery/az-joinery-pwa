"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

const CATEGORY_ICON: Record<string, string> = {
  job: "🧰",
  task: "✅",
  flag: "🚩",
  report: "📋",
  stock: "📦",
  design: "📐",
  override: "⚠️",
  lead: "🎯",
  followup: "📞",
  materials: "📦",
  query: "💬",
  "query.reply": "💬",
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

  const handleItemClick = (n: Notification) => {
    if (!n.read) markRead(n.id);
    const entityType = (n.link || "").split(":")[0] || n.category || n.kind || "";
    const dest = ENTITY_PAGE[entityType];
    if (dest) {
      setOpen(false);
      router.push(dest);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-orange-500 text-white text-[10px] font-bold rounded-full">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {items.some((n) => !n.read) && (
              <button
                onClick={markAllRead}
                className="text-xs text-orange-600 hover:text-orange-800 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && (
              <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
            )}
            {error && (
              <div className="p-3 m-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500">
                No notifications yet.
              </div>
            )}
            {!loading &&
              items.map((n) => {
                const icon = CATEGORY_ICON[n.category || n.kind || ""] || "🔔";
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`flex gap-2 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !n.read ? "bg-orange-50/50" : ""
                    }`}
                  >
                    <div className="text-lg leading-none pt-0.5">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!n.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-gray-400">{timeAgo(n.createdAt)}</span>
                        <button
                          onClick={(e) => removeNotification(n.id, e)}
                          className="text-[11px] text-gray-400 hover:text-red-600"
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
