import axios, { AxiosInstance, AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Load token from localStorage (client-side only)
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
      if (this.token) {
        this.setAuthHeader(this.token);
      }
    }

    // Add response interceptor to handle 401 (token expired)
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const isLoginRequest = error.config?.url?.includes("/auth/login");
        // Only treat 401 as "session expired" if it wasn't the login attempt itself.
        // Otherwise a wrong password would force-redirect before the error can be shown.
        if (error.response?.status === 401 && !isLoginRequest) {
          localStorage.removeItem("token");
          window.location.href = "/auth/login";
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("token", token);
    this.setAuthHeader(token);
  }

  private setAuthHeader(token: string) {
    this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("token");
    delete this.client.defaults.headers.common["Authorization"];
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async get<T>(url: string): Promise<T> {
    const response = await this.client.get<T>(url);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}

export const api = new ApiClient();
