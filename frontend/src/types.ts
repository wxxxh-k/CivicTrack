export type ProjectStatus = "Planned" | "Ongoing" | "Delayed" | "Completed";

export interface Project {
  id: string;
  title: string;
  work_type: string;
  area: string;
  department: string;
  contractor: string;
  planned_start: string;
  planned_end: string;
  status: ProjectStatus;
  progress: number;
  budget_inr: number;
  delay_reason?: string | null;
  road_segment_id: string;
  description: string;
}

export interface Conflict {
  id: string;
  project_a: string;
  project_a_title: string;
  project_b: string;
  project_b_title: string;
  area: string;
  road_segment_id: string;
  overlap_start: string;
  overlap_end: string;
  message: string;
}