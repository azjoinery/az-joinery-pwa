"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";

interface Task {
  id: string;
  title: string;
  description?: string;
  status?: "open" | "in_progress" | "done" | "blocked";
  priority?: "low" | "normal" | "high" | "urgent";
  dueDate?: string;
  jobId?: string;
  jobNum?: string;
  jobName?: string;
}

function taskStatusMeta(status?: string): { label: string; className: string } {
  switch (status) {
    case "in_progress":
      return { label: "In progress", className: "bg-blue-100 text-blue-700" };
    case "done":
      return { label: "Done", className: "bg-green-100 text-green-700" };
    case "blocked":
      return { label: "Blocked", className: "bg-red-100 text-red-700" };
    default:
      return { label: "Open", className: "bg-ink-100 text-ink-600" };
  }
}

function taskPriorityMeta(priority?: string): { label: string; className: string } | null {
  switch (priority) {
    case "urgent":
      return { label: "Urgent", className: "bg-red-100 text-red-700" };
    case "high":
      return { label: "High", className: "bg-orange-100 text-brand-orange-dark" };
    default:
      return null;
  }
}

type FilterKey = "all" | "open" | "in_progress" | "done";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let alive = true;
    api
      .get<Task[]>("/tasks/mine")
      .then((data) => {
        if (alive) {
          setTasks(data || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const openCount = tasks.filter(
    (t) => !t.status || t.status === "open"
  ).length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;

  return (
    <div className="page pb-28">
      {/* Header */}
      <div className="mb-6 rounded-card bg-ink-950 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-orange">
          Design &amp; Drafting
        </p>
        <div className="mt-2.5 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-white">
              My tasks
            </h1>
            <p className="mt-0.5 text-xs text-white/50">
              {openCount} open · {inProgressCount} in progress
            </p>
          </div>
          {!loading && (
            <span className="font-heading text-3xl font-bold tabular tracking-tight text-brand-orange">
              {tasks.length}
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.key
                ? "bg-ink-900 text-white"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-card bg-ink-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-ink-200 p-8 text-center text-sm text-ink-400">
          {filter === "all"
            ? "No tasks assigned yet."
            : `No ${filter.replace("_", " ")} tasks.`}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task) => {
            const statusMeta = taskStatusMeta(task.status);
            const priorityMeta = taskPriorityMeta(task.priority);
            const isDone = task.status === "done";

            return (
              <div
                key={task.id}
                className={`card-pad rounded-card border border-ink-200 bg-white ${
                  isDone ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-ink-900">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {task.description}
                      </p>
                    )}
                    {task.jobNum && (
                      <p className="mt-0.5 text-xs text-ink-400">
                        Job #{task.jobNum}
                        {task.jobName ? ` · ${task.jobName}` : ""}
                      </p>
                    )}
                  </div>
                  {task.dueDate && (
                    <span className="shrink-0 text-[11px] font-medium text-ink-400">
                      {new Date(task.dueDate).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                  {priorityMeta && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${priorityMeta.className}`}
                    >
                      {priorityMeta.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
