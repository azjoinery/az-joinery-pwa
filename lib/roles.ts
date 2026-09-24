// Single source of truth for role-based navigation and page access.
//
// This is a UX/routing convenience layer, NOT the security boundary — the
// backend independently enforces permissions at the API layer (role checks,
// department checks, financial-field stripping) regardless of what the
// frontend shows or allows navigation to.
//
// Role names match the backend's `ROLES` set exactly (server.py ~line 28).
// "employee" is a legacy alias kept for old accounts, treated identically to
// "cabinet_maker" here. "designer" (legacy alias for "drafter") has been
// deliberately dropped from this table per Allan's decision — Designer is
// not a distinct role going forward, it's just Drafter. The backend still
// accepts "designer" as a legacy DB value for old rows, but no new account
// should ever be created with it, and this frontend treats it as an
// unmapped role (falls through to the SAFE_DEFAULT below) rather than
// giving it special-cased access.

import type { IconName } from "@/lib/components/Icon";

// Groups shown in the desktop sidebar and as section headers in the mobile
// More drawer. Order in NAV_GROUP_ORDER controls display order.
export type NavGroup = "Workshop" | "Production" | "Design" | "Office" | "Business";

export type Role =
  | "managing_director"
  | "manager"
  | "department_manager"
  | "admin"
  | "supervisor"
  | "office"
  | "drafter"
  | "cabinet_maker"
  | "installer"
  | "employee"
  | "contractor";

export type PageKey =
  | "dashboard"
  | "jobs"
  | "tasks"
  | "queue"
  | "inventory"
  | "materials"
  | "design"
  | "briefs"
  | "variations"
  | "office"
  | "sales"
  | "analytics"
  | "invoices"
  | "accounts"
  | "team";

// `icon` is a key into the app icon set (lib/components/Icon.tsx) — not an
// emoji. `group` drives section dividers in the desktop sidebar and the
// grouped MORE drawer on mobile.
export const PAGES: Record<
  PageKey,
  { href: string; label: string; icon: IconName; group: NavGroup }
> = {
  // ── Workshop (primary nav) ──────────────────────────────────────────
  dashboard:  { href: "/dashboard",  label: "Dashboard",  icon: "dashboard", group: "Workshop"    },
  jobs:       { href: "/jobs",       label: "Jobs",       icon: "jobs",      group: "Workshop"    },
  tasks:      { href: "/tasks",      label: "Tasks",      icon: "tasks",     group: "Workshop"    },

  // ── Production ─────────────────────────────────────────────────────
  queue:      { href: "/queue",      label: "Queue",      icon: "wrench",    group: "Production"  },
  materials:  { href: "/materials",  label: "Materials",  icon: "inventory", group: "Production"  },
  inventory:  { href: "/inventory",  label: "Inventory",  icon: "inventory", group: "Production"  },

  // ── Design ─────────────────────────────────────────────────────────
  design:     { href: "/design",     label: "Design",     icon: "design",    group: "Design"      },
  briefs:     { href: "/briefs",     label: "Briefs",     icon: "document",  group: "Design"      },
  variations: { href: "/variations", label: "Variation",  icon: "alert",     group: "Design"      },

  // ── Office ─────────────────────────────────────────────────────────
  office:     { href: "/office",     label: "Purchasing", icon: "truck",     group: "Office"      },
  sales:      { href: "/sales",      label: "Sales",      icon: "sales",     group: "Office"      },
  invoices:   { href: "/invoices",   label: "Invoices",   icon: "invoices",  group: "Office"      },
  accounts:   { href: "/accounts",   label: "Accounts",   icon: "accounts",  group: "Office"      },
  analytics:  { href: "/analytics",  label: "Analytics",  icon: "analytics", group: "Office"      },

  // ── Business ───────────────────────────────────────────────────────
  team:       { href: "/team",       label: "Team",       icon: "team",      group: "Business"    },
};

export const NAV_GROUP_ORDER: NavGroup[] = [
  "Workshop",
  "Production",
  "Design",
  "Office",
  "Business",
];

// ── Executive / Management ──────────────────────────────────────────────────
// Primary mobile: DASHBOARD | JOBS | TASKS | MORE  (3 primary, rest in More)
// Desktop sidebar shows all, grouped by NavGroup.
const EXEC_PAGES: PageKey[] = [
  // Primary (first 3 → shown in bottom bar)
  "dashboard", "jobs", "tasks",
  // Design → MORE drawer, Design section
  "design", "briefs", "variations",
  // Production → MORE drawer, Production section
  "queue", "materials", "inventory",
  // Office → MORE drawer, Office section
  "office", "sales", "invoices", "accounts", "analytics",
  // Business → MORE drawer
  "team",
];

// Managing Director / Manager / Admin get the full list + Team.
// department_manager does not get Team (user management is sensitive).
const EXEC_NO_TEAM: PageKey[] = EXEC_PAGES.filter((p) => p !== "team");

// Pages each role can reach, in nav display order.
// • First entry = landing page after login.
// • Roles not listed fall back to SAFE_DEFAULT rather than accidentally
//   granting broad access.
const ROLE_PAGES: Partial<Record<Role, PageKey[]>> = {
  managing_director: EXEC_PAGES,
  manager:           EXEC_PAGES,
  department_manager: EXEC_NO_TEAM,
  admin:             EXEC_PAGES,

  // Production oversight — floor + queue visibility, no financial pages.
  supervisor: ["dashboard", "jobs", "tasks", "queue", "inventory", "materials"],

  // Materials/purchasing-facing role. Office is their landing page.
  office: ["office", "inventory", "invoices", "accounts", "dashboard"],

  // Drafter: DASHBOARD | JOBS | TASKS | BRIEFS | VARIATION (5 primary tabs)
  drafter: ["dashboard", "jobs", "tasks", "briefs", "variations"],

  // Floor workers — daily production log and build queue.
  cabinet_maker: ["dashboard", "tasks", "queue", "materials"],
  installer:     ["dashboard", "tasks"],
  employee:      ["dashboard", "tasks", "queue", "materials"],
  contractor:    ["dashboard", "tasks"],
};

const SAFE_DEFAULT: PageKey[] = ["dashboard", "tasks"];

export function pagesForRole(role: string | undefined | null): PageKey[] {
  if (!role) return [];
  return ROLE_PAGES[role as Role] || SAFE_DEFAULT;
}

export function navItemsForRole(role: string | undefined | null) {
  return pagesForRole(role).map((key) => ({ key, ...PAGES[key] }));
}

export function landingPageForRole(role: string | undefined | null): string {
  const pages = pagesForRole(role);
  return pages.length ? PAGES[pages[0]].href : "/dashboard";
}

// How many tabs to pin to the mobile bottom bar before the overflow → MORE.
// Drafter has 5 distinct tabs with no overflow.
// Exec roles get 3 primary (dashboard/jobs/tasks) and everything else in More.
// All other roles default to 4.
export function mobilePrimaryCount(role: string | undefined | null): number {
  if (!role) return 4;
  if (role === "drafter") return 5;
  if (
    role === "managing_director" ||
    role === "manager" ||
    role === "department_manager" ||
    role === "admin"
  )
    return 3;
  return 4;
}

// Given the current pathname (e.g. "/jobs"), is this role allowed here?
// Unmapped paths (e.g. a future page not yet added to PAGES) are allowed
// through by default — this table only restricts the known feature pages.
export function isPathAllowedForRole(
  pathname: string,
  role: string | undefined | null
): boolean {
  const pageKey = (Object.keys(PAGES) as PageKey[]).find(
    (key) => PAGES[key].href === pathname
  );
  if (!pageKey) return true;
  return pagesForRole(role).includes(pageKey);
}
