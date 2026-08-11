"use client";

import { useEffect, useState } from "react";
import Icon from "@/lib/components/Icon";

/**
 * Install experience for app.azjoinery.com.au.
 *
 * Behaviour by platform:
 *   Android / Chrome / Edge  — real install button driven by the browser's
 *                              beforeinstallprompt event.
 *   iPhone / iPad (Safari)   — Safari has no install API, so we show honest
 *                              Share → Add to Home Screen instructions rather
 *                              than pretending a button can do it.
 *   Desktop Chrome / Edge    — same install event as Android.
 *   Already installed        — renders nothing at all.
 *
 * Dismissal is remembered for 30 days so staff aren't nagged every shift.
 */

const DISMISS_KEY = "az-install-dismissed-until";
const DISMISS_DAYS = 30;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "installable" | "other";

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already running as an installed app — never prompt.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari exposes this instead of display-mode.
      (window.navigator as any).standalone === true;
    if (standalone) return;

    // Respect an earlier dismissal.
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (until && Date.now() < until) return;
    } catch {
      /* private mode — just show the prompt */
    }

    const ua = window.navigator.userAgent;
    const isIos =
      /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as a Mac; the touch check disambiguates.
      (/Macintosh/.test(ua) && "ontouchend" in document);

    if (isIos) {
      setPlatform("ios");
      setVisible(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault(); // stop Chrome's own mini-infobar
      setDeferred(e as BeforeInstallPromptEvent);
      setPlatform("installable");
      setVisible(true);
    };

    const onInstalled = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setShowIosHelp(false);
    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DAYS * 864e5)
      );
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setVisible(false);
    else dismiss();
    setDeferred(null);
  };

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 lg:left-auto lg:right-4 lg:w-[380px]"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        role="complementary"
        aria-label="Install AZ Joinery"
      >
        <div className="card animate-fade-up shadow-pop">
          <div className="flex items-start gap-3 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-mark.webp"
              alt=""
              width={40}
              height={41}
              className="mt-0.5 shrink-0 rounded-lg bg-[#F7F7F5] p-1 ring-1 ring-black/5"
            />
            <div className="min-w-0 flex-1">
              <p className="font-heading text-[15px] font-semibold text-ink-900">
                Install AZ Joinery
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-ink-500">
                {platform === "ios"
                  ? "Add it to your Home Screen for full-screen access."
                  : "Add it to your device for quicker, full-screen access."}
              </p>

              <div className="mt-3 flex gap-2">
                {platform === "ios" ? (
                  <button
                    onClick={() => setShowIosHelp(true)}
                    className="btn-primary btn-sm"
                  >
                    Show me how
                  </button>
                ) : (
                  <button onClick={install} className="btn-primary btn-sm">
                    <Icon name="download" size={15} />
                    Install
                  </button>
                )}
                <button onClick={dismiss} className="btn-ghost btn-sm">
                  Not now
                </button>
              </div>
            </div>

            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="-mr-1 -mt-1 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            >
              <Icon name="close" size={17} />
            </button>
          </div>
        </div>
      </div>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/60 p-3 animate-fade-in sm:items-center"
          onClick={() => setShowIosHelp(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
        >
          <div
            className="card w-full max-w-sm animate-fade-up p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="ios-install-title" className="section-title">
              Add to Home Screen
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Safari can&apos;t install apps automatically — it takes two taps.
            </p>

            <ol className="mt-4 space-y-3">
              <Step n={1}>
                Tap the <strong className="font-semibold">Share</strong> button
                at the bottom of Safari (the square with an arrow pointing up).
              </Step>
              <Step n={2}>
                Scroll down and choose{" "}
                <strong className="font-semibold">Add to Home Screen</strong>.
              </Step>
              <Step n={3}>
                Tap <strong className="font-semibold">Add</strong>. The AZ
                Joinery icon will appear on your Home Screen.
              </Step>
            </ol>

            <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2.5 text-xs leading-relaxed text-ink-500">
              This only works in Safari. If you&apos;re in Chrome or another
              browser on iPhone, open{" "}
              <span className="ref">app.azjoinery.com.au</span> in Safari first.
            </p>

            <button
              onClick={() => {
                setShowIosHelp(false);
                dismiss();
              }}
              className="btn-primary mt-4 w-full"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-orange text-[12px] font-semibold text-white">
        {n}
      </span>
      <span className="text-sm leading-snug text-ink-700">{children}</span>
    </li>
  );
}
