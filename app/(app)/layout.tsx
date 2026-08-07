"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/store/auth";
import { navItemsForRole, isPathAllowedForRole, landingPageForRole } from "@/lib/roles";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, me, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  useEffect(() => {
    me();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Not logged in — bounce to login.
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  // Logged in, but this role isn't allowed on this page (e.g. they typed
  // the URL directly) — send them to their own landing page instead.
  // This is a UX/routing convenience, not the security boundary: the API
  // independently enforces what each role can actually see/do regardless
  // of what page the frontend renders.
  useEffect(() => {
    if (!loading && user && !isPathAllowedForRole(pathname, user.role)) {
      router.replace(landingPageForRole(user.role));
    }
  }, [user, loading, pathname, router]);

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

  if (!isPathAllowedForRole(pathname, user.role)) {
    // Redirect is in flight (see effect above) — render nothing in the meantime.
    return null;
  }

  const navItems = navItemsForRole(user.role);

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

      {/* Footer Navigation — items shown depend on the logged-in user's role */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="overflow-x-auto">
          <div className="flex justify-start">
            {navItems.map((item) => (
              <NavLink key={item.key} href={item.href} label={item.label} icon={item.icon} />
            ))}
            <button
              onClick={handleLogout}
              className="flex-shrink-0 py-3 px-4 hover:bg-gray-50 active:bg-orange-50 transition-colors border-b-2 border-transparent hover:border-orange-300 text-center min-w-fit"
            >
              <div className="text-lg">↪️</div>
              <div className="text-xs text-gray-700 font-medium">Logout</div>
            </button>
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
