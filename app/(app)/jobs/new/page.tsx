"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";

const JOB_TYPES = ["Kitchen", "Wardrobe", "Bathroom", "Laundry", "BBQ Kitchen", "Vanity", "TV Unit", "Other"];
const PRIORITIES = ["Standard", "High", "Urgent"];

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-500, #6b7280)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 11px",
  borderRadius: 8,
  border: "1px solid var(--border, #e5e7eb)",
  background: "var(--surface2, #f9fafb)",
  color: "inherit",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const sectionStyle: React.CSSProperties = {
  background: "var(--surface, #ffffff)",
  border: "1px solid var(--border, #e5e7eb)",
  borderRadius: 12,
  padding: "18px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "var(--ink-500, #6b7280)",
  marginBottom: 2,
};

export default function NewJobPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<NewJobForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  function set(field: keyof NewJobForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim()) { setError("Job title is required"); return; }
    if (!form.client_name.trim()) { setError("Client name is required"); return; }

    const createdBy = user.id;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        estimated_value: form.estimated_value
          ? parseFloat(form.estimated_value.replace(/[$,]/g, ""))
          : null,
        status: "Quote",
        created_by: createdBy,
      };
      const result = await api.post<{ id: string }>("/jobs", payload);
      router.push(result?.id ? `/jobs?new=${result.id}` : "/jobs");
    } catch {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 8,
            padding: "7px 14px",
            cursor: "pointer",
            fontSize: 13,
            color: "inherit",
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px" }}>New Job</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Job Details</p>
          <Field label="Job Title *">
            <input style={inputStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Smith Kitchen Renovation" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Job Type">
              <select style={inputStyle} value={form.job_type} onChange={(e) => set("job_type", e.target.value)}>
                {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select style={inputStyle} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Estimated Value">
              <input style={inputStyle} value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} placeholder="$0.00" />
            </Field>
            <Field label="Install Date">
              <input style={inputStyle} type="date" value={form.install_date} onChange={(e) => set("install_date", e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Client Details */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Client Details</p>
          <Field label="Client Name *">
            <input style={inputStyle} value={form.client_name} onChange={(e) => set("client_name", e.target.value)} placeholder="Full name" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Phone">
              <input style={inputStyle} type="tel" value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} placeholder="04XX XXX XXX" />
            </Field>
            <Field label="Email">
              <input style={inputStyle} type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} placeholder="client@email.com" />
            </Field>
          </div>
          <Field label="Site Address">
            <input style={inputStyle} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address, suburb" />
          </Field>
        </div>

        {/* Notes */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Notes</p>
          <textarea
            style={{ ...inputStyle, resize: "vertical" }}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={4}
            placeholder="Scope, special requirements, client preferences…"
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingBottom: 32 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "1px solid var(--border, #e5e7eb)",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
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
              padding: "9px 24px",
              borderRadius: 8,
              border: "none",
              background: saving ? "#9ca3af" : "#2d5a27",
              color: "#ffffff",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {saving ? "Saving…" : "Create Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
