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

  const statusIcons: Record<string, string> = {
    "Not Started": "⭕",
    "In Progress": "🔄",
    "Waiting for...": "⏸️",
    "Completed": "✅",
  };

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>

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
            <div
              key={task.id}
              className={`bg-white rounded-lg p-4 border border-gray-200 ${
                task.status === "Completed" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleTask(task)}
                  className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center text-lg font-bold transition-colors ${
                    task.status === "Completed"
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300 hover:border-orange-500"
                  }`}
                >
                  {task.status === "Completed" ? "✓" : ""}
                </button>

                <div className="flex-1">
                  <h3 className={`font-semibold ${task.status === "Completed" ? "line-through text-gray-500" : "text-gray-900"}`}>
                    {task.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{statusIcons[task.status] || "❓"} {task.status}</span>
                    {task.dueDate && <span>📅 {task.dueDate}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
