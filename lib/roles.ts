// Single source of truth for role-based navigation and page access.
//
// This is a UX/routing convenience layer, NOT the security boundary — the
// backend independently enforces permissions at the API layer (role checks,
// department checks, financial-field stripping) regardless of what the
// frontend shows or allows navigation to. See CLAUDE.md and
// AZ-Joinery-App-Audit-and-Plan.md for the full picture.
//
// Role names match the backend's `ROLES` set exactly (server.py ~line 28).
// "designer" and "employee" are legacy aliases kept for old accounts —
// treated identically to "drafter" / "cabinet_maker" here.

export type Role =
  | "managing_director"
  | "manager"
  | "department_manager"
  | "admin"
  | "supervisor"
  | "office"
  | "drafter"
  | "designer"
  | "cabinet_maker"
  | "installer"
  | "employee"
  | "contractor";

export type PageKey =
  | "dashboard"
  | "jobs"
  | "tasks"
  | "inventory"
  | "sales"
  | "analytics"
  | "invoices"
  | "design";

export const PAGES: Record<PageKey, { href: string; label: string; icon: string }> = {
  dashboard: { href: "/dashboard", label: "Dashboard", icon: "📊" },
  jobs: { href: "/jobs", label: "Jobs", icon: "📋" },
  tasks: { href: "/tasks", label: "Tasks", icon: "✓" },
  inventory: { href: "/inventory", label: "Inventory", icon: "📦" },
  sales: { href: "/sales", label: "Sales", icon: "🎯" },
  analytics: { href: "/analytics", label: "Analytics", icon: "📈" },
  invoices: { href: "/invoices", label: "Invoices", icon: "💰" },
  design: { href: "/design", label: "Design", icon: "📐" },
};

const ALL_PAGES: PageKey[] = ["dashboard", "jobs", "tasks", "inventory", "sales", "analytics", "invoices", "design"];

// Pages each role can reach, in nav display order. First entry = landing
// page after login. Roles not listed here fall back to a minimal safe
// default (dashboard + tasks) rather than accidentally granting broad access.
const ROLE_PAGES: Partial<Record<Role, PageKey[]>> = {
  managing_director: ALL_PAGES,
  manager: ALL_PAGES,
  department_manager: ALL_PAGES,
  admin: ALL_PAGES,

  // Floor/production oversight — no financial pages (Sales/Invoices), no Design.
  supervisor: ["dashboard", "jobs", "tasks", "inventory"],

  // Materials/purchasing-facing role.
  office: ["inventory", "invoices", "dashboard"],

  // Design module only — matches the original app (Design + Profile only).
  // "designer" is a legacy alias for "drafter" (same access), per decision.
  drafter: ["design"],
  designer: ["design"],

  // Floor workers — daily production log + their own tasks only.
  cabinet_maker: ["dashboard", "tasks"],
  installer: ["dashboard", "tasks"],
  employee: ["dashboard", "tasks"],
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
