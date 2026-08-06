"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api/client";
import type { Notification } from "@/lib/types/models";

interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<NotificationsResponse>("/notifications");
      setNotifications(response.data);
      setUnreadCount(response.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/notifications/${id}/read`, { method: "POST" });
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to mark notification as read");
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await apiFetch("/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
      setUnreadCount(0);
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed to mark all as read");
    }
  }, []);

  const deleteNotification = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/notifications/${id}`, { method: "DELETE" });
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to delete notification");
      }
    },
    []
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
