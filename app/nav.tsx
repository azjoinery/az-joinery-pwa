"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { clearToken } from "@/lib/api/client";

const tabs = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/tasks", label: "Tasks" },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    clearToken();
    sessionStorage.removeItem("userRole");
    router.push("/auth/login");
  }

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
      <button onClick={handleLogout} className="tab logout">
        Logout
      </button>
    </nav>
  );
}
