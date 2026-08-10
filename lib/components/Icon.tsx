/**
 * AZ Joinery icon system.
 *
 * A single, consistent, dependency-free SVG icon set. Every glyph shares the
 * same geometry so the UI never looks mismatched:
 *   - 24x24 viewBox
 *   - 1.75 stroke width, round caps + joins
 *   - currentColor stroke (inherits text colour)
 *   - no fills, no decorative flourishes
 *
 * Usage:  <Icon name="jobs" size={20} />
 *         <Icon name="jobs" className="text-brand-orange" />
 */

export type IconName =
  | "dashboard"
  | "jobs"
  | "tasks"
  | "inventory"
  | "sales"
  | "analytics"
  | "invoices"
  | "design"
  | "team"
  | "accounts"
  | "calendar"
  | "messages"
  | "uploads"
  | "settings"
  | "notifications"
  | "logout"
  | "menu"
  | "close"
  | "search"
  | "plus"
  | "edit"
  | "trash"
  | "eye"
  | "eyeOff"
  | "check"
  | "alert"
  | "info"
  | "clock"
  | "trendingUp"
  | "dollar"
  | "chevronDown"
  | "chevronRight"
  | "chevronLeft"
  | "arrowRight"
  | "filter"
  | "download"
  | "user"
  | "building"
  | "truck"
  | "wrench";

const PATHS: Record<IconName, React.ReactNode> = {
  // ---- Primary navigation -------------------------------------------------
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  jobs: (
    <>
      <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1Z" />
      <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <path d="M8.5 11h7M8.5 15h4.5" />
    </>
  ),
  tasks: (
    <>
      <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
      <path d="m9 12 2.5 2.5L20 6" />
    </>
  ),
  inventory: (
    <>
      <path d="M20.5 7.5 12 3 3.5 7.5v9L12 21l8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </>
  ),
  sales: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  invoices: (
    <>
      <path d="M6 3h9l4 4v13a1 1 0 0 1-1.5.9L15 20l-2 1.2L11 20l-2 1.2L7 20l-1.5.9A1 1 0 0 1 4 20V5a2 2 0 0 1 2-2Z" />
      <path d="M14.5 3v4H19M8 11h7M8 15h4.5" />
    </>
  ),
  design: (
    <>
      <path d="M3.8 15.5 15.5 3.8a2 2 0 0 1 2.8 0l1.9 1.9a2 2 0 0 1 0 2.8L8.5 20.2 3 21l0.8-5.5Z" />
      <path d="m14 5.5 4.5 4.5M9.5 10l2 2M7 12.5l2 2" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
      <path d="M16.5 5.3a3.2 3.2 0 0 1 0 5.4M17.5 14.2A5 5 0 0 1 21 19v1" />
    </>
  ),
  accounts: (
    <>
      <path d="M3 7.5 12 3l9 4.5" />
      <path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7" />
      <path d="M3 20.5h18" />
    </>
  ),

  // ---- Secondary / actions ------------------------------------------------
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  messages: (
    <>
      <path d="M20.5 12.5a7.5 7.5 0 0 1-10.9 6.7L4 20.5l1.3-5.6A7.5 7.5 0 1 1 20.5 12.5Z" />
    </>
  ),
  uploads: (
    <>
      <path d="M20 16.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5" />
      <path d="M12 15.5V3.5M7.5 8 12 3.5 16.5 8" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1Z" />
    </>
  ),
  notifications: (
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5Z" />
      <path d="M13.7 19.5a2 2 0 0 1-3.4 0" />
    </>
  ),
  logout: (
    <>
      <path d="M9.5 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h3.5" />
      <path d="M15.5 16.5 20 12l-4.5-4.5M20 12H9.5" />
    </>
  ),

  // ---- Utility ------------------------------------------------------------
  menu: <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20.5 20.5-4.9-4.9" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" />
      <path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 8.5-8.5Z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1Z" />
      <path d="M6.5 7 7.3 19a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7" />
      <path d="M10.5 11v6M13.5 11v6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.6M6.2 7.9A17.2 17.2 0 0 0 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 3.9-.85" />
      <path d="M10 10a2.8 2.8 0 0 0 4 4M3.5 3.5l17 17" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16" r="0.6" fill="currentColor" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 16v-5" />
      <circle cx="12" cy="8" r="0.6" fill="currentColor" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.2 1.9" />
    </>
  ),
  trendingUp: (
    <>
      <path d="M3 17 9.5 10.5l3.5 3.5L21 6.5" />
      <path d="M15.5 6.5H21V12" />
    </>
  ),
  dollar: (
    <>
      <path d="M12 2.5v19" />
      <path d="M16.5 7.2a3.6 3.6 0 0 0-3.4-2.2h-2a3.1 3.1 0 0 0-.6 6.1l4.2.8a3.1 3.1 0 0 1-.6 6.1h-2.3a3.6 3.6 0 0 1-3.4-2.3" />
    </>
  ),
  chevronDown: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  chevronRight: <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />,
  chevronLeft: <path d="M14.5 6.5 9 12l5.5 5.5" />,
  arrowRight: <path d="M4 12h15.5M13.5 6l6 6-6 6" />,
  filter: <path d="M3.5 5.5h17l-6.8 8v6l-3.4 1.8v-7.8l-6.8-8Z" />,
  download: (
    <>
      <path d="M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
      <path d="M12 3.5v12M7.5 11l4.5 4.5L16.5 11" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.5 20.5v-1a5 5 0 0 1 5-5h5a5 5 0 0 1 5 5v1" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
      <path d="M15 9h3a2 2 0 0 1 2 2v10M3 21h18" />
      <path d="M8 7h3M8 11h3M8 15h3" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6.5h10.5v10H3zM13.5 10H17l3 3v3.5h-6.5" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.2 6.3a4.5 4.5 0 0 1 6 5.9l-9 9a2.4 2.4 0 0 1-3.4-3.4l9-9a4.5 4.5 0 0 1-2.6-2.5Z" />
    </>
  ),
};

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export default function Icon({
  name,
  size = 20,
  strokeWidth = 1.75,
  className = "",
  ...rest
}: IconProps) {
  const glyph = PATHS[name];
  if (!glyph) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {glyph}
    </svg>
  );
}
