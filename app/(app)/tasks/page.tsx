"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/store/auth";
import { api } from "@/lib/api/client";
import { Task } from "@/lib/types";

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", dueDate: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [user?.id]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      if (!user) return;
      const data = await api.get<Task[]>(`/tasks?assigneeId=${user.id}`);
      setTasks(data || []);
    } catch (err) {
      console.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const newStatus = task.status === "Completed" ? "In Progress" : "Completed";
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
      setTasks(
        tasks.map((t) =>
          t.id === task.id ? { ...t, status: newStatus as any } : t
        )
      );
    } catch (err) {
      console.error("Failed to update task");
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "completed") return t.status === "Completed";
    if (filter === "pending") return t.status !== "Completed";
    return true;
  });

  const handleAddTask = async () => {
    if (!formData.title.trim()) return;
    setAdding(true);
    try {
      const newTask = await api.post<Task>("/tasks", {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate || undefined,
        assigneeId: user?.id,
        status: "In Progress",
      });
      if (newTask) setTasks([...tasks, newTask]);
      setFormData({ title: "", description: "", dueDate: "" });
      setShowForm(false);
    } catch (err) {
      console.error("Failed to add task");
    } finally {
      setAdding(false);
    }
  };

  // Slice 7b — inline edit / delete per row. Task rows have no detail page,
  // so the pattern is expand-in-place: pencil opens an editor under the row,
  // trash opens a two-tap confirm. Nothing gets removed on a single stray tap.
  const updateTask = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };
  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="page space-y-4">
      <h1 className="page-title">My Tasks</h1>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "pending", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full font-medium transition-colors ${
              filter === f
                ? "bg-orange-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Add Task</button>

      {showForm && (
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 space-y-3">
          <input type="text" placeholder="Task title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
          <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <button onClick={handleAddTask} disabled={adding} className="btn-primary w-full">{adding ? "Adding..." : "Add Task"}</button>
          <button onClick={() => setShowForm(false)} className="w-full px-4 py-2 border rounded-lg">Cancel</button>
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          {filter === "completed" ? "No completed tasks" : "No pending tasks"}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task)}
              onUpdated={updateTask}
              onDeleted={removeTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Slice 7b — a task row with an inline editor and a two-tap delete confirm.
 * View state shows the checkbox + title + description + due date and a small
 * Edit / Delete pair on the right. Edit swaps the row into a form; Save PATCHes
 * and collapses back to view. Delete needs two taps to actually fire.
 */
function TaskRow({
  task,
  onToggle,
  onUpdated,
  onDeleted,
}: {
  task: Task;
  onToggle: () => void;
  onUpdated: (t: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState<string>(task.dueDate || "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.patch<Task>(`/tasks/${task.id}`, {
        title, description, dueDate: dueDate || undefined,
      });
      if (updated) onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setSaveError("Couldn't save this task — changes were not recorded.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/tasks/${task.id}`);
      onDeleted(task.id);
    } catch (err) {
      setDeleteError("Couldn't delete this task — it was not removed.");
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <div className="bg-white rounded-lg p-4 border border-orange-200 space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold"
          autoFocus
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
        {saveError && <div className="alert-danger">{saveError}</div>}
        <div className="flex gap-2">
          <button
            onClick={() => { setEditing(false); setSaveError(null); setTitle(task.title || ""); setDescription(task.description || ""); setDueDate(task.dueDate || ""); }}
            className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg p-4 border border-gray-200 ${task.status === "Completed" ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center text-lg font-bold transition-colors ${
            task.status === "Completed"
              ? "bg-green-500 border-green-500 text-white"
              : "border-gray-300 hover:border-orange-500"
          }`}
          aria-label={task.status === "Completed" ? "Mark as not completed" : "Mark as completed"}
        >
          {task.status === "Completed" ? "✓" : ""}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${task.status === "Completed" ? "line-through text-gray-500" : "text-gray-900"}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{task.status}</span>
            {task.dueDate && <span>Due {task.dueDate}</span>}
          </div>
        </div>

        {/* Slice 7b — edit / delete cluster */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {!confirmDelete ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                aria-label="Edit task"
                title="Edit"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                aria-label="Delete task"
                title="Delete"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={remove}
                disabled={deleting}
                className="text-xs px-2 py-1.5 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 disabled:bg-gray-400"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
                className="text-xs px-2 py-1.5 bg-gray-100 text-gray-700 rounded-md font-semibold"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      {deleteError && (
        <div className="alert-danger mt-2">{deleteError}</div>
      )}
    </div>
  );
}
