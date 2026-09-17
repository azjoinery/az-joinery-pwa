/**
 * usePushNotifications — lib/usePushNotifications.ts
 *
 * Subscribes the logged-in user to Web Push notifications.
 * Call this once inside a layout or dashboard component that mounts after login.
 *
 * Setup steps (one-time):
 *  1. Generate VAPID keys:
 *       npx web-push generate-vapid-keys
 *  2. Add to Vercel environment variables (Settings → Environment Variables):
 *       NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>
 *  3. Add to Render environment variables:
 *       VAPID_PUBLIC_KEY=<publicKey>
 *       VAPID_PRIVATE_KEY=<privateKey>
 *       VAPID_EMAIL=mailto:azjoinery@outlook.com
 *  4. Install web-push in backend:
 *       pip install pywebpush
 *  5. Paste the server.py additions from the backend push file.
 *  6. Call <PushSetup /> inside your app layout (below the auth check).
 */
 
"use client";
 
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
 
// The public VAPID key must be in your Vercel env as NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
 
// Convert base64 VAPID public key to Uint8Array (required by the browser API)
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
    // Don't attempt if no VAPID key configured or browser doesn't support push
    if (!VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    // Don't re-subscribe if already denied
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
 
    async function subscribe() {
      try {
        const registration = await navigator.serviceWorker.ready;
 
        // Check if already subscribed
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          setStatus("subscribed");
          return;
        }
 
        // Request permission if not already granted
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            setStatus("denied");
            return;
          }
        }
 
        // Create new push subscription
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
 
        // Send subscription to backend — the backend identifies the user
        // from the existing auth token (JWT cookie / Authorization header)
        await api.post("/push/subscribe", {
          subscription: subscription.toJSON(),
        });
 
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
 
/**
 * Drop this component inside your app layout (e.g. app/(app)/layout.tsx)
 * right after the auth check. It silently subscribes the user to push.
 *
 * Usage:
 *   import { PushSetup } from "@/lib/usePushNotifications";
 *   // inside your layout:
 *   <PushSetup />
 */
export function PushSetup() {
  usePushNotifications();
  return null; // renders nothing — side-effect only
}
 
