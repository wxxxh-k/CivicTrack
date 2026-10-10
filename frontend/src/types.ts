export type ProjectStatus = "Planned" | "Ongoing" | "Delayed" | "Completed" | "Cancelled";

export interface Project {
  id: string;
  title: string;
  work_type: string;
  area: string;
  department: string;
  contractor: string;
  planned_start: string;
  planned_end: string;
  original_end?: string;
  status: ProjectStatus;
  progress: number;
  budget_inr: number;
  delay_reason?: string | null;
  description: string;
  geometry?: number[][];
  slips?: number;
  days_overdue?: number;
  source?: "demo" | "official" | "import";
  tender_id?: string | null;
  source_url?: string | null;
  dates_estimated?: boolean;
  road_segment_id?: string; // only used by the offline fallback records
}

export interface Conflict {
  id: string;
  project_a: string;
  project_a_title: string;
  project_b: string;
  project_b_title: string;
  area: string;
  kind?: "same_stretch" | "nearby";
  shared_m?: number;
  gap_days?: number;
  overlap_start: string | null;
  overlap_end: string | null;
  road_segment_id?: string;
  message: string;
}

export interface Road { name: string; coordinates: number[][]; }
export interface Department { id: number; name: string; }

export interface ConflictHit {
  id: string; title: string; department: string; area: string;
  planned_start: string; planned_end: string; status: string;
  kind: "same_stretch" | "nearby"; shared_m: number; gap_days: number; time_overlap: boolean;
}
export interface Suggestion { type: "joint" | "wait"; start: string | null; end: string | null; note: string; }
export interface ConflictCheckResult { conflicts: ConflictHit[]; suggestion: Suggestion | null; }

export type CellValue = string | number | boolean | null;
export interface PreviewRow {
  row: number; road: string | null; errors: string[]; notes: string[]; suggestions: string[];
  values: Record<string, CellValue>; geometry: number[][] | null; clashes: string[];
}
export interface ImportPreview {
  columns: Record<string, string>; unmapped: string[]; rows: PreviewRow[]; file_errors: string[];
}
export interface ImportResult {
  created: number; project_ids: string[]; rejected: number;
  errors: { index: number; errors: string[] }[];
  warnings: { project: string; title: string; clashes_with: string[] }[];
}
