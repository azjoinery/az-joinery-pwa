"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useJobs } from "@/lib/hooks/useJobs";
import { Modal } from "./Modal";
import { JobForm } from "./JobForm";
import type { Job } from "@/lib/types/models";
import styles from "./JobsList.module.css";

interface JobsListProps {
  showDetails?: boolean;
}

export function JobsList({ showDetails = true }: JobsListProps) {
  const router = useRouter();
  const { jobs, loading, error, createJob, updateJob } = useJobs();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  async function handleCreateJob(data: Omit<Job, "id" | "createdAt" | "updatedAt">) {
    await createJob(data);
    setIsCreateModalOpen(false);
  }

  async function handleUpdateJob(data: Omit<Job, "id" | "createdAt" | "updatedAt">) {
    if (editingJob) {
      await updateJob(editingJob.id, data);
      setEditingJob(null);
    }
  }

  if (loading) return <div className={styles.loading}>Loading jobs...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Jobs</h3>
        <button className={styles.addButton} onClick={() => setIsCreateModalOpen(true)}>
          + New Job
        </button>
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
                <td className={styles.jobName}>
                  {showDetails ? (
                    <button
                      className={styles.jobLink}
                      onClick={() => router.push(`/dashboards/manager/jobs/${job.id}`)}
                    >
                      {job.name}
                    </button>
                  ) : (
                    job.name
                  )}
                </td>
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
                  <button className={styles.actionBtn} onClick={() => setEditingJob(job)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        title="Create New Job"
        onClose={() => setIsCreateModalOpen(false)}
        size="medium"
      >
        <JobForm onSubmit={handleCreateJob} onCancel={() => setIsCreateModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={editingJob !== null}
        title="Edit Job"
        onClose={() => setEditingJob(null)}
        size="medium"
      >
        {editingJob && (
          <JobForm
            job={editingJob}
            onSubmit={handleUpdateJob}
            onCancel={() => setEditingJob(null)}
          />
        )}
      </Modal>
    </div>
  );
}
