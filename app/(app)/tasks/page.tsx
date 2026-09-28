"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";

interface Task {
  id: string;
  title: string;
  description?: string;
  status?: "open" | "in_progress" | "done" | "blocked" | "Overdue";
  priority?: "low" | "normal" | "high" | "urgent";
  dueDate?: string;
  jobId?: string;
  jobNum?: string;
  jobName?: string;
  _taskType?: "task" | "design";
}

function taskStatusMeta(status?: string): { label: string; className: string } {
  switch (status) {
    case "in_progress":
      return { label: "In progress", className: "bg-blue-100 text-blue-700" };
    case "done":
      return { label: "Done", className: "bg-green-100 text-green-700" };
    case "blocked":
      return { label: "Blocked", className: "bg-red-100 text-red-700" };
    case "Overdue":
      return { label: "Overdue", className: "bg-orange-100 text-orange-700" };
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

const isOpen = (t: Task) => !t.status || t.status === "open" || t.status === "Overdue";

const CAN_CREATE_TASK = new Set(["managing_director", "manager", "department_manager", "admin", "supervisor", "drafter", "designer"]);

interface NewTaskForm { title: string; description: string; priority: "low" | "normal" | "high" | "urgent"; dueDate: string; }

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewTaskForm>({ title: "", description: "", priority: "normal", dueDate: "" });
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<Task[]>("/tasks/mine")
      .then((data) => {
        if (alive) { setTasks(data || []); setLoading(false); }
      })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user?.id]);

  const handleCreate = async () => {
    if (!form.title.trim()) { titleRef.current?.focus(); return; }
    setSaving(true);
    try {
      const created = await api.post<Task>("/tasks", {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        assigneeId: user?.id,
      });
      if (created) setTasks(prev => [created, ...prev]);
      setCreateOpen(false);
      setForm({ title: "", description: "", priority: "normal", dueDate: "" });
    } catch { /* show nothing — API might 403 for roles without access */ }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (task: Task, newStatus: Task["status"]) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try { await api.patch(`/tasks/${task.id}`, { status: newStatus }); }
    catch { setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t)); }
  };

  const filtered = filter === "all" ? tasks : filter === "open"
    ? tasks.filter(isOpen)
    : tasks.filter((t) => t.status === filter);

  const openCount = tasks.filter(isOpen).length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const canCreate = !!user && CAN_CREATE_TASK.has(user.role);

  return (
    <div className="page pb-28">
      {/* Header */}
      <div className="mb-6 rounded-card bg-ink-950 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-orange">
          Tasks
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
          <div className="flex items-center gap-3">
            {!loading && (
              <span className="font-heading text-3xl font-bold tabular tracking-tight text-brand-orange">
                {tasks.length}
              </span>
            )}
            {canCreate && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="rounded-xl bg-brand-orange px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-orange-dark"
              >
                + New task
              </button>
            )}
          </div>
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
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
                  {task._taskType === "design" && (
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                      Design
                    </span>
                  )}
                  {task._taskType !== "design" && !isDone && (
                    <select
                      className="ml-auto rounded-lg border border-ink-200 bg-white px-2 py-1 text-[11px] font-medium text-ink-600"
                      value={task.status || "open"}
                      onChange={(e) => handleStatusChange(task, e.target.value as Task["status"])}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" onClick={() => setCreateOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
              <h3 className="font-semibold text-ink-900">New task</h3>
              <button type="button" onClick={() => setCreateOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100">
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-600">Title *</label>
                <input
                  ref={titleRef}
                  type="text"
                  className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
                  placeholder="What needs to be done?"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-600">Description</label>
                <textarea
                  className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
                  rows={2}
                  placeholder="Optional details…"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-600">Priority</label>
                  <select
                    className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm"
                    value={form.priority}
                    onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as NewTaskForm["priority"] }))}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-600">Due date</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm"
                    value={form.dueDate}
                    onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <button
                type="button"
                className="w-full rounded-xl bg-brand-orange py-3 text-sm font-semibold text-white disabled:opacity-40 hover:bg-brand-orange-dark"
                disabled={!form.title.trim() || saving}
                onClick={handleCreate}
              >
                {saving ? "Creating…" : "Create task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
