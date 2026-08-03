import { create } from "zustand";
import { User } from "../types";
import { api } from "../api/client";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  me: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response: any = await api.post("/auth/login", { email, password });
      if (response.access_token) {
        api.setToken(response.access_token);
        set({ loading: false });
        // Fetch user data
        try {
          const user = await api.get<User>("/users/me");
          set({ user });
        } catch (err) {
          set({ error: "Failed to fetch user data" });
        }
      }
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Login failed" });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    api.clearToken();
    set({ user: null });
  },

  me: async () => {
    set({ loading: true });
    try {
      const user = await api.get<User>("/users/me");
      set({ user, loading: false });
    } catch (err) {
      set({ user: null, loading: false });
    }
  },
}));
