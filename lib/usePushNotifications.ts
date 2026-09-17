"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

type PushStatus = "idle" | "unsupported" | "denied" | "subscribed" | "error";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("idle");
  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setStatus("unsupported"); return; }
    if (Notification.permission === "denied") { setStatus("denied"); return; }
    async function subscribe() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (existing) { setStatus("subscribed"); return; }
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") { setStatus("denied"); return; }
        }
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        await api.post("/push/subscribe", { subscription: subscription.toJSON() });
        setStatus("subscribed");
      } catch (err) {
        console.error("[Push] Subscription failed:", err);
        setStatus("error");
      }
    }
    subscribe();
  }, []);
  return { status };
}

export function PushSetup() {
  usePushNotifications();
  return null;
}
