"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api/client";
import type { Task, TasksResponse } from "@/lib/types/models";

export function useTasks(jobId?: string, page = 1, limit = 20) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = jobId ? `/tasks?jobId=${jobId}&page=${page}&limit=${limit}` : `/tasks?page=${page}&limit=${limit}`;
      const response = await apiFetch<TasksResponse>(url);
      setTasks(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [jobId, page, limit]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(
    async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
      try {
        const response = await apiFetch<Task>("/tasks", {
          method: "POST",
          body: JSON.stringify(taskData),
        });
        setTasks((prev) => [response, ...prev]);
        return response;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to create task");
      }
    },
    []
  );

  const updateTask = useCallback(
    async (id: string, taskData: Partial<Task>) => {
      try {
        const response = await apiFetch<Task>(`/tasks/${id}`, {
          method: "PATCH",
          body: JSON.stringify(taskData),
        });
        setTasks((prev) => prev.map((task) => (task.id === id ? response : task)));
        return response;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to update task");
      }
    },
    []
  );

  const deleteTask = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/tasks/${id}`, { method: "DELETE" });
        setTasks((prev) => prev.filter((task) => task.id !== id));
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to delete task");
      }
    },
    []
  );

  return {
    tasks,
    loading,
    error,
    total,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
}
