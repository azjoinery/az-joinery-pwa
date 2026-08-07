"use client";

import { useState, FormEvent } from "react";
import type { Task } from "@/lib/types/models";
import styles from "./TaskForm.module.css";

interface TaskFormProps {
  task?: Task;
  jobId?: string;
  onSubmit: (data: Omit<Task, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
}

export function TaskForm({ task, jobId, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState(task?.status || "pending");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo || "");
  const [dueDate, setDueDate] = useState(task?.dueDate?.split("T")[0] || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        jobId: jobId || (task?.jobId || ""),
        title,
        description,
        status: status as "pending" | "in_progress" | "completed" | "blocked",
        priority: priority as "low" | "medium" | "high",
        assignedTo,
        dueDate: new Date(dueDate).toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.field}>
        <label htmlFor="title">Task Title *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
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
            <option value="blocked">Blocked</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="priority">Priority *</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="assignedTo">Assigned To *</label>
        <input
          id="assignedTo"
          type="text"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder="Team member name"
          required
        />
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

      <div className={styles.actions}>
        <button type="button" onClick={onCancel} className={styles.cancelBtn}>
          Cancel
        </button>
        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? "Saving..." : task ? "Update Task" : "Create Task"}
        </button>
      </div>
    </form>
  );
}
