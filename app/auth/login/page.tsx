"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setToken } from "@/lib/api/client";

interface LoginResponse {
  access_token?: string;
  token?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const result = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email, password: password }),
      });
      const token = result.access_token || result.token;
      if (!token) {
        throw new Error("No token returned by the API.");
      }
      setToken(token);
      router.push("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1>Sign in</h1>
      <p className="muted">Use your AZ Joinery account to continue.</p>

      {error ? <div className="notice">{error}</div> : null}

      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={function (event) {
            setEmail(event.target.value);
          }}
          required
        />
        <p />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={function (event) {
            setPassword(event.target.value);
          }}
          required
        />
        <p />
        <button type="submit" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
