export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  SUPERVISOR: "supervisor",
  CABINETMAKER: "cabinet_maker",
  DRAFTER: "drafter",
  DESIGNER: "designer",
  INSTALLER: "installer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface RoleConfig {
  label: string;
  dashboardTabs: Array<{ key: string; label: string }>;
  defaultTab: string;
  accessiblePages: string[];
  description: string;
}

export const ROLE_CONFIG: Record<Role, RoleConfig> = {
  [ROLES.ADMIN]: {
    label: "Admin",
    dashboardTabs: [
      { key: "home", label: "Home" },
      { key: "users", label: "Users" },
      { key: "settings", label: "Settings" },
      { key: "audit", label: "Audit Log" },
    ],
    defaultTab: "home",
    accessiblePages: [
      "/dashboard",
      "/users",
      "/design",
      "/jobs",
      "/tasks",
      "/inventory",
      "/sales",
      "/analytics",
      "/settings",
    ],
    description: "System administrator with full access",
  },

  [ROLES.MANAGER]: {
    label: "Manager",
    dashboardTabs: [
      { key: "home", label: "Home" },
      { key: "design", label: "Design" },
      { key: "jobs", label: "Jobs" },
      { key: "sales", label: "Sales" },
      { key: "analytics", label: "Analytics" },
    ],
    defaultTab: "home",
    accessiblePages: [
      "/dashboard",
      "/design",
      "/jobs",
      "/sales",
      "/analytics",
      "/inventory",
      "/tasks",
    ],
    description: "Business management and oversight",
  },

  [ROLES.SUPERVISOR]: {
    label: "Supervisor",
    dashboardTabs: [
      { key: "home", label: "Home" },
      { key: "jobs", label: "Jobs" },
      { key: "log", label: "My Log" },
      { key: "allocate", label: "Allocate" },
      { key: "output", label: "Output" },
      { key: "staff", label: "Staff" },
    ],
    defaultTab: "home",
    accessiblePages: [
      "/dashboard",
      "/jobs",
      "/tasks",
      "/inventory",
      "/analytics",
    ],
    description: "Production coordination and supervision",
  },

  [ROLES.CABINETMAKER]: {
    label: "Cabinetmaker",
    dashboardTabs: [
      { key: "log", label: "Daily Log" },
      { key: "tasks", label: "Tasks" },
      { key: "output", label: "My Output" },
    ],
    defaultTab: "log",
    accessiblePages: ["/dashboard", "/jobs", "/tasks"],
    description: "Cabinet production work",
  },

  [ROLES.DRAFTER]: {
    label: "Drafter",
    dashboardTabs: [
      { key: "design", label: "Design" },
      { key: "tasks", label: "Tasks" },
      { key: "profile", label: "Profile" },
    ],
    defaultTab: "design",
    accessiblePages: ["/dashboard", "/design", "/tasks"],
    description: "Design support and drafting",
  },

  [ROLES.DESIGNER]: {
    label: "Designer",
    dashboardTabs: [
      { key: "design", label: "Design" },
      { key: "jobs", label: "Design Jobs" },
      { key: "catalog", label: "Catalog" },
      { key: "profile", label: "Profile" },
    ],
    defaultTab: "design",
    accessiblePages: ["/dashboard", "/design", "/jobs", "/tasks"],
    description: "Design workflow management",
  },

  [ROLES.INSTALLER]: {
    label: "Installer",
    dashboardTabs: [
      { key: "log", label: "Daily Log" },
      { key: "tasks", label: "Tasks" },
      { key: "jobs", label: "My Jobs" },
    ],
    defaultTab: "log",
    accessiblePages: ["/dashboard", "/jobs", "/tasks"],
    description: "On-site installation work",
  },
};

export function getRoleConfig(role?: string): RoleConfig {
  if (!role || !role in ROLE_CONFIG) {
    return ROLE_CONFIG[ROLES.CABINETMAKER];
  }
  return ROLE_CONFIG[role as Role];
}

export function canAccessPage(role: string, page: string): boolean {
  const config = getRoleConfig(role);
  return config.accessiblePages.some((p) =>
    page.startsWith(p)
  );
}
