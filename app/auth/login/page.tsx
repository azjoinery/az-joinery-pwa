"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store/auth";
import { landingPageForRole } from "@/lib/roles";
import Icon from "@/lib/components/Icon";
import { LogoFull, LogoMark } from "@/lib/components/Brand";

export default function LoginPage() {
  const [mode, setMode] = useState<"pin" | "admin">("pin");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ---------------- Brand / imagery panel ---------------- */}
      <section className="relative isolate hidden overflow-hidden bg-ink-950 lg:flex lg:w-[52%] xl:w-[56%]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/workshop/hero-wide.jpg)" }}
          role="img"
          aria-label="The AZ Joinery workshop floor"
        />
        <div className="img-scrim absolute inset-0" />

        <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
          <LogoFull size={112} plaque />

          <div className="max-w-lg">
            <h1 className="font-heading text-4xl font-semibold leading-[1.15] tracking-tight text-white xl:text-5xl">
              Built with precision.
              <br />
              <span className="text-brand-orange">Run with purpose.</span>
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-white/70">
              Every job, drawing, order and invoice — in one place for the whole
              team. From the first measure to the final install.
            </p>

            <div className="mt-10 flex flex-wrap gap-x-10 gap-y-5">
              <Metric value="7+" label="Years of craft" />
              <Metric value="100%" label="Custom made" />
              <Metric value="Sydney" label="Chipping Norton" />
            </div>
          </div>

          <p className="text-xs tracking-wide text-white/35">
            AZ Joinery Pty Ltd · Custom kitchens, wardrobes & cabinetry
          </p>
        </div>
      </section>

      {/* ---------------- Form panel ---------------- */}
      <section className="flex flex-1 flex-col bg-white">
        {/* Mobile branded header */}
        <div className="relative isolate overflow-hidden bg-ink-950 px-6 py-9 lg:hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/workshop/team-square-sm.jpg)" }}
          />
          <div className="img-scrim absolute inset-0" />
          <div className="relative z-10 flex items-center gap-3">
            <LogoMark size={40} plaque />
            <div>
              <div className="font-heading text-xl font-semibold tracking-tight text-white">
                AZ Joinery
              </div>
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
                Management System
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[380px]">
            {mode === "pin" ? (
              <PinForm onSwitchToAdmin={() => setMode("admin")} />
            ) : (
              <AdminForm onSwitchToPin={() => setMode("pin")} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── PIN pad ─────────────────────────────────────────────────────── */
function PinForm({ onSwitchToAdmin }: { onSwitchToAdmin: () => void }) {
  const router = useRouter();
  const { pinLogin, loading, error } = useAuth();
  const [digits, setDigits] = useState("");

  const press = async (d: string) => {
    if (loading) return;
    const next = (digits + d).slice(0, 6);
    setDigits(next);
    if (next.length === 6) {
      const user = await pinLogin(next);
      if (user) {
        router.push(user.pinSet === false ? "/auth/set-pin" : landingPageForRole(user.role));
      } else {
        setDigits("");
      }
    }
  };

  const del = () => setDigits((p) => p.slice(0, -1));

  return (
    <>
      <div className="mb-8 text-center">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-ink-900">
          Enter your PIN
        </h2>
        <p className="page-subtitle">Enter your 6-digit PIN to sign in.</p>
      </div>

      {/* Dots */}
      <div className="mb-8 flex justify-center gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full border-2 transition-colors ${
              i < digits.length
                ? "border-brand-orange bg-brand-orange"
                : "border-ink-300 bg-transparent"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="alert-danger mb-5" role="alert">
          <Icon name="alert" size={17} className="mt-px shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3">
        {["1","2","3","4","5","6","7","8","9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => press(d)}
            disabled={loading}
            className="flex h-16 items-center justify-center rounded-2xl border border-ink-200 bg-white font-heading text-2xl font-semibold text-ink-900 transition-colors hover:bg-ink-50 active:bg-ink-100 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        {/* Bottom row: empty, 0, delete */}
        <div />
        <button
          type="button"
          onClick={() => press("0")}
          disabled={loading}
          className="flex h-16 items-center justify-center rounded-2xl border border-ink-200 bg-white font-heading text-2xl font-semibold text-ink-900 transition-colors hover:bg-ink-50 active:bg-ink-100 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={del}
          disabled={loading || digits.length === 0}
          className="flex h-16 items-center justify-center rounded-2xl border border-ink-200 bg-white text-ink-500 transition-colors hover:bg-ink-50 active:bg-ink-100 disabled:opacity-30"
          aria-label="Delete"
        >
          <span className="text-xl">⌫</span>
        </button>
      </div>

      <div className="mt-8 border-t border-ink-200 pt-6 text-center text-xs text-ink-500">
        <button
          type="button"
          onClick={onSwitchToAdmin}
          className="font-semibold text-ink-700 hover:text-brand-orange"
        >
          Admin login
        </button>
        <span className="mx-2 text-ink-300">·</span>
        Trouble? Call{" "}
        <a href="tel:0455553619" className="font-semibold text-ink-700 hover:text-brand-orange">
          0455 553 619
        </a>
      </div>
    </>
  );
}

/* ── Admin (email + password) form ──────────────────────────────── */
function AdminForm({ onSwitchToPin }: { onSwitchToPin: () => void }) {
  const router = useRouter();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await login(email, password);
    if (user) router.push(landingPageForRole(user.role));
  };

  return (
    <>
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-ink-900">
          Admin sign in
        </h2>
        <p className="page-subtitle">Enter your email and password to continue.</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5" noValidate>
        <div className="field">
          <label htmlFor="email" className="label">Email address</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@azjoinery.com.au"
            disabled={loading}
            className="input"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="input pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="alert-danger" role="alert">
            <Icon name="alert" size={17} className="mt-px shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in…" : (<>Sign in <Icon name="arrowRight" size={18} /></>)}
        </button>
      </form>

      <div className="mt-8 border-t border-ink-200 pt-6 text-center text-xs text-ink-500">
        <button
          type="button"
          onClick={onSwitchToPin}
          className="font-semibold text-ink-700 hover:text-brand-orange"
        >
          ← Back to PIN login
        </button>
      </div>
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-heading text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
    </div>
  );
}
