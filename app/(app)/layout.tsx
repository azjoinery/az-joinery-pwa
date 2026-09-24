  "use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/store/auth";
import {
  navItemsForRole,
  isPathAllowedForRole,
  landingPageForRole,
  mobilePrimaryCount,
  NAV_GROUP_ORDER,
  type NavGroup,
} from "@/lib/roles";
import NotificationBell from "@/lib/components/NotificationBell";
import Icon, { type IconName } from "@/lib/components/Icon";
import { BrandLockup, LogoFull, LogoMark } from "@/lib/components/Brand";
import InstallPrompt from "@/lib/components/InstallPrompt";
import { PushSetup } from "@/lib/usePushNotifications";

/**
 * App shell.
 *
 * Desktop / tablet ≥ lg : fixed dark charcoal sidebar rail, grouped nav.
 * Mobile               : sticky top bar + fixed bottom tab bar (thumb reach).
 *
 * The dark rail keeps the workshop-tool feel and lets the orange accent do
 * the wayfinding, while the content area stays light and high-contrast for
 * reading in a bright workshop.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, initialized, me, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    me();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wait for the initial session check before bouncing — otherwise a fresh
  // page load briefly sees user=null and kicks a logged-in user to login.
  useEffect(() => {
    if (initialized && !user) router.push("/auth/login");
  }, [user, initialized, router]);

  // Logged in but not allowed here (e.g. typed the URL) — send them home.
  // UX convenience only; the API is the real security boundary.
  useEffect(() => {
    if (initialized && user && !isPathAllowedForRole(pathname, user.role)) {
      router.replace(landingPageForRole(user.role));
    }
  }, [user, initialized, pathname, router]);

  const navItems = useMemo(
    () => navItemsForRole(user?.role),
    [user?.role]
  );

  const grouped = useMemo(() => {
    const map = new Map<NavGroup, typeof navItems>();
    for (const item of navItems) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return NAV_GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      items: map.get(g)!,
    }));
  }, [navItems]);

  const handleLogout = async () => {
    setSigningOut(true);
    await logout();
    router.push("/auth/login");
  };

  if (!initialized) return <BootSplash />;
  if (!user) return null;
  if (!isPathAllowedForRole(pathname, user.role)) return null;

  const roleLabel = user.role.replace(/_/g, " ");
  const initials = (user.name || "?")
    .split(" ")
    .slice(0, 2)
    .map((p: string) => p[0])
    .join("")
    .toUpperCase();

  // On phones the bottom bar can hold up to 5 items.
  // Drafter gets 5 primary tabs; exec roles get 3 primary + More;
  // everyone else defaults to 4 primary.
  const mobileLimit = mobilePrimaryCount(user?.role);
  const primaryMobile = navItems.slice(0, mobileLimit);
  const overflowMobile = navItems.slice(mobileLimit);

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Registers this logged-in user for push notifications. Renders nothing. */}
      <PushSetup />

      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-rail flex-col bg-ink-950 lg:flex"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="flex h-16 items-center border-b border-white/[0.07] px-5">
          <Link href={landingPageForRole(user.role)} className="rounded-md">
            <BrandLockup tone="light" markSize={30} />
          </Link>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
                {group}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`nav-item relative ${active ? "nav-item-active" : ""}`}
                    >
                      <Icon
                        name={item.icon}
                        size={19}
                        className={active ? "text-brand-orange" : ""}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + sign out */}
        <div className="border-t border-white/[0.07] p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-orange text-[13px] font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">
                {user.name}
              </div>
              <div className="truncate text-[11px] capitalize text-white/45">
                {roleLabel}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="nav-item mt-1 w-full disabled:opacity-50"
          >
            <Icon name="logout" size={19} />
            <span>{signingOut ? "Signing out…" : "Sign out"}</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN COLUMN ================= */}
      <div className="lg:pl-rail">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/85 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">
            {/* Mobile brand (sidebar is hidden) */}
            <Link
              href={landingPageForRole(user.role)}
              className="flex items-center gap-2.5 lg:hidden"
            >
              <LogoMark size={28} />
              <span className="font-heading text-[17px] font-semibold tracking-tight text-ink-900">
                AZ Joinery
              </span>
            </Link>

            {/* Desktop greeting */}
            <div className="hidden min-w-0 lg:block">
              <p className="truncate font-heading text-[15px] font-semibold text-ink-900">
                {greeting()}, {user.name?.split(" ")[0]}
              </p>
              <p className="text-xs text-ink-500">{todayLong()}</p>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <span className="hidden rounded-full bg-ink-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-600 sm:inline-block">
                {roleLabel}
              </span>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-orange text-[13px] font-semibold text-white lg:hidden">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="pb-nav lg:pb-0">{children}</main>
      </div>

      {/* Install-to-device prompt. Renders nothing when already installed. */}
      <InstallPrompt />

      {/* ================= MOBILE BOTTOM BAR ================= */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-ink-950 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Main navigation"
      >
        <div className="flex items-stretch">
          {primaryMobile.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`nav-tab ${active ? "nav-tab-active" : ""}`}
              >
                <Icon
                  name={item.icon}
                  size={21}
                  className={active ? "text-brand-orange" : ""}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <MoreMenu
            items={overflowMobile}
            pathname={pathname}
            onLogout={handleLogout}
          />
        </div>
      </nav>
    </div>
  );
}

/* ---------------------------------------------------------------- helpers */

function MoreMenu({
  items,
  pathname,
  onLogout,
}: {
  items: { key: string; href: string; label: string; icon: IconName; group: NavGroup }[];
  pathname: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const activeInMenu = items.some((i) => i.href === pathname);
  const groupedItems = NAV_GROUP_ORDER.map((group) => ({
    group,
    label: mobileGroupLabel(group),
    items: items.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`nav-tab ${activeInMenu ? "nav-tab-active" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Icon
          name="menu"
          size={21}
          className={activeInMenu ? "text-brand-orange" : ""}
        />
        <span>More</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-ink-950/60 animate-fade-in lg:hidden"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[82vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-200" />
            <div className="mb-4">
              <h2 className="font-heading text-lg font-semibold text-ink-900">More</h2>
              <p className="mt-1 text-sm text-ink-500">
                Everything else, grouped by how the business runs.
              </p>
            </div>
            <div className="space-y-5">
              {groupedItems.map((section) => (
                <div key={section.group}>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-500">
                    {section.label}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {section.items.map((item) => {
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={`flex min-h-[5.75rem] flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center text-xs font-medium transition-colors ${
                            active
                              ? "border-brand-orange bg-brand-orange/10 text-brand-orange-dark"
                              : "border-ink-200 text-ink-700 hover:bg-ink-50"
                          }`}
                        >
                          <Icon name={item.icon} size={22} />
                          <span className="leading-tight">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={onLogout}
              className="btn-secondary mt-3 w-full"
            >
              <Icon name="logout" size={18} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function mobileGroupLabel(group: NavGroup) {
  // "Workshop" items (dashboard/jobs/tasks) are in the primary bar — they only
  // appear here in the More drawer if a role has many items, so keep the label.
  return group;
}

/** Full-screen branded splash while the session is being checked. */
function BootSplash() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink-950">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: "url(/workshop/team-square-sm.jpg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/85 to-ink-950" />
      <div className="relative flex flex-col items-center gap-6">
        <LogoFull size={104} plaque className="animate-fade-up" />
        <div className="h-0.5 w-28 overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-orange" />
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLong() {
  return new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
