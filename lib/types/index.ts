// User & Auth
export interface User {
  id: string;
  email: string;
  name: string;
  role:
    | "managing_director"
    | "manager"
    | "department_manager"
    | "admin"
    | "supervisor"
    | "office"
    | "drafter"
    | "cabinet_maker"
    | "installer"
    | "contractor"
    | "employee"
    | "designer";
  active: boolean;
  color?: string;
  createdAt?: string;
  permissionMatrix?: Record<string, Record<string, boolean>>;
  permissions?: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Job
export interface Job {
  id: string;
  client: string;
  phone: string;
  projectName: string;
  siteAddress: string;
  status: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
  designStage: string;
  designProgress: number;
  productionStage: string;
  completionPct: number;
  assignedStaff?: string;
  assignedDesignerId?: string;
  notes: string;
  photos: string[];
  createdAt: string;
  updatedAt: string;
}

// Task
export interface Task {
  id: string;
  jobId: string;
  title: string;
  description: string;
  status: "Not Started" | "In Progress" | "Waiting for..." | "Completed";
  assigneeId: string;
  assigneeName: string;
  dueDate?: string;
  createdAt: string;
}

// Daily Output
export interface EntryMaterial {
  stockItemId: string;
  jobId?: string;
  jobNum?: string;
  qty: number;
  wastageQty?: number;
  notes?: string;
}

export interface DailyEntry {
  id: string;
  userId: string;
  date: string;
  counts: Record<string, number>;
  note: string;
  materials?: EntryMaterial[];
  createdAt: string;
  updatedAt: string;
}

// API Response
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}
