import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Upload } from "lucide-react";
import { api, type Session } from "../api";
import type { CellValue, ImportPreview, ImportResult, PreviewRow, Road } from "../types";

interface Row extends PreviewRow { include: boolean; }
const effErrors = (r: Row) => r.errors.filter(e => !(e.startsWith("Road") && r.road));
const isReady = (r: Row) => effErrors(r).length === 0 && !!r.geometry;
const money = (v: CellValue) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

function templateCsv(roads: Road[]) {
  const d = (n: number) => { const x = new Date(); x.setDate(x.getDate() + n); return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}/${x.getFullYear()}`; };
  const a = roads[0]?.name ?? "Road name", b = roads[1]?.name ?? roads[0]?.name ?? "Road name";
  return ["Project Name,Road,Start Date,End Date,Work Type,Area,Contractor,Estimated Cost,Tender ID,Source URL,Dates Estimated",
    `Storm drain repair,${a},${d(30)},${d(50)},Drainage,Adyar,ABC Infra,"4,50,000",,,yes`,
    `Road relaying,${b},${d(60)},${d(80)},Road,Velachery,,12 lakh,TN/2026/123,https://example.org/tender,no`].join("\n");
}

export default function CsvImport({ roads, onImported }: { roads: Road[]; session: Session; onImported: () => void }) {
  const [file, setFile] = useState<string>("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function load(f: File | undefined) {
    if (!f) return;
    setErr(""); setResult(null); setPreview(null); setRows([]);
    if (/\.xlsx?$/i.test(f.name)) { setErr("This is an Excel file. In Excel choose File → Save As → “CSV UTF-8”, then upload that file."); return; }
    setBusy(true);
    try {
      const p = await api.importPreview(f);
      setFile(f.name); setPreview(p);
      setRows(p.rows.map(r => ({ ...r, include: r.errors.length === 0 })));
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  function chooseRoad(i: number, name: string) {
    const road = roads.find(r => r.name === name);
    setRows(rs => rs.map((r, k) => k !== i ? r : { ...r, road: road?.name ?? null, geometry: road?.coordinates ?? null,
      values: { ...r.values, road: road?.name ?? r.values.road }, include: !!road && r.errors.every(e => e.startsWith("Road")) }));
  }

  async function commit() {
    const send = rows.filter(r => r.include && isReady(r)).map(r => ({
      title: r.values.title, work_type: r.values.work_type, area: r.values.area, contractor: r.values.contractor,
      planned_start: r.values.planned_start, planned_end: r.values.planned_end, budget_inr: r.values.budget_inr,
      description: r.values.description, tender_id: r.values.tender_id, source_url: r.values.source_url,
      dates_estimated: r.values.dates_estimated, geometry: r.geometry }));
    if (!send.length) return;
    setBusy(true); setErr("");
    try { const res = await api.importCommit(send); setResult(res); setPreview(null); setRows([]); onImported(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([templateCsv(roads)], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "civictrack-template.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const toImport = rows.filter(r => r.include && isReady(r)).length;
  const attention = rows.filter(r => !isReady(r)).length;

  return (
    <div className="ws-csv">
      {!preview && !result && <>
        <label className="ws-drop" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); load(e.dataTransfer.files[0]); }}>
          <Upload size={26} />
          <strong>{busy ? "Reading file…" : "Drop a CSV file here, or click to choose one"}</strong>
          <span>Column names can vary (for example “Project Name”, “Start Date”, “Estimated Cost”). Dates like 25/12/2026 and amounts like 4.5 lakh are understood.</span>
          <input type="file" accept=".csv,text/csv,.txt" onChange={e => { load(e.target.files?.[0]); e.target.value = ""; }} disabled={busy} />
        </label>
        <div className="ws-csv-help">
          <button type="button" className="ws-chip" onClick={download}><Download size={14} /> Download a template</button>
          <span className="ws-muted">Required columns: title, road, start date, end date. Roads must match the road names on the map.</span>
        </div>
      </>}

      {err && <div className="ws-error" role="alert">{err}</div>}
      {preview?.file_errors.map((m, i) => <div className="ws-error" key={i} role="alert">{m}</div>)}

      {preview && rows.length > 0 && <>
        <div className="ws-csv-summary">
          <strong>{file}</strong>
          <span>{rows.length} rows read</span><span className="ok">{toImport} ready to import</span>
          {attention > 0 && <span className="bad">{attention} need attention</span>}
        </div>
        <div className="ws-cols">
          <span className="ws-muted">Columns understood:</span>
          {Object.entries(preview.columns).map(([k, v]) => <span className="ws-chip static" key={k}>{v} → {k.replace("_", " ")}</span>)}
          {preview.unmapped.length > 0 && <span className="ws-muted">Ignored: {preview.unmapped.join(", ")}</span>}
        </div>
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead><tr><th></th><th>Row</th><th>Title</th><th>Road</th><th>Dates</th><th>Budget</th><th>Check</th></tr></thead>
            <tbody>{rows.map((r, i) => {
              const errs = effErrors(r), ready = isReady(r), needRoad = !r.road;
              return <tr key={r.row} className={ready ? "" : "bad"}>
                <td><input type="checkbox" aria-label={`Import row ${r.row}`} checked={r.include && ready} disabled={!ready}
                  onChange={e => setRows(rs => rs.map((x, k) => k === i ? { ...x, include: e.target.checked } : x))} /></td>
                <td>{r.row}</td>
                <td>{String(r.values.title)}<div className="ws-sub">{String(r.values.work_type)} · {String(r.values.area)}</div></td>
                <td>{needRoad
                  ? <select className="ws-input small" value="" onChange={e => chooseRoad(i, e.target.value)} aria-label={`Choose road for row ${r.row}`}>
                      <option value="">Choose road…</option>
                      {[...r.suggestions, ...roads.map(x => x.name).filter(n => !r.suggestions.includes(n))].map(n => <option key={n}>{n}</option>)}
                    </select>
                  : String(r.road)}</td>
                <td>{String(r.values.planned_start)}<div className="ws-sub">to {String(r.values.planned_end)}</div></td>
                <td>{money(r.values.budget_inr)}</td>
                <td>{errs.length ? <ul className="ws-cell-errors">{errs.map((m, k) => <li key={k}>{m}</li>)}</ul>
                  : <span className="ws-ok"><CheckCircle2 size={14} /> Ready</span>}
                  {ready && r.clashes.length > 0 && <div className="ws-sub warn"><AlertTriangle size={12} /> Near {r.clashes.join(", ")}</div>}
                  {r.notes.map((m, k) => <div className="ws-sub" key={k}>{m}</div>)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="ws-actions">
          <button className="ws-primary" onClick={commit} disabled={busy || toImport === 0}>{busy ? "Importing…" : `Import ${toImport} project${toImport === 1 ? "" : "s"}`}</button>
          <button className="ws-chip" onClick={() => { setPreview(null); setRows([]); }}>Choose a different file</button>
        </div>
        <p className="ws-muted">Rows with problems are skipped. Fix them in your spreadsheet and upload again, or choose the road here for rows with an unknown road.</p>
      </>}

      {preview && rows.length === 0 && !preview.file_errors.length && <div className="ws-error">No data rows were found in this file.</div>}
      {preview && rows.length === 0 && <button className="ws-chip" onClick={() => setPreview(null)}>Try another file</button>}

      {result && <div className="ws-result">
        <div className="ws-success"><CheckCircle2 size={18} /><div><strong>{result.created} project{result.created === 1 ? "" : "s"} imported.</strong> They are now visible to residents.{result.rejected > 0 && ` ${result.rejected} could not be saved.`}</div></div>
        {result.warnings.length > 0 && <div className="ws-warn"><div className="ws-warn-title"><AlertTriangle size={16} /> Possible clashes recorded for review</div>
          <ul>{result.warnings.map(w => <li key={w.project}><strong>{w.project}</strong> {w.title} is near {w.clashes_with.join(", ")}</li>)}</ul></div>}
        {result.errors.length > 0 && <div className="ws-error"><ul>{result.errors.map(e => <li key={e.index}>Row {e.index + 1}: {e.errors.join("; ")}</li>)}</ul></div>}
        <button className="ws-chip" onClick={() => setResult(null)}>Import another file</button>
      </div>}
    </div>
  );
}
