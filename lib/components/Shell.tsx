"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/api/client";
import styles from "./Shell.module.css";

export interface ShellProps {
  title: string;
  subtitle?: string;
  tabs: Array<{ key: string; label: string; icon?: string }>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function Shell({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  onLogout,
  children,
}: ShellProps) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    sessionStorage.removeItem("userRole");
    onLogout();
    router.push("/auth/login");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Sign out
        </button>
      </header>

      <main className={styles.main}>{children}</main>

      <nav className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.active : ""}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
