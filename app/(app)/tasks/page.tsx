"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";
import { Task, Job, User } from "@/lib/types";

/* ─── constants ────────────────────────────────────────────────────────── */

const COLUMNS = [
  { key: "Overdue",         label: "Overdue",       dot: "bg-red-500",    bg: "bg-red-50",    border: "border-red-200" },
  { key: "Not Started",     label: "Not Started",   dot: "bg-gray-400",   bg: "bg-gray-50",   border: "border-gray-200" },
  { key: "In Progress",     label: "In Progress",   dot: "bg-blue-500",   bg: "bg-blue-50",   border: "border-blue-200" },
  { key: "Waiting for...",  label: "Waiting",       dot: "bg-amber-500",  bg: "bg-amber-50",  border: "border-amber-200" },
  { key: "Completed",       label: "Completed",     dot: "bg-green-500",  bg: "bg-green-50",  border: "border-green-200" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

/** Roles that can see ALL tasks and the assignee filter. */
const MANAGER_ROLES = [
  "managing_director", "manager", "department_manager", "admin", "supervisor",
];

const PRIORITY_DOT: Record<string, string> = {
  High:   "bg-red-500",
  Medium: "bg-orange-400",
  Low:    "bg-gray-400",
};

/* ─── helpers ──────────────────────────────────────────────────────────── */

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isOverdue(t: Task) {
  return (t as any).status === "Overdue";
}

function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d + (d.includes("T") ? "" : "T00:00:00"));
  return dt.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/* ─── TaskCard ─────────────────────────────────────────────────────────── */

function TaskCard({
  task,
  jobs,
  onMove,
  onEdit,
}: {
  task: Task;
  jobs: Job[];
  onMove: (id: string, status: string) => void;
  onEdit: (task: Task) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const job = jobs.find((j) => j.id === task.jobId);
  const overdue = isOverdue(task);
  const prio = task.priority || "Medium";

  const moveTargets = COLUMNS.filter((c) => c.key !== "Overdue" && c.key !== task.status);

  return (
    <div
      className={`bg-white rounded-lg border shadow-sm transition-shadow hover:shadow-md ${
        overdue ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"
      }`}
    >
      <div className="p-3 space-y-2">
        {/* Row 1: priority + due date */}
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${PRIORITY_DOT[prio] || "bg-gray-400"}`} />
            <span className="text-gray-500 font-medium">{prio}</span>
          </span>
          <span className="flex items-center gap-1">
            {task.dueDate && (
              <span className={`font-medium ${overdue ? "text-red-600" : "text-gray-500"}`}>
                {overdue && "⚠ "}{formatDate(task.dueDate)}
              </span>
            )}
          </span>
        </div>

        {/* Row 2: title */}
        <button
          onClick={() => onEdit(task)}
          className="text-left w-full font-semibold text-gray-900 text-sm leading-snug hover:text-orange-600 transition-colors"
        >
          {task.title}
        </button>

        {/* Row 3: job link */}
        {job && (
          <div className="text-xs text-gray-500 truncate">
            {job.client} — {job.projectName}
          </div>
        )}

        {/* Row 4: assignee + action menu */}
        <div className="flex items-center justify-between pt-1">
          {task.assigneeName ? (
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-gray-700 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {initials(task.assigneeName)}
              </span>
              <span className="text-xs text-gray-600 truncate max-w-[100px]">
                {task.assigneeName}
              </span>
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">Unassigned</span>
          )}

          {/* Action menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="absolute right-0 bottom-8 z-30 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-sm">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Move to
                </div>
                {moveTargets.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => { onMove(task.id, col.key); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    {col.label}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={() => { onEdit(task); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── KanbanColumn ─────────────────────────────────────────────────────── */

function KanbanColumn({
  col,
  tasks,
  jobs,
  onMove,
  onEdit,
}: {
  col: (typeof COLUMNS)[number];
  tasks: Task[];
  jobs: Job[];
  onMove: (id: string, status: string) => void;
  onEdit: (task: Task) => void;
}) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1">
      {/* Column header */}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-lg ${col.bg} ${col.border} border-b-2`}>
        <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
        <span className="font-semibold text-sm text-gray-800">{col.label}</span>
        <span className="ml-auto text-xs font-bold text-gray-500 bg-white/70 rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>

      {/* Column body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/50 rounded-b-lg border border-t-0 border-gray-200 min-h-[200px]">
        {tasks.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-8">No tasks</div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              jobs={jobs}
              onMove={onMove}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── CreateTaskModal ──────────────────────────────────────────────────── */

function CreateTaskModal({
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

  // Reset form when modal opens
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
      setForm({ title: "", description: "", assigneeId: "", assigneeName: "", priority: "Medium", dueDate: "", jobId: "", status: "Not Started" });
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5 space-y-4">
          <h2 className="font-heading text-lg font-semibold">
            {editTask ? "Edit Task" : "New Task"}
          </h2>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Details or notes (optional)"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
              rows={2}
            />
          </div>

          {/* Two-col: Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            {editTask && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Waiting for...">Waiting for...</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            )}
          </div>

          {/* Two-col: Assignee + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assign to</label>
              <select
                value={form.assigneeId}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
              />
            </div>
          </div>

          {/* Job link */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link to job</label>
            <select
              value={form.jobId}
              onChange={(e) => setForm({ ...form, jobId: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
            >
              <option value="">No job linked</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.client} — {j.projectName}</option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {saving ? "Saving…" : editTask ? "Save Changes" : "Create Task"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────── */

export default function TasksPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState<string>("__all__");
  const [filterJob, setFilterJob] = useState<string>("__all__");
  const [filterPriority, setFilterPriority] = useState<string>("__all__");

  // Mobile column selector
  const [mobileCol, setMobileCol] = useState<ColumnKey>("In Progress");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const isManager = MANAGER_ROLES.includes(user?.role || "");

  /* ── Load data ─────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!user?.id) return;
    loadAll();
  }, [user?.id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      // Managers see all tasks; workers see their own
      const taskUrl = isManager ? "/tasks" : `/tasks?assigneeId=${user!.id}`;
      const [t, j] = await Promise.all([
        api.get<Task[]>(taskUrl),
        api.get<Job[]>("/jobs"),
      ]);
      setTasks(t || []);
      setJobs(j || []);

      // Load staff list for assignee picker (managers get full list)
      if (isManager) {
        try {
          const s = await api.get<User[]>("/users");
          setStaff(s || []);
        } catch {
          // Fallback: at least show employees
          try {
            const s = await api.get<User[]>("/users/employees");
            setStaff(s || []);
          } catch { /* no staff list available */ }
        }
      }
    } catch (err) {
      console.error("Failed to load tasks data");
    } finally {
      setLoading(false);
    }
  };

  /* ── Filter & bucket ───────────────────────────────────────────────── */

  const filtered = useMemo(() => {
    let list = tasks;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assigneeName?.toLowerCase().includes(q)
      );
    }
    if (filterAssignee !== "__all__") {
      list = list.filter((t) => t.assigneeId === filterAssignee);
    }
    if (filterJob !== "__all__") {
      list = list.filter((t) => t.jobId === filterJob);
    }
    if (filterPriority !== "__all__") {
      list = list.filter((t) => (t.priority || "Medium") === filterPriority);
    }
    return list;
  }, [tasks, search, filterAssignee, filterJob, filterPriority]);

  /** Tasks bucketed into columns. */
  const columns = useMemo(() => {
    const buckets: Record<string, Task[]> = {};
    for (const col of COLUMNS) buckets[col.key] = [];
    for (const t of filtered) {
      const key = t.status as string;
      if (buckets[key]) {
        buckets[key].push(t);
      } else {
        // Unknown status — put in "In Progress"
        buckets["In Progress"].push(t);
      }
    }
    // Sort: high-priority first, then by due date
    const prioOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    for (const key of Object.keys(buckets)) {
      buckets[key].sort((a, b) => {
        const pa = prioOrder[a.priority || "Medium"] ?? 1;
        const pb = prioOrder[b.priority || "Medium"] ?? 1;
        if (pa !== pb) return pa - pb;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
    }
    return buckets;
  }, [filtered]);

  // Hide the Overdue column if nothing is in it
  const visibleColumns = useMemo(() => {
    return COLUMNS.filter((c) => c.key !== "Overdue" || columns["Overdue"].length > 0);
  }, [columns]);

  /* ── Handlers ──────────────────────────────────────────────────────── */

  const handleMove = async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as any } : t))
    );
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
    } catch {
      // Revert on error
      loadAll();
    }
  };

  const handleOpenCreate = () => {
    setEditTask(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditTask(task);
    setModalOpen(true);
  };

  const handleSave = async (data: any, isEdit: boolean) => {
    if (isEdit && editTask) {
      const updated = await api.patch<Task>(`/tasks/${editTask.id}`, data);
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === editTask.id ? { ...t, ...updated } : t)));
      }
    } else {
      // If the current user is not a manager and no assignee set, self-assign
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
    setModalOpen(false);
    setEditTask(null);
  };

  /* ── Summary stats ─────────────────────────────────────────────────── */

  const overdueCount = columns["Overdue"]?.length || 0;
  const totalFiltered = filtered.length;

  /* ── Render ─────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="page">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="page space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalFiltered} task{totalFiltered !== 1 ? "s" : ""}
            {overdueCount > 0 && (
              <span className="text-red-600 font-semibold ml-2">
                {overdueCount} overdue
              </span>
            )}
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary">
          + New Task
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks…"
          className="flex-1 min-w-[140px] max-w-[240px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none bg-white"
        />

        {/* Assignee filter — managers only */}
        {isManager && (
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
          >
            <option value="__all__">All people</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {/* Job filter */}
        <select
          value={filterJob}
          onChange={(e) => setFilterJob(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
        >
          <option value="__all__">All jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.client} — {j.projectName}</option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
        >
          <option value="__all__">All priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* ── Mobile: column tabs ────────────────────────────────────────── */}
      <div className="sm:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {visibleColumns.map((col) => {
            const count = columns[col.key].length;
            const active = mobileCol === col.key;
            return (
              <button
                key={col.key}
                onClick={() => setMobileCol(col.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  active
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 border border-gray-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${active ? "bg-white" : col.dot}`} />
                {col.label}
                {count > 0 && (
                  <span className={`text-xs font-bold ${
                    active ? "text-white/70" : col.key === "Overdue" ? "text-red-600" : "text-gray-400"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile column content */}
        <div className="space-y-2 mt-2">
          {(columns[mobileCol] || []).length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-12">
              No tasks in this column
            </div>
          ) : (
            (columns[mobileCol] || []).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                jobs={jobs}
                onMove={handleMove}
                onEdit={handleOpenEdit}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Desktop: Kanban columns ────────────────────────────────────── */}
      <div className="hidden sm:block">
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 320px)" }}>
          {visibleColumns.map((col) => (
            <KanbanColumn
              key={col.key}
              col={col}
              tasks={columns[col.key]}
              jobs={jobs}
              onMove={handleMove}
              onEdit={handleOpenEdit}
            />
          ))}
        </div>
      </div>

      {/* ── Create / Edit modal ────────────────────────────────────────── */}
      <CreateTaskModal
        open={modalOpen}
        editTask={editTask}
        jobs={jobs}
        staff={staff}
        onClose={() => { setModalOpen(false); setEditTask(null); }}
        onSave={handleSave}
      />
    </div>
  );
}
