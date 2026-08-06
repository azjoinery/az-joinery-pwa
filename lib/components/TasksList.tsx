"use client";

import { useState } from "react";
import { useTasks } from "@/lib/hooks/useTasks";
import { Modal } from "./Modal";
import { TaskForm } from "./TaskForm";
import type { Task } from "@/lib/types/models";
import styles from "./TasksList.module.css";

interface TasksListProps {
  jobId?: string;
}

export function TasksList({ jobId }: TasksListProps) {
  const { tasks, loading, error, createTask, updateTask } = useTasks(jobId);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  async function handleCreateTask(data: Omit<Task, "id" | "createdAt" | "updatedAt">) {
    await createTask(data);
    setIsCreateModalOpen(false);
  }

  async function handleUpdateTask(data: Omit<Task, "id" | "createdAt" | "updatedAt">) {
    if (editingTask) {
      await updateTask(editingTask.id, data);
      setEditingTask(null);
    }
  }

  if (loading) return <div className={styles.loading}>Loading tasks...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Tasks</h3>
        <button className={styles.addButton} onClick={() => setIsCreateModalOpen(true)}>
          + New Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className={styles.empty}>No tasks found. Create one to get started.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assigned To</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className={styles.row}>
                <td className={styles.title}>{task.title}</td>
                <td>
                  <span className={`${styles.badge} ${styles[`status-${task.status}`]}`}>
                    {task.status}
                  </span>
                </td>
                <td>
                  <span className={`${styles.badge} ${styles[`priority-${task.priority}`]}`}>
                    {task.priority}
                  </span>
                </td>
                <td>{task.assignedTo}</td>
                <td>{new Date(task.dueDate).toLocaleDateString()}</td>
                <td className={styles.actions}>
                  <button className={styles.actionBtn} onClick={() => setEditingTask(task)}>
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
        title="Create New Task"
        onClose={() => setIsCreateModalOpen(false)}
        size="medium"
      >
        <TaskForm
          jobId={jobId}
          onSubmit={handleCreateTask}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={editingTask !== null}
        title="Edit Task"
        onClose={() => setEditingTask(null)}
        size="medium"
      >
        {editingTask && (
          <TaskForm
            task={editingTask}
            onSubmit={handleUpdateTask}
            onCancel={() => setEditingTask(null)}
          />
        )}
      </Modal>
    </div>
  );
}
