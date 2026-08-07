import { create } from "zustand";
import { User } from "../types";
import { api } from "../api/client";

interface AuthState {
  user: User | null;
  loading: boolean;
  // Has the initial session check (me()) completed at least once? Distinct
  // from `loading` (which reflects a specific in-flight action, e.g. the
  // login button's "Logging in..." state). Route guards must wait for this
  // to be true before deciding "no user -> redirect to login" — otherwise
  // every fresh page load briefly reads user=null and incorrectly kicks
  // the user out before their session has had a chance to reload.
  initialized: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  me: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
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
          const user = await api.get<User>("/auth/me");
          set({ user, initialized: true });
          return user;
        } catch (err) {
          set({ error: "Failed to fetch user data" });
          return null;
        }
      }
      return null;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Login failed" });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    api.clearToken();
    set({ user: null, initialized: true });
  },

  me: async () => {
    set({ loading: true });
    try {
      const user = await api.get<User>("/auth/me");
      set({ user, loading: false, initialized: true });
    } catch (err) {
      set({ user: null, loading: false, initialized: true });
    }
  },
}));
