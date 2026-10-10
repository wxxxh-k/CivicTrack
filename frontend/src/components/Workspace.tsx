import { useEffect, useState } from "react";
import { Building2, FileSpreadsheet, FilePlus2 } from "lucide-react";
import ProjectForm from "./ProjectForm";
import CsvImport from "./CsvImport";
import { api, type Session } from "../api";
import type { Project, Road } from "../types";

export default function Workspace({ session, projects, onChanged }: { session: Session; projects: Project[]; onChanged: () => void }) {
  const [view, setView] = useState<"form" | "csv">("form");
  const [roads, setRoads] = useState<Road[] | null>(null);
  const [err, setErr] = useState("");
  const load = () => { setErr(""); api.roads().then(setRoads).catch(e => setErr((e as Error).message)); };
  useEffect(load, []);

  return (
    <section className="ws-card">
      <div className="ws-head">
        <div className="ws-badge"><Building2 size={18} /></div>
        <div>
          <h2>{session.department.name}</h2>
          <p className="ws-muted">Only signed-in departments can add or import projects. Everything you add is shown publicly with its source.</p>
        </div>
      </div>
      <div className="ws-tabs" role="tablist">
        <button role="tab" aria-selected={view === "form"} className={view === "form" ? "on" : ""} onClick={() => setView("form")} style={{ color: "#eaebed" }}><FilePlus2 size={16} /> Add a project</button>
        <button role="tab" aria-selected={view === "csv"} className={view === "csv" ? "on" : ""} onClick={() => setView("csv")} style={{ color: "#eaebed" }}><FileSpreadsheet size={16} /> Import from CSV</button>
      </div>
      {err && <div className="ws-error">{err} <button className="ws-chip" onClick={load}>Retry</button></div>}
      {!roads && !err && <p className="ws-muted">Loading the map data…</p>}
      {roads && (view === "form"
        ? <ProjectForm roads={roads} projects={projects} session={session} onCreated={onChanged} />
        : <CsvImport roads={roads} session={session} onImported={onChanged} />)}
    </section>
  );
}
