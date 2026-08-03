export type JobStatus = "quoted" | "in_progress" | "complete";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Job {
  id: string;
  reference: string;
  client: string;
  description: string;
  status: JobStatus;
  dueDate: string;
}

export interface Task {
  id: string;
  title: string;
  jobRef: string;
  status: TaskStatus;
}

export interface DailyEntry {
  date: string;
  cabinets: number;
  cncBoards: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}
