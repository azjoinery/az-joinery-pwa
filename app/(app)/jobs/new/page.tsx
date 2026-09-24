"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { api } from "@/lib/api";

const JOB_TYPES = ["Kitchen", "Wardrobe", "Bathroom", "Laundry", "BBQ Kitchen", "Vanity", "TV Unit", "Other"];
const PRIORITY = ["Standard", "High", "Urgent"];

interface NewJobForm {
  title: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  address: string;
  job_type: string;
  priority: string;
  estimated_value: string;
  notes: string;
  install_date: string;
}

const EMPTY: NewJobForm = {
  title: "",
  client_name: "",
  client_phone: "",
  client_email: "",
  address: "",
  job_type: "Kitchen",
  priority: "Standard",
  estimated_value: "",
  notes: "",
  install_date: "",
};

export default function NewJobPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<NewJobForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  function set(field: keyof NewJobForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_name.trim()) { setError("Client name is required"); return; }
    if (!form.title.trim()) { setError("Job title is required"); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value.replace(/[$,]/g, "")) : null,
        status: "Quote",
        created_by: user.id,
      };
      const result = await api.post<{ id: string }>("/jobs", payload);
      if (result?.id) {
        router.push(`/jobs?new=${result.id}`);
      } else {
        router.push("/jobs");
      }
    } catch (err) {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "1px solid var(--border, #e2ded8)",
            borderRadius: 8,
            padding: "7px 12px",
            cursor: "pointer",
            fontSize: 13,
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>New Job</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Error */}
        {error && (
          <div style={{
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: 8,
            padding: "10px 14px",
            color: "#b91c1c",
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Job Details */}
        <section style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #e2ded8)", borderRadius: 10, padding: "18px 20px" }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text2, #6b6560)", marginBottom: 14 }}>
            Job Details
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Job Title *">
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Smith Kitchen Renovation"
                required
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Job Type">
                <select
                  className="form-input"
                  value={form.job_type}
                  onChange={(e) => set("job_type", e.target.value)}
                >
                  {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  className="form-input"
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value)}
                >
                  {PRIORITY.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Estimated Value">
                <input
                  className="form-input"
                  value={form.estimated_value}
                  onChange={(e) => set("estimated_value", e.target.value)}
                  placeholder="$0.00"
                />
              </Field>
              <Field label="Install Date">
                <input
                  className="form-input"
                  type="date"
                  value={form.install_date}
                  onChange={(e) => set("install_date", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Client Details */}
        <section style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #e2ded8)", borderRadius: 10, padding: "18px 20px" }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text2, #6b6560)", marginBottom: 14 }}>
            Client Details
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Client Name *">
              <input
                className="form-input"
                value={form.client_name}
                onChange={(e) => set("client_name", e.target.value)}
                placeholder="Full name"
                required
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Phone">
                <input
                  className="form-input"
                  type="tel"
                  value={form.client_phone}
                  onChange={(e) => set("client_phone", e.target.value)}
                  placeholder="04XX XXX XXX"
                />
              </Field>
              <Field label="Email">
                <input
                  className="form-input"
                  type="email"
                  value={form.client_email}
                  onChange={(e) => set("client_email", e.target.value)}
                  placeholder="client@email.com"
                />
              </Field>
            </div>
            <Field label="Site Address">
              <input
                className="form-input"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street address, suburb"
              />
            </Field>
          </div>
        </section>

        {/* Notes */}
        <section style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #e2ded8)", borderRadius: 10, padding: "18px 20px" }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text2, #6b6560)", marginBottom: 14 }}>
            Notes
          </h2>
          <textarea
            className="form-input"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={4}
            placeholder="Scope, special requirements, client preferences…"
            style={{ width: "100%", resize: "vertical" }}
          />
        </section>

        {/* Submit */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingBottom: 24 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "1px solid var(--border, #e2ded8)",
              background: "none",
              cursor: "pointer",
              fontSize: 13.5,
              fontWeight: 600,
              color: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "9px 22px",
              borderRadius: 8,
              border: "none",
              background: saving ? "#aaa" : "#2d5a27",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 13.5,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {saving ? "Saving…" : "Create Job"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text2, #6b6560)", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
