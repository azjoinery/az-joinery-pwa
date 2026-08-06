"use client";

import { useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api/client";
import type { ProductionLog } from "@/lib/types/models";
import styles from "./ProductionLogForm.module.css";

interface ProductionLogFormProps {
  cabinetMakerId: string;
  onSuccess?: (log: ProductionLog) => void;
}

export function ProductionLogForm({ cabinetMakerId, onSuccess }: ProductionLogFormProps) {
  const [cabinetsCompleted, setCabinetsCompleted] = useState(0);
  const [cncBoardsCompleted, setCncBoardsCompleted] = useState(0);
  const [hoursWorked, setHoursWorked] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await apiFetch<ProductionLog>("/production-logs", {
        method: "POST",
        body: JSON.stringify({
          date: today,
          cabinetMakerId,
          cabinetsCompleted,
          cncBoardsCompleted,
          hoursWorked,
          notes: notes || undefined,
        }),
      });

      setSuccess(true);
      setCabinetsCompleted(0);
      setCncBoardsCompleted(0);
      setHoursWorked(0);
      setNotes("");

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit production log");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3>Daily Production Log</h3>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>Production log submitted successfully!</div>}

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="cabinets">Cabinets Completed</label>
          <input
            id="cabinets"
            type="number"
            min="0"
            value={cabinetsCompleted}
            onChange={(e) => setCabinetsCompleted(parseInt(e.target.value) || 0)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="cnc">CNC Boards Completed</label>
          <input
            id="cnc"
            type="number"
            min="0"
            value={cncBoardsCompleted}
            onChange={(e) => setCncBoardsCompleted(parseInt(e.target.value) || 0)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="hours">Hours Worked</label>
          <input
            id="hours"
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={hoursWorked}
            onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
            required
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="notes">Notes (Optional)</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any issues, delays, or notes about today's work..."
          rows={4}
        />
      </div>

      <button type="submit" disabled={loading} className={styles.submitBtn}>
        {loading ? "Submitting..." : "Submit Production Log"}
      </button>
    </form>
  );
}
