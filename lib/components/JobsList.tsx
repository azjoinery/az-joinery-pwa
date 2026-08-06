"use client";

import { useJobs } from "@/lib/hooks/useJobs";
import type { Job } from "@/lib/types/models";
import styles from "./JobsList.module.css";

export function JobsList() {
  const { jobs, loading, error } = useJobs();

  if (loading) return <div className={styles.loading}>Loading jobs...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Jobs</h3>
        <button className={styles.addButton}>+ New Job</button>
      </div>

      {jobs.length === 0 ? (
        <p className={styles.empty}>No jobs found. Create one to get started.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Job Name</th>
              <th>Client</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className={styles.row}>
                <td className={styles.jobName}>{job.name}</td>
                <td>{job.client}</td>
                <td>
                  <span className={`${styles.badge} ${styles[`status-${job.status}`]}`}>
                    {job.status}
                  </span>
                </td>
                <td>
                  <span className={`${styles.badge} ${styles[`priority-${job.priority}`]}`}>
                    {job.priority}
                  </span>
                </td>
                <td>{new Date(job.dueDate).toLocaleDateString()}</td>
                <td className={styles.actions}>
                  <button className={styles.actionBtn}>View</button>
                  <button className={styles.actionBtn}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
