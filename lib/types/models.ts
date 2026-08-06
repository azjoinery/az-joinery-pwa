export interface Job {
  id: string;
  name: string;
  client: string;
  status: "pending" | "in_progress" | "completed" | "on_hold";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  description?: string;
  designStage?: number;
  estimatedCompletion?: string;
}

export interface Task {
  id: string;
  jobId: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high";
  assignedTo: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ProductionLog {
  id: string;
  date: string;
  cabinetMakerId: string;
  cabinetsCompleted: number;
  cncBoardsCompleted: number;
  hoursWorked: number;
  notes?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "job_update" | "task_assigned" | "production_alert" | "deadline_warning" | "system";
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface JobsResponse {
  data: Job[];
  total: number;
  page: number;
  limit: number;
}

export interface TasksResponse {
  data: Task[];
  total: number;
  page: number;
  limit: number;
}
