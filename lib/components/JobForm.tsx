"use client";

import { useState, FormEvent } from "react";
import type { Job } from "@/lib/types/models";
import styles from "./JobForm.module.css";

interface JobFormProps {
  job?: Job;
  onSubmit: (data: Omit<Job, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
}

export function JobForm({ job, onSubmit, onCancel }: JobFormProps) {
  const [name, setName] = useState(job?.name || "");
  const [client, setClient] = useState(job?.client || "");
  const [status, setStatus] = useState(job?.status || "pending");
  const [priority, setPriority] = useState(job?.priority || "medium");
  const [dueDate, setDueDate] = useState(job?.dueDate?.split("T")[0] || "");
  const [description, setDescription] = useState(job?.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        name,
        client,
        status: status as "pending" | "in_progress" | "completed" | "on_hold",
        priority: priority as "low" | "medium" | "high" | "urgent",
        dueDate: new Date(dueDate).toISOString(),
        description: description || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.field}>
        <label htmlFor="name">Job Name *</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="client">Client Name *</label>
        <input
          id="client"
          type="text"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          required
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="status">Status *</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="priority">Priority *</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="dueDate">Due Date *</label>
        <input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Job details, special instructions, etc."
        />
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={onCancel} className={styles.cancelBtn}>
          Cancel
        </button>
        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? "Saving..." : job ? "Update Job" : "Create Job"}
        </button>
      </div>
    </form>
  );
}
