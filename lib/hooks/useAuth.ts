import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api/client";

export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const roleFromSession = sessionStorage.getItem("userRole");

    if (!token) {
      setUser(null);
      setLoading(false);
      router.push("/auth/login");
      return;
    }

    try {
      // Decode JWT to get user info (basic decoding, no verification needed client-side)
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid token format");
      }

      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
      );

      const userData: User = {
        id: payload.sub || payload.user_id || "",
        email: payload.email || "",
        role: roleFromSession || payload.role || "user",
        name: payload.name || payload.email?.split("@")[0],
      };

      setUser(userData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse token");
      setUser(null);
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  return { user, loading, error, isAuthenticated: !!user };
}
