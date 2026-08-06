"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { apiFetch } from "@/lib/api/client";
import { Shell } from "@/lib/components/Shell";
import { AuthLayout } from "@/lib/components/AuthLayout";
import { TasksList } from "@/lib/components/TasksList";
import { ROLE_CONFIG, ROLES } from "@/lib/config/roles";
import type { Job } from "@/lib/types/models";
import styles from "./page.module.css";

export default function JobDetailsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function fetchJob() {
      try {
        const data = await apiFetch<Job>(`/jobs/${jobId}`);
        setJob(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load job");
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, [jobId]);

  async function updateJobStatus(newStatus: Job["status"]) {
    if (!job) return;
    setUpdatingStatus(true);
    try {
      const updated = await apiFetch<Job>(`/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setJob(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update job");
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (!user || user.role !== ROLES.MANAGER) {
    return null;
  }

  if (loading) {
    return <div className={styles.loading}>Loading job details...</div>;
  }

  if (error || !job) {
    return (
      <div className={styles.error}>
        <p>{error || "Job not found"}</p>
        <button onClick={() => router.back()}>Go Back</button>
      </div>
    );
  }

  const config = ROLE_CONFIG[ROLES.MANAGER];

  return (
    <AuthLayout>
      <Shell
        title={job.name}
        subtitle="Job Details"
        tabs={[{ key: "details", label: "Details" }]}
        activeTab="details"
        onTabChange={() => {}}
        onLogout={() => {}}
      >
        <section>
          <button className={styles.backBtn} onClick={() => router.back()}>
            ← Back to Jobs
          </button>

          <div className={styles.header}>
            <div>
              <h1>{job.name}</h1>
              <p className="muted">{job.client}</p>
            </div>
            <div className={styles.status}>
              <span className={`${styles.badge} ${styles[`status-${job.status}`]}`}>
                {job.status}
              </span>
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.column}>
              <div className="card">
                <h2>Job Information</h2>
                <dl className={styles.details}>
                  <dt>Client</dt>
                  <dd>{job.client}</dd>

                  <dt>Priority</dt>
                  <dd>{job.priority}</dd>

                  <dt>Due Date</dt>
                  <dd>{new Date(job.dueDate).toLocaleDateString()}</dd>

                  <dt>Status</dt>
                  <dd>{job.status}</dd>

                  {job.description && (
                    <>
                      <dt>Description</dt>
                      <dd>{job.description}</dd>
                    </>
                  )}
                </dl>

                <div className={styles.actions}>
                  <h3>Update Status</h3>
                  <div className={styles.buttonGroup}>
                    <button
                      disabled={updatingStatus || job.status === "pending"}
                      onClick={() => updateJobStatus("pending")}
                      className={styles.actionBtn}
                    >
                      Pending
                    </button>
                    <button
                      disabled={updatingStatus || job.status === "in_progress"}
                      onClick={() => updateJobStatus("in_progress")}
                      className={styles.actionBtn}
                    >
                      In Progress
                    </button>
                    <button
                      disabled={updatingStatus || job.status === "completed"}
                      onClick={() => updateJobStatus("completed")}
                      className={styles.actionBtn}
                    >
                      Completed
                    </button>
                    <button
                      disabled={updatingStatus || job.status === "on_hold"}
                      onClick={() => updateJobStatus("on_hold")}
                      className={styles.actionBtn}
                    >
                      On Hold
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.column}>
              <TasksList jobId={jobId} />
            </div>
          </div>
        </section>
      </Shell>
    </AuthLayout>
  );
}
