import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import MapPicker from "./MapPicker";
import { api, ApiError, type Session } from "../api";
import type { ConflictHit, Project, Road, Suggestion } from "../types";
import type { Pt } from "../geo";

const WORK_TYPES = ["Road", "Drainage", "Water", "Footpath", "Electricity", "Sewer", "Other"];
const BLANK = { title: "", work_type: "Road", area: "", contractor: "", planned_start: "", planned_end: "", budget_inr: "",
  description: "", tender_id: "", source_url: "", dates_estimated: false };
const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function ProjectForm({ roads, projects, session, onCreated }:
  { roads: Road[]; projects: Project[]; session: Session; onCreated: () => void }) {
  const [f, setF] = useState(BLANK);
  const [geometry, setGeometry] = useState<Pt[] | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const [conflicts, setConflicts] = useState<ConflictHit[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [checking, setChecking] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Project | null>(null);
  const set = (k: keyof typeof BLANK, v: string | boolean) => setF(p => ({ ...p, [k]: v }));

  // Live clash check as soon as a location and valid dates exist.
  useEffect(() => {
    setConflicts([]); setSuggestion(null);
    if (!geometry || !f.planned_start || !f.planned_end || f.planned_end < f.planned_start) return;
    let cancel = false;
    const t = setTimeout(() => {
      setChecking(true);
      api.checkConflicts({ geometry, planned_start: f.planned_start, planned_end: f.planned_end })
        .then(r => { if (!cancel) { setConflicts(r.conflicts); setSuggestion(r.suggestion); } })
        .catch(() => { /* the check is advisory; saving still validates on the server */ })
        .finally(() => { if (!cancel) setChecking(false); });
    }, 400);
    return () => { cancel = true; clearTimeout(t); };
  }, [geometry, f.planned_start, f.planned_end]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (f.title.trim().length < 3) errs.push("Enter a project title (at least 3 characters).");
    if (f.area.trim().length < 2) errs.push("Enter the area or locality.");
    if (!f.planned_start || !f.planned_end) errs.push("Choose a start and an end date.");
    else if (f.planned_end < f.planned_start) errs.push("The end date must be on or after the start date.");
    if (f.budget_inr !== "" && (!Number.isInteger(Number(f.budget_inr)) || Number(f.budget_inr) < 0)) errs.push("Budget must be a whole number of rupees, 0 or more.");
    if (f.source_url && !/^https?:\/\//.test(f.source_url)) errs.push("The source link must start with http:// or https://.");
    if (!geometry) errs.push("Choose the location on the map: pick a road or draw a route.");
    setErrors(errs);
    if (errs.length || !geometry) return;
    setBusy(true);
    try {
      const p = await api.createProject({
        title: f.title.trim(), work_type: f.work_type, area: f.area.trim(), contractor: f.contractor.trim() || "To be announced",
        planned_start: f.planned_start, planned_end: f.planned_end, budget_inr: Number(f.budget_inr || 0),
        description: f.description.trim(), geometry, tender_id: f.tender_id.trim() || null,
        source_url: f.source_url.trim() || null, dates_estimated: f.dates_estimated,
      }, conflicts.length > 0);
      setDone(p); setF(BLANK); setGeometry(null); setPickerKey(k => k + 1); onCreated();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflicts(err.body.conflicts); setSuggestion(err.body.suggestion);
        setErrors(["New clashes were found. Review them above, then press the button again to add the project anyway."]);
      } else setErrors([(err as Error).message]);
    } finally { setBusy(false); }
  }

  const joint = suggestion?.type === "joint" && suggestion.start && suggestion.end ? suggestion : null;

  return (
    <form className="ws-form" onSubmit={submit} noValidate>
      {done && <div className="ws-success" role="status"><CheckCircle2 size={18} /><div><strong>{done.id} added.</strong> “{done.title}” is now visible to residents.</div></div>}

      <div className="ws-grid">
        <div className="ws-field span2">

          <label
            className="ws-label"
            htmlFor="f-title"
            style={{ color: "#eaebed" }}
          >
            Project title *
          </label>


          <input id="f-title" className="ws-input" value={f.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Storm drain repair" /></div>
        <div className="ws-field"><label className="ws-label" htmlFor="f-type" style={{ color: "#eaebed" }}>Work type *</label>
          <select id="f-type" className="ws-input" value={f.work_type} onChange={e => set("work_type", e.target.value)}>{WORK_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
        <div className="ws-field"><label className="ws-label" htmlFor="f-area" style={{ color: "#eaebed" }}>Area / locality *</label>
          <input id="f-area" className="ws-input" value={f.area} onChange={e => set("area", e.target.value)} placeholder="e.g. Adyar" /></div>
        <div className="ws-field"><label className="ws-label" htmlFor="f-dept" style={{ color: "#eaebed" }}>Department</label>
          <input id="f-dept" className="ws-input" value={session.department.name} readOnly /></div>
        <div className="ws-field"><label className="ws-label" htmlFor="f-contractor" style={{ color: "#eaebed" }}>Contractor</label>
          <input id="f-contractor" className="ws-input" value={f.contractor} onChange={e => set("contractor", e.target.value)} placeholder="Leave blank if not yet awarded" /></div>
        <div className="ws-field"><label className="ws-label" htmlFor="f-start" style={{ color: "#eaebed" }}>Start date *</label>
          <input id="f-start" type="date" className="ws-input" value={f.planned_start} onChange={e => set("planned_start", e.target.value)} /></div>
        <div className="ws-field"><label className="ws-label" htmlFor="f-end" style={{ color: "#eaebed" }}>End date *</label>
          <input id="f-end" type="date" className="ws-input" value={f.planned_end} onChange={e => set("planned_end", e.target.value)} /></div>
        <label className="ws-check span2"><input type="checkbox" checked={f.dates_estimated} onChange={e => set("dates_estimated", e.target.checked)} /> These dates are estimates (for example, taken from a tender before work begins)</label>
        <div className="ws-field"><label className="ws-label" htmlFor="f-budget" style={{ color: "#eaebed" }}>Budget (₹)</label>
          <input id="f-budget" inputMode="numeric" className="ws-input" value={f.budget_inr} onChange={e => set("budget_inr", e.target.value)} placeholder="e.g. 450000" /></div>
        <div className="ws-field"><label className="ws-label" htmlFor="f-tender" style={{ color: "#eaebed" }}>Tender ID</label>
          <input id="f-tender" className="ws-input" value={f.tender_id} onChange={e => set("tender_id", e.target.value)} placeholder="If from a public tender" /></div>
        <div className="ws-field span2"><label className="ws-label" htmlFor="f-url" style={{ color: "#eaebed" }}>Source link</label>
          <input id="f-url" className="ws-input" value={f.source_url} onChange={e => set("source_url", e.target.value)} placeholder="https://… link to the tender or order" /></div>
        <div className="ws-field span2"><label className="ws-label" htmlFor="f-desc" style={{ color: "#eaebed" }}>Description</label>
          <textarea id="f-desc" className="ws-input" rows={2} value={f.description} onChange={e => set("description", e.target.value)} placeholder="What is being done and why" /></div>
      </div>

      <div className="ws-label" style={{ marginTop: 18 , color: "#eaebed" }}>Location on the map *</div>
      <MapPicker key={pickerKey} roads={roads} projects={projects} value={geometry} onChange={g => setGeometry(g)} />

      {checking && <p className="ws-muted">Checking for clashes with other works…</p>}
      {conflicts.length > 0 && (
        <div className="ws-warn" role="alert">
          <div className="ws-warn-title"><AlertTriangle size={17} /> {conflicts.length} possible clash{conflicts.length > 1 ? "es" : ""} with other works</div>
          <ul>{conflicts.map(c => <li key={c.id}><strong>{c.id}</strong> {c.title} ({c.department}, {fmt(c.planned_start)} to {fmt(c.planned_end)}, {c.status.toLowerCase()}) —{" "}
            {c.kind === "same_stretch" ? "same stretch of road" : "right next to this location"}{c.time_overlap ? ", overlapping dates" : `, ${Math.max(c.gap_days, 0)} days apart`}</li>)}</ul>
          {joint && <div className="ws-warn-actions"><span>Suggestion: run the works together, {fmt(joint.start!)} to {fmt(joint.end!)}, so the road is opened once.</span>
            <button type="button" className="ws-chip" onClick={() => setF(p => ({ ...p, planned_start: joint.start!, planned_end: joint.end! }))}>Use these dates</button></div>}
          {suggestion?.type === "wait" && <p>{suggestion.note}</p>}
          <p className="ws-muted">You can still add the project; the clash will be recorded for human review.</p>
        </div>
      )}

      {errors.length > 0 && <div className="ws-error" role="alert"><ul>{errors.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
      <button className="ws-primary" type="submit" disabled={busy}>{busy ? "Saving…" : conflicts.length ? "Add project anyway" : "Add project"}</button>
    </form>
  );
}
