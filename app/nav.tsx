"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/tasks", label: "Tasks" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="app-footer">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={pathname === tab.href ? "tab active" : "tab"}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
