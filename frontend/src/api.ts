import type { ConflictCheckResult, Conflict, Department, ImportPreview, ImportResult, Project, Road } from "./types";

const KEY = "civictrack.session";
export interface Session { token: string; department: Department; }

export function getSession(): Session | null {
  try { const s = localStorage.getItem(KEY); return s ? (JSON.parse(s) as Session) : null; } catch { return null; }
}
export function saveSession(s: Session | null) {
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event("ct-session"));
}

export class ApiError extends Error {
  status: number;
  body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  constructor(message: string, status: number, body: unknown) { super(message); this.status = status; this.body = body; }
}

async function req<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(init.headers);
  const s = getSession();
  if (auth && s) headers.set("Authorization", `Bearer ${s.token}`);
  let res: Response;
  try { res = await fetch(path, { ...init, headers }); }
  catch { throw new ApiError("Cannot reach the server. Check that the backend is running.", 0, null); }
  const text = await res.text();
  let body: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  try { body = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!res.ok) {
    if (res.status === 401 && auth) saveSession(null);
    const d = body?.detail;
    const msg = typeof d === "string" ? d : Array.isArray(d) ? d.map((x: { msg: string }) => x.msg).join("; ") : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, body);
  }
  return body as T;
}
const json = (method: string, data: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

export const api = {
  departments: () => req<Department[]>("/api/departments"),
  login: (department_id: number) => req<Session>("/api/auth/demo-login", json("POST", { department_id })),
  roads: () => req<Road[]>("/api/roads"),
  projects: () => req<Project[]>("/api/projects"),
  conflicts: () => req<Conflict[]>("/api/conflicts"),
  checkConflicts: (b: { geometry: number[][]; planned_start: string; planned_end: string }) =>
    req<ConflictCheckResult>("/api/conflicts/check", json("POST", b)),
  createProject: (b: Record<string, unknown>, force: boolean) =>
    req<Project>(`/api/projects?force=${force}`, json("POST", b), true),
  importPreview: (file: File) => { const fd = new FormData(); fd.append("file", file); return req<ImportPreview>("/api/import/preview", { method: "POST", body: fd }, true); },
  importCommit: (rows: Record<string, unknown>[]) => req<ImportResult>("/api/import/commit", json("POST", { rows }), true),
};
