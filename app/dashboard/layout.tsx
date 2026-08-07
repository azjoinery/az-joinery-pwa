"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, me } = useAuth();

  useEffect(() => {
    me();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-orange-300 border-t-orange-500 rounded-full"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AZ Joinery</h1>
            <p className="text-sm text-gray-600">Welcome, {user.name}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              {user.role.replace("_", " ").toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">{children}</main>

      {/* Footer Navigation - All 6 Phases */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="overflow-x-auto">
          <div className="flex justify-start">
            <NavLink href="/dashboard" label="Dashboard" icon="📊" />
            <NavLink href="/jobs" label="Jobs" icon="📋" />
            <NavLink href="/tasks" label="Tasks" icon="✓" />
            <NavLink href="/inventory" label="Inventory" icon="📦" />
            <NavLink href="/sales" label="Sales" icon="🎯" />
            <NavLink href="/analytics" label="Analytics" icon="📈" />
            <NavLink href="/invoices" label="Invoices" icon="💰" />
            <NavLink href="/design" label="Design" icon="📐" />
            <NavLink href="/auth/login" label="Logout" icon="↪️" />
          </div>
        </div>
      </nav>

      {/* Spacing for bottom nav */}
      <div className="h-20"></div>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      className="flex-shrink-0 py-3 px-4 hover:bg-gray-50 active:bg-orange-50 transition-colors border-b-2 border-transparent hover:border-orange-300 text-center min-w-fit"
    >
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-gray-700 font-medium">{label}</div>
    </a>
  );
}
