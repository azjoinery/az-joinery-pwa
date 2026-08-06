"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api/client";
import type { Job, JobsResponse } from "@/lib/types/models";

export function useJobs(page = 1, limit = 20) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<JobsResponse>(`/jobs?page=${page}&limit=${limit}`);
      setJobs(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const createJob = useCallback(
    async (jobData: Omit<Job, "id" | "createdAt" | "updatedAt">) => {
      try {
        const response = await apiFetch<Job>("/jobs", {
          method: "POST",
          body: JSON.stringify(jobData),
        });
        setJobs((prev) => [response, ...prev]);
        return response;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to create job");
      }
    },
    []
  );

  const updateJob = useCallback(
    async (id: string, jobData: Partial<Job>) => {
      try {
        const response = await apiFetch<Job>(`/jobs/${id}`, {
          method: "PATCH",
          body: JSON.stringify(jobData),
        });
        setJobs((prev) => prev.map((job) => (job.id === id ? response : job)));
        return response;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to update job");
      }
    },
    []
  );

  const deleteJob = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/jobs/${id}`, { method: "DELETE" });
        setJobs((prev) => prev.filter((job) => job.id !== id));
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to delete job");
      }
    },
    []
  );

  return {
    jobs,
    loading,
    error,
    total,
    refetch: fetchJobs,
    createJob,
    updateJob,
    deleteJob,
  };
}
