"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";

const JOB_TYPES = ["Kitchen", "Wardrobe", "Bathroom", "Laundry", "BBQ Kitchen", "Vanity", "TV Unit", "Other"];
const PRIORITIES = ["Normal", "High", "Low"];

interface NewJobForm {
  jobNum: string;
  title: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  siteAddress: string;
  jobType: string;
  priority: string;
  estimatedValue: string;
  notes: string;
  installationDate: string;
}

const EMPTY: NewJobForm = {
  jobNum: "",
  title: "",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  siteAddress: "",
  jobType: "Kitchen",
  priority: "Normal",
  estimatedValue: "",
  notes: "",
  installationDate: "",
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

function moneyToNumber(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function apiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((item) => item?.msg || item?.message).filter(Boolean).join(", ");
    if (error.response?.status) return `Save failed (${error.response.status}). Please check required fields.`;
  }
  return "Failed to save. Please try again.";
}

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

    const title = form.title.trim();
    const client = form.clientName.trim();
    if (!title) {
      setError("Job title is required");
      return;
    }
    if (!client) {
      setError("Client name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        jobNum: form.jobNum.trim(),
        client,
        phone: form.clientPhone.trim(),
        clientEmail: form.clientEmail.trim(),
        projectName: title,
        title,
        jobType: form.jobType,
        priority: form.priority,
        estimatedValue: moneyToNumber(form.estimatedValue),
        siteAddress: form.siteAddress.trim(),
        installationDate: form.installationDate,
        status: "Received",
        currentStatus: "Not Started",
        currentDept: "Design",
        designStage: "Job Assigned",
        designProgress: 5,
        releaseStatus: "In Design",
        notes: form.notes.trim(),
        createdBy: user.id,
        createdByName: user.name,
      };

      const result = await api.post<{ id: string }>("/jobs", payload);
      router.push(result?.id ? `/jobs?new=${result.id}` : "/jobs");
    } catch (err) {
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
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
          Back
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px" }}>New Job</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {error && (
          <div
            style={{
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#b91c1c",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Job Details</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
            <Field label="Job Number">
              <input
                style={inputStyle}
                value={form.jobNum}
                onChange={(e) => set("jobNum", e.target.value)}
                placeholder="e.g. 2401"
              />
            </Field>
            <Field label="Job Title *">
              <input style={inputStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Smith Kitchen" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Job Type">
              <select style={inputStyle} value={form.jobType} onChange={(e) => set("jobType", e.target.value)}>
                {JOB_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select style={inputStyle} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Estimated Value">
              <input style={inputStyle} inputMode="decimal" value={form.estimatedValue} onChange={(e) => set("estimatedValue", e.target.value)} placeholder="$0.00" />
            </Field>
            <Field label="Install Date">
              <input style={inputStyle} type="date" value={form.installationDate} onChange={(e) => set("installationDate", e.target.value)} />
            </Field>
          </div>
        </div>

        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Client Details</p>
          <Field label="Client Name *">
            <input style={inputStyle} value={form.clientName} onChange={(e) => set("clientName", e.target.value)} placeholder="Full name" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Phone">
              <input style={inputStyle} type="tel" value={form.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} placeholder="04XX XXX XXX" />
            </Field>
            <Field label="Email">
              <input style={inputStyle} type="email" value={form.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} placeholder="client@email.com" />
            </Field>
          </div>
          <Field label="Site Address">
            <input style={inputStyle} value={form.siteAddress} onChange={(e) => set("siteAddress", e.target.value)} placeholder="Street address, suburb" />
          </Field>
        </div>

        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>Notes</p>
          <textarea
            style={{ ...inputStyle, resize: "vertical" }}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={4}
            placeholder="Scope, special requirements, client preferences"
          />
        </div>

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
            {saving ? "Saving..." : "Create Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
