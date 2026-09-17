"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";
import { Task, Job, User } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════════════════
   AZ JOINERY — TASKS MODULE
   General to-do list for office and workshop staff.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Status & priority mapping ──────────────────────────────────────────
   The UI shows user-friendly labels while the API uses backend values.
   Frontend  →  Backend
   To Do     →  "Not Started"
   In Prog   →  "In Progress"
   Done      →  "Completed"
   Blocked   →  "Waiting for..."
   Overdue   →  "Overdue" (computed server-side)
   ─────────────────────────────────────────────────────────────────────── */

type FrontendStatus = "To Do" | "In Progress" | "Done" | "Blocked" | "Overdue";

const STATUS_TO_BACKEND: Record<string, string> = {
  "To Do": "Not Started",
  "In Progress": "In Progress",
  "Done": "Completed",
  "Blocked": "Waiting for...",
};

const STATUS_FROM_BACKEND: Record<string, FrontendStatus> = {
  "Not Started": "To Do",
  "In Progress": "In Progress",
  "Completed": "Done",
  "Waiting for...": "Blocked",
  "Overdue": "Overdue",
};

function toFrontendStatus(backendStatus: string): FrontendStatus {
  return STATUS_FROM_BACKEND[backendStatus] || "To Do";
}

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "To Do", label: "To Do" },
  { key: "In Progress", label: "In Progress" },
  { key: "Done", label: "Done" },
  { key: "Blocked", label: "Blocked" },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  "To Do":        { bg: "bg-gray-100",    text: "text-gray-600",   dot: "bg-gray-400" },
  "In Progress":  { bg: "bg-blue-50",     text: "text-blue-700",   dot: "bg-blue-500" },
  "Done":         { bg: "bg-green-50",    text: "text-green-700",  dot: "bg-green-500" },
  "Blocked":      { bg: "bg-red-50",      text: "text-red-700",    dot: "bg-red-500" },
  "Overdue":      { bg: "bg-red-50",      text: "text-red-700",    dot: "bg-red-500" },
};

const PRIORITY_STYLE: Record<string, { bg: string; text: string; dot: string; order: number }> = {
  High:   { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", order: 0 },
  Medium: { bg: "bg-gray-100",  text: "text-gray-600",   dot: "bg-gray-400",   order: 1 },
  Low:    { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500",   order: 2 },
};

/** Roles that can see Team Tasks tab and reassign directly. */
const MANAGER_ROLES = [
  "managing_director", "manager", "department_manager", "admin", "supervisor",
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d + (d.includes("T") ? "" : "T00:00:00"));
  return dt.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function isToday(d: string) {
  const dt = new Date(d + (d.includes("T") ? "" : "T00:00:00"));
  const now = new Date();
  return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
}

function isTomorrow(d: string) {
  const dt = new Date(d + (d.includes("T") ? "" : "T00:00:00"));
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  return dt.getFullYear() === tom.getFullYear() && dt.getMonth() === tom.getMonth() && dt.getDate() === tom.getDate();
}

function isPast(d: string) {
  const dt = new Date(d + (d.includes("T") ? "" : "T00:00:00"));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return dt < now;
}

/** Group tasks by date section: Overdue, Today, Tomorrow, Upcoming, No Date */
function groupByDate(tasks: Task[]): { label: string; tasks: Task[] }[] {
  const overdue: Task[] = [];
  const today: Task[] = [];
  const tomorrow: Task[] = [];
  const upcoming: Task[] = [];
  const noDate: Task[] = [];

  for (const t of tasks) {
    const fe = toFrontendStatus(t.status);
    if (fe === "Done") {
      // Done tasks go to their own section
      upcoming.push(t);
      continue;
    }
    if (!t.dueDate) {
      noDate.push(t);
    } else if (fe === "Overdue" || (isPast(t.dueDate) && fe !== "Done")) {
      overdue.push(t);
    } else if (isToday(t.dueDate)) {
      today.push(t);
    } else if (isTomorrow(t.dueDate)) {
      tomorrow.push(t);
    } else {
      upcoming.push(t);
    }
  }

  const groups: { label: string; tasks: Task[] }[] = [];
  if (overdue.length) groups.push({ label: "Overdue", tasks: overdue });
  if (today.length) groups.push({ label: "Today", tasks: today });
  if (tomorrow.length) groups.push({ label: "Tomorrow", tasks: tomorrow });
  if (upcoming.length) groups.push({ label: "Upcoming", tasks: upcoming });
  if (noDate.length) groups.push({ label: "No date", tasks: noDate });
  return groups;
}

/** Sort tasks: priority high→low, then by due date ascending. */
function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_STYLE[a.priority || "Medium"]?.order ?? 1;
    const pb = PRIORITY_STYLE[b.priority || "Medium"]?.order ?? 1;
    if (pa !== pb) return pa - pb;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

/* ─── SVG Icons (inline, no dependency) ──────────────────────────────────── */

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 6L5 8.5L9.5 3.5" />
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10 4v12M4 10h12" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 4L6 8l4 4" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" />
    <path d="M4.5 1v2.5M9.5 1v2.5M1.5 5.5h11" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="7" r="5" />
    <path d="M11 11l3.5 3.5" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 011-1h3a1 1 0 011 1v1.5M6.5 7v4M9.5 7v4" />
    <path d="M3.5 4.5l.5 8.5a1 1 0 001 1h6a1 1 0 001-1l.5-8.5" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   TASK CARD
   ═══════════════════════════════════════════════════════════════════════════ */

function TaskCard({
  task,
  jobs,
  onToggleDone,
  onOpen,
}: {
  task: Task;
  jobs: Job[];
  onToggleDone: (task: Task) => void;
  onOpen: (task: Task) => void;
}) {
  const feStatus = toFrontendStatus(task.status);
  const isDone = feStatus === "Done";
  const isOverdue = feStatus === "Overdue" || (task.dueDate && isPast(task.dueDate) && !isDone);
  const prio = task.priority || "Medium";
  const prioStyle = PRIORITY_STYLE[prio] || PRIORITY_STYLE.Medium;
  const job = task.jobId ? jobs.find((j) => j.id === task.jobId) : null;

  // Left border for high priority
  const borderClass = prio === "High" ? "border-l-orange-400 border-l-[3px]" : "";

  return (
    <div
      className={`group flex items-start gap-3 p-3.5 card transition-all duration-150 hover:shadow-card-hover hover:border-ink-300 cursor-pointer ${borderClass} ${isDone ? "opacity-50" : ""}`}
      onClick={() => onOpen(task)}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleDone(task); }}
        className={`mt-0.5 flex-shrink-0 w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
          isDone
            ? "bg-green-500 border-green-500 text-white"
            : "border-ink-300 hover:border-brand-orange bg-transparent"
        }`}
      >
        {isDone && <CheckIcon />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <p className={`text-sm font-medium leading-snug ${isDone ? "line-through text-ink-400" : "text-ink-900"}`}>
          {task.title}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {/* Priority pill */}
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${prioStyle.bg} ${prioStyle.text}`}>
            {prio}
          </span>

          {/* Due date */}
          {task.dueDate && (
            <span className={`inline-flex items-center gap-1 text-xs ${isOverdue ? "text-red-600 font-semibold" : "text-ink-500"}`}>
              <CalendarIcon />
              {isOverdue && "⚠ "}
              {isToday(task.dueDate) ? "Today" : isTomorrow(task.dueDate) ? "Tomorrow" : formatDate(task.dueDate)}
            </span>
          )}

          {/* Job ref */}
          {job && (
            <span className="ref text-[11px] bg-ink-50 px-1.5 py-0.5 rounded">
              {job.client}
            </span>
          )}
        </div>
      </div>

      {/* Assignee avatar (right side) */}
      {task.assigneeName && (
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-7 h-7 rounded-full bg-ink-700 text-white text-[10px] font-bold flex items-center justify-center" title={task.assigneeName}>
            {initials(task.assigneeName)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TASK DETAIL SHEET (bottom sheet / overlay)
   ═══════════════════════════════════════════════════════════════════════════ */

function TaskDetail({
  task,
  jobs,
  staff,
  isManager,
  onClose,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task: Task;
  jobs: Job[];
  staff: User[];
  isManager: boolean;
  onClose: () => void;
  onStatusChange: (taskId: string, newBackendStatus: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}) {
  const feStatus = toFrontendStatus(task.status);
  const statusStyle = STATUS_STYLE[feStatus] || STATUS_STYLE["To Do"];
  const prio = task.priority || "Medium";
  const prioStyle = PRIORITY_STYLE[prio] || PRIORITY_STYLE.Medium;
  const job = task.jobId ? jobs.find((j) => j.id === task.jobId) : null;
  const isOverdue = feStatus === "Overdue" || (task.dueDate && isPast(task.dueDate) && feStatus !== "Done");

  const statusOptions: { label: string; backendVal: string; style: { bg: string; text: string } }[] = [
    { label: "To Do",       backendVal: "Not Started",     style: STATUS_STYLE["To Do"] },
    { label: "In Progress", backendVal: "In Progress",     style: STATUS_STYLE["In Progress"] },
    { label: "Done",        backendVal: "Completed",       style: STATUS_STYLE["Done"] },
    { label: "Blocked",     backendVal: "Waiting for...",  style: STATUS_STYLE["Blocked"] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-ink-900 transition-colors">
              <ChevronLeftIcon /> Back
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => onEdit(task)} className="p-2 rounded-lg hover:bg-ink-50 text-ink-500 hover:text-ink-900 transition-colors" title="Edit">
                <EditIcon />
              </button>
              <button onClick={() => { if (confirm("Delete this task?")) onDelete(task.id); }} className="p-2 rounded-lg hover:bg-red-50 text-ink-500 hover:text-red-600 transition-colors" title="Delete">
                <TrashIcon />
              </button>
            </div>
          </div>

          {/* Title */}
          <h2 className="font-heading text-lg font-semibold text-ink-900 leading-snug">
            {task.title}
          </h2>

          {/* Status + Priority chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
              <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
              {feStatus}
            </span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${prioStyle.bg} ${prioStyle.text}`}>
              {prio} priority
            </span>
            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                ⚠ Overdue
              </span>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-ink-50/70 rounded-lg p-3">
              <p className="eyebrow mb-1">Assigned to</p>
              <p className="text-sm font-medium text-ink-900 flex items-center gap-2">
                {task.assigneeName ? (
                  <>
                    <span className="w-6 h-6 rounded-full bg-ink-700 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                      {initials(task.assigneeName)}
                    </span>
                    {task.assigneeName}
                  </>
                ) : (
                  <span className="text-ink-400 italic">Unassigned</span>
                )}
              </p>
            </div>
            <div className="bg-ink-50/70 rounded-lg p-3">
              <p className="eyebrow mb-1">Due date</p>
              <p className={`text-sm font-medium flex items-center gap-1 ${isOverdue ? "text-red-600" : "text-ink-900"}`}>
                <CalendarIcon />
                {task.dueDate ? formatDate(task.dueDate) : <span className="text-ink-400 italic">No date</span>}
              </p>
            </div>
            {job && (
              <div className="bg-ink-50/70 rounded-lg p-3 col-span-2">
                <p className="eyebrow mb-1">Linked job</p>
                <p className="text-sm font-medium text-ink-900">
                  <span className="ref mr-2">{job.client}</span>
                  {job.projectName}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <p className="eyebrow mb-2">Description</p>
              <div className="bg-ink-50/70 rounded-lg p-3 text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">
                {task.description}
              </div>
            </div>
          )}

          {/* Created by */}
          {task.createdByName && (
            <p className="text-xs text-ink-400">
              Created by {task.createdByName} · {task.createdAt ? formatDate(task.createdAt) : ""}
            </p>
          )}

          {/* Quick status change */}
          <div>
            <p className="eyebrow mb-2">Change status</p>
            <div className="flex gap-2 flex-wrap">
              {statusOptions.map((opt) => (
                <button
                  key={opt.backendVal}
                  onClick={() => onStatusChange(task.id, opt.backendVal)}
                  disabled={task.status === opt.backendVal}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    task.status === opt.backendVal
                      ? `${opt.style.bg} ${opt.style.text} ring-2 ring-current ring-offset-1`
                      : "bg-white border border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300"
                  } disabled:cursor-default`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CREATE / EDIT TASK SHEET
   ═══════════════════════════════════════════════════════════════════════════ */

function TaskFormSheet({
  open,
  editTask,
  jobs,
  staff,
  onClose,
  onSave,
}: {
  open: boolean;
  editTask: Task | null;
  jobs: Job[];
  staff: User[];
  onClose: () => void;
  onSave: (data: any, isEdit: boolean) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    assigneeName: "",
    priority: "Medium",
    dueDate: "",
    jobId: "",
    status: "Not Started",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && editTask) {
      setForm({
        title: editTask.title || "",
        description: editTask.description || "",
        assigneeId: editTask.assigneeId || "",
        assigneeName: editTask.assigneeName || "",
        priority: editTask.priority || "Medium",
        dueDate: editTask.dueDate || "",
        jobId: editTask.jobId || "",
        status: editTask.status === "Overdue" ? "In Progress" : (editTask.status || "Not Started"),
      });
    } else if (open) {
      setForm({
        title: "", description: "", assigneeId: "", assigneeName: "",
        priority: "Medium", dueDate: "", jobId: "", status: "Not Started",
      });
    }
  }, [open, editTask]);

  if (!open) return null;

  const handleAssigneeChange = (uid: string) => {
    const u = staff.find((s) => s.id === uid);
    setForm({ ...form, assigneeId: uid, assigneeName: u?.name || "" });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onSave(form, !!editTask);
    } finally {
      setSaving(false);
    }
  };

  const priorities = [
    { key: "Low",    label: "Low",    style: "border-blue-400 bg-blue-50 text-blue-700" },
    { key: "Medium", label: "Normal", style: "border-ink-400 bg-ink-100 text-ink-700" },
    { key: "High",   label: "High",   style: "border-orange-400 bg-orange-50 text-orange-700" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-ink-900">
              {editTask ? "Edit Task" : "New Task"}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-50 text-ink-400 hover:text-ink-900 transition-colors">
              <CloseIcon />
            </button>
          </div>

          {/* Title */}
          <div className="field">
            <label className="label">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What needs to be done?"
              className="input"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="field">
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Details or notes (optional)"
              className="input"
              rows={2}
            />
          </div>

          {/* Priority selector */}
          <div className="field">
            <label className="label">Priority</label>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setForm({ ...form, priority: p.key })}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide border-2 transition-all duration-150 ${
                    form.priority === p.key
                      ? p.style
                      : "border-ink-200 bg-white text-ink-500 hover:border-ink-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="label">Assign to</label>
              <select
                value={form.assigneeId}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="input"
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Due date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="input"
              />
            </div>
          </div>

          {/* Status (edit only) */}
          {editTask && (
            <div className="field">
              <label className="label">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input"
              >
                <option value="Not Started">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Done</option>
                <option value="Waiting for...">Blocked</option>
              </select>
            </div>
          )}

          {/* Job link */}
          <div className="field">
            <label className="label">Link to job <span className="font-normal text-ink-400">(optional)</span></label>
            <select
              value={form.jobId}
              onChange={(e) => setForm({ ...form, jobId: e.target.value })}
              className="input"
            >
              <option value="">No job linked</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.client} — {j.projectName}</option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="flex-1 btn-primary"
            >
              {saving ? "Saving…" : editTask ? "Save Changes" : "Create Task"}
            </button>
            <button onClick={onClose} className="flex-1 btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function TasksPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode
  const [view, setView] = useState<"mine" | "team">("mine");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [teamMemberFilter, setTeamMemberFilter] = useState("__all__");

  // Sheets
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const isManager = MANAGER_ROLES.includes(user?.role || "");

  /* ── Load data ─────────────────────────────────────────────────────── */

  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const taskUrl = isManager ? "/tasks" : `/tasks?assigneeId=${user.id}`;
      const [t, j] = await Promise.all([
        api.get<Task[]>(taskUrl),
        api.get<Job[]>("/jobs"),
      ]);
      setTasks(t || []);
      setJobs(j || []);

      // Load staff for assignee picker
      if (isManager) {
        try {
          const s = await api.get<User[]>("/users");
          setStaff(s || []);
        } catch {
          try {
            const s = await api.get<User[]>("/users/employees");
            setStaff(s || []);
          } catch { /* no staff list available */ }
        }
      }
    } catch (err) {
      console.error("Failed to load tasks data", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isManager]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ── Filtering ─────────────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    let list = tasks;

    // My Tasks vs Team: show only user's tasks when "mine"
    if (view === "mine" && user) {
      list = list.filter((t) => t.assigneeId === user.id);
    }

    // Team member filter
    if (view === "team" && teamMemberFilter !== "__all__") {
      list = list.filter((t) => t.assigneeId === teamMemberFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((t) => {
        const fe = toFrontendStatus(t.status);
        if (statusFilter === "Overdue") return fe === "Overdue";
        return fe === statusFilter;
      });
    }

    // Priority filter
    if (priorityFilter !== "all") {
      list = list.filter((t) => (t.priority || "Medium") === priorityFilter);
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assigneeName?.toLowerCase().includes(q)
      );
    }

    return sortTasks(list);
  }, [tasks, view, user, statusFilter, priorityFilter, teamMemberFilter, search]);

  /* ── Summary stats ─────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const relevantTasks = view === "mine" && user
      ? tasks.filter((t) => t.assigneeId === user.id)
      : view === "team" && teamMemberFilter !== "__all__"
      ? tasks.filter((t) => t.assigneeId === teamMemberFilter)
      : tasks;

    let overdue = 0, todo = 0, inProgress = 0, done = 0;
    for (const t of relevantTasks) {
      const fe = toFrontendStatus(t.status);
      if (fe === "Overdue" || (t.dueDate && isPast(t.dueDate) && fe !== "Done")) overdue++;
      else if (fe === "To Do") todo++;
      else if (fe === "In Progress") inProgress++;
      else if (fe === "Done") done++;
    }
    return { overdue, todo, inProgress, done, total: relevantTasks.length };
  }, [tasks, view, user, teamMemberFilter]);

  /* ── Handlers ──────────────────────────────────────────────────────── */

  const handleToggleDone = async (task: Task) => {
    const feStatus = toFrontendStatus(task.status);
    const newBackendStatus = feStatus === "Done" ? "Not Started" : "Completed";

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newBackendStatus as any } : t))
    );
    // Update the detail sheet if it's showing this task
    if (detailTask?.id === task.id) {
      setDetailTask({ ...task, status: newBackendStatus as any });
    }
    try {
      await api.patch(`/tasks/${task.id}`, { status: newBackendStatus });
    } catch {
      loadAll();
    }
  };

  const handleStatusChange = async (taskId: string, newBackendStatus: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newBackendStatus as any } : t))
    );
    if (detailTask?.id === taskId) {
      setDetailTask({ ...detailTask, status: newBackendStatus as any });
    }
    try {
      await api.patch(`/tasks/${taskId}`, { status: newBackendStatus });
    } catch {
      loadAll();
    }
  };

  const handleSave = async (data: any, isEdit: boolean) => {
    if (isEdit && editTask) {
      const payload = { ...data };
      // Don't send jobId on edit (backend doesn't allow changing it)
      delete payload.jobId;
      const updated = await api.patch<Task>(`/tasks/${editTask.id}`, payload);
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === editTask.id ? { ...t, ...updated } : t)));
      }
    } else {
      // Self-assign if no assignee and not a manager
      const payload = { ...data };
      if (!payload.assigneeId && user) {
        payload.assigneeId = user.id;
        payload.assigneeName = user.name;
      }
      const created = await api.post<Task>("/tasks", payload);
      if (created) {
        setTasks((prev) => [created, ...prev]);
      }
    }
    setFormOpen(false);
    setEditTask(null);
  };

  const handleDelete = async (taskId: string) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setDetailTask(null);
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const openCreate = () => {
    setEditTask(null);
    setFormOpen(true);
    setDetailTask(null);
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setFormOpen(true);
    setDetailTask(null);
  };

  /* ── Team members for the sidebar (team view) ──────────────────────── */

  const teamMembers = useMemo(() => {
    if (!isManager) return [];
    const ids = new Set(tasks.map((t) => t.assigneeId).filter(Boolean));
    return staff.filter((s) => ids.has(s.id));
  }, [staff, tasks, isManager]);

  /* ── Render ─────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="page">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-[3px] border-brand-orange border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const dateGroups = groupByDate(filtered);
  const showEmpty = filtered.length === 0;

  return (
    <div className="page pb-nav space-y-4">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle mt-0.5">
            {stats.total} task{stats.total !== 1 ? "s" : ""}
            {stats.overdue > 0 && (
              <span className="text-red-600 font-semibold ml-2">
                {stats.overdue} overdue
              </span>
            )}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <PlusIcon /> <span className="hidden sm:inline">New Task</span>
        </button>
      </div>

      {/* ── Summary strip ────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { n: stats.overdue,    label: "Overdue",     color: "text-red-600" },
          { n: stats.todo,       label: "To Do",       color: "text-ink-700" },
          { n: stats.inProgress, label: "In Progress", color: "text-blue-600" },
          { n: stats.done,       label: "Done",        color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="card text-center py-3 px-2">
            <div className={`font-heading text-xl font-bold tabular-nums ${s.color}`}>{s.n}</div>
            <div className="eyebrow mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── My Tasks / Team Tasks tabs (managers only) ────────────────── */}
      {isManager && (
        <div className="tabs">
          <button
            onClick={() => { setView("mine"); setTeamMemberFilter("__all__"); }}
            className={`tab ${view === "mine" ? "tab-active" : ""}`}
          >
            My Tasks
            <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${
              view === "mine" ? "bg-brand-orange text-white" : "bg-ink-100 text-ink-500"
            }`}>
              {tasks.filter((t) => t.assigneeId === user?.id).length}
            </span>
          </button>
          <button
            onClick={() => setView("team")}
            className={`tab ${view === "team" ? "tab-active" : ""}`}
          >
            Team Tasks
            <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${
              view === "team" ? "bg-brand-orange text-white" : "bg-ink-100 text-ink-500"
            }`}>
              {tasks.length}
            </span>
          </button>
        </div>
      )}

      {/* ── Team member filter (team view only) ──────────────────────── */}
      {view === "team" && isManager && teamMembers.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setTeamMemberFilter("__all__")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              teamMemberFilter === "__all__"
                ? "bg-ink-900 text-white border-ink-900"
                : "bg-white text-ink-600 border-ink-200 hover:border-ink-300"
            }`}
          >
            All ({tasks.length})
          </button>
          {teamMembers.map((m) => {
            const count = tasks.filter((t) => t.assigneeId === m.id).length;
            return (
              <button
                key={m.id}
                onClick={() => setTeamMemberFilter(m.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                  teamMemberFilter === m.id
                    ? "bg-ink-900 text-white border-ink-900"
                    : "bg-white text-ink-600 border-ink-200 hover:border-ink-300"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-ink-600 text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                  {initials(m.name)}
                </span>
                {m.name.split(" ")[0]}
                <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="input pl-10"
          />
        </div>

        {/* Status chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {STATUS_FILTERS.map((sf) => (
            <button
              key={sf.key}
              onClick={() => setStatusFilter(sf.key)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                statusFilter === sf.key
                  ? "bg-ink-900 text-white border-ink-900"
                  : "bg-white text-ink-500 border-ink-200 hover:border-ink-300 hover:text-ink-700"
              }`}
            >
              {sf.label}
            </button>
          ))}

          {/* Priority filter inline */}
          <span className="w-px bg-ink-200 flex-shrink-0 mx-1 my-1" />
          {(["all", "High", "Medium", "Low"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                priorityFilter === p
                  ? "bg-ink-900 text-white border-ink-900"
                  : "bg-white text-ink-500 border-ink-200 hover:border-ink-300 hover:text-ink-700"
              }`}
            >
              {p === "all" ? "All priority" : p === "Medium" ? "Normal" : p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Task list ────────────────────────────────────────────────── */}
      {showEmpty ? (
        <div className="empty">
          <div className="text-3xl mb-1">✓</div>
          <p className="empty-title">
            {search || statusFilter !== "all" || priorityFilter !== "all"
              ? "No tasks match your filters"
              : view === "mine"
              ? "You're all caught up!"
              : "No team tasks yet"}
          </p>
          <p className="empty-body">
            {search || statusFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting the filters above."
              : "Create a task to get started."}
          </p>
          {!search && statusFilter === "all" && priorityFilter === "all" && (
            <button onClick={openCreate} className="btn-primary mt-2">
              <PlusIcon /> New Task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {dateGroups.map((group) => (
            <div key={group.label}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`eyebrow ${group.label === "Overdue" ? "text-red-600" : ""}`}>
                  {group.label}
                </span>
                <span className="eyebrow text-ink-300">{group.tasks.length}</span>
                <div className="flex-1 h-px bg-ink-100" />
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    jobs={jobs}
                    onToggleDone={handleToggleDone}
                    onOpen={(t) => setDetailTask(t)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FAB (mobile) ─────────────────────────────────────────────── */}
      <button
        onClick={openCreate}
        className="sm:hidden fixed bottom-24 right-5 z-30 w-14 h-14 rounded-2xl bg-brand-orange text-white flex items-center justify-center shadow-lg hover:bg-brand-orange-dark transition-all active:scale-95"
        style={{ boxShadow: "0 4px 14px rgba(245, 129, 32, 0.35)" }}
      >
        <PlusIcon />
      </button>

      {/* ── Sheets ───────────────────────────────────────────────────── */}
      <TaskFormSheet
        open={formOpen}
        editTask={editTask}
        jobs={jobs}
        staff={staff}
        onClose={() => { setFormOpen(false); setEditTask(null); }}
        onSave={handleSave}
      />

      {detailTask && (
        <TaskDetail
          task={detailTask}
          jobs={jobs}
          staff={staff}
          isManager={isManager}
          onClose={() => setDetailTask(null)}
          onStatusChange={handleStatusChange}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
