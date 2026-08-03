"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"production" | "designer" | "manager">("production");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    setTimeout(() => {
      router.push("/dashboard");
    }, 500);
  };

  const roles = [
    { id: "production", label: "Production", desc: "Factory floor logging" },
    { id: "designer", label: "Designer", desc: "Design workflow" },
    { id: "manager", label: "Manager", desc: "Operations overview" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-white px-4">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">AZ Joinery</h1>
        <p className="text-gray-600">Management & Production System</p>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50"
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50"
              required
            />
          </div>

          {/* Role Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Your Role</label>
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id as any)}
                  disabled={loading}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedRole === role.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 bg-gray-50 hover:border-orange-300"
                  } disabled:opacity-50`}
                >
                  <div className="font-semibold text-gray-900">{role.label}</div>
                  <div className="text-sm text-gray-600">{role.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Demo Hint */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          <strong>Demo:</strong> Use test credentials to explore.
        </div>
      </div>
    </div>
  );
}
