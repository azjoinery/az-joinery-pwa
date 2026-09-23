// Single source of truth for role-based navigation and page access.
//
// This is a UX/routing convenience layer, NOT the security boundary — the
// backend independently enforces permissions at the API layer (role checks,
// department checks, financial-field stripping) regardless of what the
// frontend shows or allows navigation to. See CLAUDE.md and
// AZ-Joinery-App-Audit-and-Plan.md for the full picture.
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

export type NavGroup = "Workshop" | "Commercial" | "Business";

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
  | "inventory"
  | "production"
  | "office"
  | "sales"
  | "analytics"
  | "invoices"
  | "design"
  | "team"
  | "accounts";

// `icon` is a key into the app icon set (lib/components/Icon.tsx) — not an
// emoji. Emojis render differently on every OS and read as unprofessional in
// a business tool, so the nav uses a single consistent stroked SVG set.
// `group` drives the section dividers in the desktop sidebar.
export const PAGES: Record<
  PageKey,
  { href: string; label: string; icon: IconName; group: NavGroup }
> = {
  dashboard:  { href: "/dashboard",  label: "Dashboard",  icon: "dashboard", group: "Workshop" },
  jobs:       { href: "/jobs",       label: "Jobs",       icon: "jobs",      group: "Workshop" },
  tasks:      { href: "/tasks",      label: "Tasks",      icon: "tasks",     group: "Workshop" },
  design:     { href: "/design",     label: "Design",     icon: "design",    group: "Workshop" },
  inventory:  { href: "/inventory",  label: "Inventory",  icon: "inventory", group: "Workshop" },
  production: { href: "/production", label: "Production", icon: "wrench",     group: "Workshop" },
  office:     { href: "/office",     label: "Purchasing", icon: "truck",     group: "Workshop" },

  sales:     { href: "/sales",     label: "Sales",     icon: "sales",     group: "Commercial" },
  invoices:  { href: "/invoices",  label: "Invoices",  icon: "invoices",  group: "Commercial" },
  accounts:  { href: "/accounts",  label: "Accounts",  icon: "accounts",  group: "Commercial" },
  analytics: { href: "/analytics", label: "Analytics", icon: "analytics", group: "Commercial" },

  team:      { href: "/team",      label: "Team",      icon: "team",      group: "Business" },
};

export const NAV_GROUP_ORDER: NavGroup[] = ["Workshop", "Commercial", "Business"];

// Full-access page list, in nav display order within each group. "production"
// and "office" (Purchasing) sit in the Workshop group with the other
// operational pages; the Commercial/Business pages follow.
const ALL_PAGES: PageKey[] = ["dashboard", "jobs", "tasks", "design", "inventory", "production", "office", "sales", "analytics", "invoices", "accounts"];

// Managing Director, General Manager, and Admin get everything Department
// Manager gets (ALL_PAGES) plus the Team/Roles page. Team is deliberately
// withheld from department_manager — the backend already treats that role
// as legacy/non-assignable (roles/catalog marks it "assignable": false),
// and user management is sensitive enough to keep to the top 3 roles only.
const ALL_PAGES_PLUS_TEAM: PageKey[] = [...ALL_PAGES, "team"];

// Pages each role can reach, in nav display order. First entry = landing
// page after login. Roles not listed here fall back to a minimal safe
// default (dashboard + tasks) rather than accidentally granting broad access.
const ROLE_PAGES: Partial<Record<Role, PageKey[]>> = {
  managing_director: ALL_PAGES_PLUS_TEAM,
  manager: ALL_PAGES_PLUS_TEAM,
  department_manager: ALL_PAGES,
  admin: ALL_PAGES_PLUS_TEAM,

  // Floor/production oversight — no financial pages (Sales/Invoices), no Design.
  // Production is their main screen, so it sits right after the daily basics.
  supervisor: ["dashboard", "jobs", "tasks", "production", "inventory"],

  // Materials/purchasing-facing role. Purchasing is the queue they work from,
  // added right after their existing landing page (Inventory).
  office: ["inventory", "office", "invoices", "accounts", "dashboard"],

  // Design module only — matches the original app (Design + Profile only).
  drafter: ["design"],

  // Floor workers — daily production log, their own tasks, and the build queue
  // so cabinet makers can see what to pick up without typing a URL.
  cabinet_maker: ["dashboard", "tasks", "production"],
  installer: ["dashboard", "tasks"],
  employee: ["dashboard", "tasks", "production"],
  contractor: ["dashboard", "tasks"],
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

// Given the current pathname (e.g. "/jobs"), is this role allowed here?
// Unmapped paths (e.g. a future page not yet added to PAGES) are allowed
// through by default — this table only restricts the known feature pages.
export function isPathAllowedForRole(pathname: string, role: string | undefined | null): boolean {
  const pageKey = (Object.keys(PAGES) as PageKey[]).find((key) => PAGES[key].href === pathname);
  if (!pageKey) return true;
  return pagesForRole(role).includes(pageKey);
}
