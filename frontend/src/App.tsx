import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarDays,
  CheckCircle2, ChevronRight, CircleDollarSign, Clock3, Construction,
  FileText, Filter, MapPin, Menu, Search, ShieldCheck, SlidersHorizontal,
  TrendingUp, X, Layers3, LocateFixed, Waves, Zap, MapPinned
} from "lucide-react";
import type { Conflict, Project, ProjectStatus } from "./types";

const fallbackProjects: Project[] = [
  { id: "CT-001", title: "Lake View Road resurfacing", work_type: "Road", area: "Adyar", department: "Roads & Highways", contractor: "MetroBuild Works", planned_start: "2026-10-01", planned_end: "2026-10-24", status: "Ongoing", progress: 55, budget_inr: 4200000, road_segment_id: "ROAD-ADYAR-01", description: "Resurfacing and footpath repair on the Lake View Road corridor." },
  { id: "CT-002", title: "Lake View Road drainage upgrade", work_type: "Drainage", area: "Adyar", department: "Stormwater Department", contractor: "BlueLine Infra", planned_start: "2026-10-15", planned_end: "2026-11-05", status: "Delayed", progress: 30, budget_inr: 3100000, delay_reason: "Utility relocation is taking longer than planned.", road_segment_id: "ROAD-ADYAR-01", description: "Drainage capacity improvements along the same road corridor." },
  { id: "CT-003", title: "Community water pipeline renewal", work_type: "Water", area: "Velachery", department: "Water Supply Board", contractor: "ClearFlow Projects", planned_start: "2026-09-12", planned_end: "2026-10-12", status: "Completed", progress: 100, budget_inr: 1850000, road_segment_id: "ROAD-VEL-02", description: "Replacement of an aging water pipeline and restoration of the road surface." },
  { id: "CT-004", title: "School Zone footpath repairs", work_type: "Footpath", area: "Guindy", department: "Roads & Highways", contractor: "SafeStreet Civil", planned_start: "2026-10-20", planned_end: "2026-11-08", status: "Planned", progress: 0, budget_inr: 1250000, road_segment_id: "ROAD-GUI-04", description: "Footpath repairs and accessibility improvements near a school zone." },
  { id: "CT-005", title: "Market Street resurfacing", work_type: "Road", area: "T. Nagar", department: "Roads & Highways", contractor: "MetroBuild Works", planned_start: "2026-10-08", planned_end: "2026-10-29", status: "Ongoing", progress: 68, budget_inr: 2750000, road_segment_id: "ROAD-TN-03", description: "Road surface repairs and repainting of pedestrian crossings." },
];
const fallbackConflicts: Conflict[] = [{
  id: "CT-001-CT-002", project_a: "CT-001", project_a_title: "Lake View Road resurfacing", project_b: "CT-002",
  project_b_title: "Lake View Road drainage upgrade", area: "Adyar", road_segment_id: "ROAD-ADYAR-01",
  overlap_start: "2026-10-15", overlap_end: "2026-10-24",
  message: "These projects are scheduled on the same road segment during overlapping dates. Review the schedules together."
}];

const fmtMoney = (amount: number) => amount >= 10000000
  ? `₹${(amount / 10000000).toFixed(2)} Cr`
  : amount >= 100000 ? `₹${(amount / 100000).toFixed(1)} L` : `₹${amount.toLocaleString("en-IN")}`;
const fmtDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function StatusPill({ status }: { status: ProjectStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}><span className="status-dot" />{status}</span>;
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>(fallbackProjects);
  const [conflicts, setConflicts] = useState<Conflict[]>(fallbackConflicts);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<Project | null>(null);
  const [tab, setTab] = useState<"projects" | "coordination">("projects");
  const [mobileNav, setMobileNav] = useState(false);
  const [apiLive, setApiLive] = useState(false);
  const [selectedMapArea, setSelectedMapArea] = useState("Adyar");

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then(r => { if (!r.ok) throw new Error("API"); return r.json(); }),
      fetch("/api/conflicts").then(r => { if (!r.ok) throw new Error("API"); return r.json(); })
    ]).then(([p, c]) => {
      setProjects(p); setConflicts(c); setApiLive(true);
    }).catch(() => { /* Keep built-in demo data available if the API is not running. */ });
  }, []);

  const filtered = useMemo(() => projects.filter(p => {
    const text = `${p.title} ${p.area} ${p.department} ${p.contractor} ${p.work_type}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "All" || p.status === status);
  }), [projects, query, status]);

  const stats = [
    { label: "Total projects", value: projects.length.toString(), note: "Across demo neighbourhoods", icon: Construction, tone: "blue" },
    { label: "Ongoing works", value: projects.filter(p => p.status === "Ongoing").length.toString(), note: "Currently in progress", icon: Activity, tone: "purple" },
    { label: "Delayed projects", value: projects.filter(p => p.status === "Delayed").length.toString(), note: "Need closer monitoring", icon: Clock3, tone: "orange" },
    { label: "Completed", value: projects.filter(p => p.status === "Completed").length.toString(), note: "Marked as finished", icon: CheckCircle2, tone: "green" },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Construction size={22} strokeWidth={2.4} /></div>
          <div><div className="brand-name">civictrack<span>.</span></div><div className="brand-subtitle">PUBLIC WORKS, IN THE OPEN</div></div>
          <button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <button className="nav-item active" onClick={() => { setTab("projects"); setMobileNav(false); }}><Activity size={18} />Overview</button>
        <button className={`nav-item ${tab === "projects" ? "subtle-active" : ""}`} onClick={() => { setTab("projects"); setMobileNav(false); }}><FileText size={18} />Public projects<span className="nav-count">{projects.length}</span></button>
        <button className={`nav-item ${tab === "coordination" ? "subtle-active" : ""}`} onClick={() => { setTab("coordination"); setMobileNav(false); }}><AlertTriangle size={18} />Coordination alerts{conflicts.length > 0 && <span className="nav-count alert-count">{conflicts.length}</span>}</button>
        <div className="sidebar-bottom">
          <div className="transparency-card">
            <div className="transparency-icon"><ShieldCheck size={19} /></div>
            <strong>Built for public trust</strong>
            <p>Clear project details help residents understand what is happening in their neighbourhood.</p>
          </div>
          <div className="sidebar-footer"><span className="online-dot" />Demo environment <span className="version">v0.1</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="breadcrumb">Workspace <ChevronRight size={14} /> <strong>{tab === "coordination" ? "Coordination alerts" : "Overview"}</strong></div>
          <div className="topbar-right"><span className={`api-indicator ${apiLive ? "api-live" : ""}`}><span /> {apiLive ? "API connected" : "Demo preview"}</span><div className="avatar">CT</div></div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> CIVIC INFRASTRUCTURE MONITOR</div>
              <h1>{tab === "coordination" ? "Coordination alerts" : "Public works overview"}</h1>
              <p className="page-description">{tab === "coordination" ? "Spot scheduling overlaps early and give departments a chance to coordinate." : "A clearer view of the infrastructure projects shaping your neighbourhood."}</p>
            </div>
            <div className="demo-badge"><span /> FICTIONAL DEMO DATA</div>
          </div>

          <div className="signal-ribbon" aria-label="CivicTrack dashboard highlights">
            <div className="signal-ribbon-track">
              <span className="signal-ribbon-label"><span className="signal-star">✦</span> CIVICTRACK SIGNALS</span>
              <span><i className="signal-mini-dot mint" /> Live-ready project overview</span>
              <span><i className="signal-mini-dot lilac" /> Cross-department coordination</span>
              <span><i className="signal-mini-dot peach" /> Transparent public reporting</span>
              <span><i className="signal-mini-dot blue" /> Neighbourhood-level insights</span>
              <span className="signal-ribbon-label ribbon-repeat"><span className="signal-star">✦</span> CIVICTRACK SIGNALS</span>
              <span><i className="signal-mini-dot mint" /> Live-ready project overview</span>
              <span><i className="signal-mini-dot lilac" /> Cross-department coordination</span>
              <span><i className="signal-mini-dot peach" /> Transparent public reporting</span>
              <span><i className="signal-mini-dot blue" /> Neighbourhood-level insights</span>
            </div>
          </div>

          {tab === "projects" ? <>
            <section className="stats-grid">
              {stats.map((s, i) => <div className="stat-card" key={s.label}>
                <div className="stat-top"><span className="stat-label">{s.label}</span><span className={`stat-icon ${s.tone}`}><s.icon size={19} /></span></div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-note">{s.note}</div>
                {i === 2 && <span className="stat-decoration"><ArrowUpRight size={15} /></span>}
              </div>)}
            </section>

            <section className="insight-banner">
              <div className="insight-symbol"><AlertTriangle size={21} /></div>
              <div className="insight-copy"><strong>{conflicts.length} potential scheduling {conflicts.length === 1 ? "conflict" : "conflicts"} detected</strong><span>Some works may overlap on the same road. Reviewing these schedules together could reduce repeated disruption.</span></div>
              <button className="text-button" onClick={() => setTab("coordination")}>Review alerts <ChevronRight size={16} /></button>
            </section>

            <section className="command-grid">
              <article className="map-panel">
                <div className="command-panel-heading">
                  <div><span className="panel-kicker"><span className="live-pulse" /> SPATIAL INTELLIGENCE</span><h2>Infrastructure watch</h2><p>Explore demo work zones and shared corridors.</p></div>
                  <span className="map-chip"><MapPinned size={14} /> Chennai region</span>
                </div>
                <div className="city-map">
                  <div className="map-grid-lines" />
                  <svg className="map-streets" viewBox="0 0 700 340" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M-30 70 C120 115 155 30 270 85 S470 170 730 80" />
                    <path d="M-20 260 C140 190 215 305 350 225 S545 155 730 260" />
                    <path d="M90 -20 C150 85 105 160 210 365" />
                    <path d="M325 -20 C275 80 390 155 335 365" />
                    <path d="M555 -20 C480 85 590 205 520 365" />
                    <path className="street-highlight" d="M-20 165 C120 125 210 205 345 150 S555 120 730 175" />
                    <path className="waterway" d="M0 310 C130 265 170 330 280 285 S490 260 700 300" />
                  </svg>
                  <div className="map-zone zone-one"><span>ADYAR</span></div>
                  <div className="map-zone zone-two"><span>VELACHERY</span></div>
                  <div className="map-zone zone-three"><span>GUINDY</span></div>
                  <button className={`map-marker marker-adyar ${selectedMapArea === "Adyar" ? "marker-selected" : ""}`} onClick={() => setSelectedMapArea("Adyar")} aria-label="Select Adyar work zone"><span className="marker-ring" /><span className="marker-core" /><span className="marker-tooltip">Adyar · 2 works</span></button>
                  <button className={`map-marker marker-velachery ${selectedMapArea === "Velachery" ? "marker-selected" : ""}`} onClick={() => setSelectedMapArea("Velachery")} aria-label="Select Velachery work zone"><span className="marker-ring" /><span className="marker-core" /><span className="marker-tooltip">Velachery · 1 work</span></button>
                  <button className={`map-marker marker-guindy ${selectedMapArea === "Guindy" ? "marker-selected" : ""}`} onClick={() => setSelectedMapArea("Guindy")} aria-label="Select Guindy work zone"><span className="marker-ring" /><span className="marker-core" /><span className="marker-tooltip">Guindy · 1 work</span></button>
                  <button className={`map-marker marker-tnagar ${selectedMapArea === "T. Nagar" ? "marker-selected" : ""}`} onClick={() => setSelectedMapArea("T. Nagar")} aria-label="Select T Nagar work zone"><span className="marker-ring" /><span className="marker-core" /><span className="marker-tooltip">T. Nagar · 1 work</span></button>
                  <div className="map-scale"><span /> DEMO MAP · NOT FOR NAVIGATION</div>
                  <div className="map-legend"><span><i className="legend-dot risk" />Conflict risk</span><span><i className="legend-dot active" />Active work</span><span><i className="legend-dot done" />Completed</span></div>
                  <div className="map-crosshair"><LocateFixed size={17} /></div>
                </div>
                <div className="map-selected-row">
                  <div className="selected-area-icon"><Layers3 size={17} /></div>
                  <div className="selected-area-copy"><span>SELECTED ZONE</span><strong>{selectedMapArea}</strong></div>
                  <div className="selected-area-count"><strong>{projects.filter(p => p.area === selectedMapArea).length}</strong><span>demo works</span></div>
                  <button className="map-view-button" onClick={() => { setQuery(selectedMapArea); setTab("projects"); }}>Explore zone <ChevronRight size={15} /></button>
                </div>
              </article>
              <article className="intel-panel">
                <div className="command-panel-heading"><div><span className="panel-kicker">SYSTEM INTELLIGENCE</span><h2>At a glance</h2><p>Signals calculated from current records.</p></div><div className="intel-icon"><Zap size={18} /></div></div>
                <div className="intel-risk-card">
                  <div className="risk-top"><span>COORDINATION RISK</span><span className="risk-badge"><span /> REVIEW</span></div>
                  <div className="risk-number">{conflicts.length.toString().padStart(2, "0")}<span> flagged overlap{conflicts.length === 1 ? "" : "s"}</span></div>
                  <p>{conflicts.length ? "Two work packages may affect the same corridor during overlapping dates." : "No schedule overlaps are flagged in the current records."}</p>
                  <button onClick={() => setTab("coordination")}>Inspect risk signal <ChevronRight size={15} /></button>
                </div>
                <div className="status-breakdown"><div className="breakdown-heading"><strong>Portfolio status</strong><span>{projects.length} records</span></div>
                  {(["Ongoing", "Planned", "Delayed", "Completed"] as ProjectStatus[]).map(s => {
                    const count = projects.filter(p => p.status === s).length;
                    const pct = projects.length ? (count / projects.length) * 100 : 0;
                    return <div className="breakdown-row" key={s}><div className="breakdown-label"><span className={`breakdown-dot dot-${s.toLowerCase()}`} />{s}<strong>{count}</strong></div><div className="breakdown-track"><span className={`breakdown-fill fill-${s.toLowerCase()}`} style={{ width: `${pct}%` }} /></div></div>;
                  })}
                </div>
                <div className="intel-footnote"><ShieldCheck size={15} /><span>Illustrative insights from demo records. Verify with departments before acting.</span></div>
              </article>
            </section>

            <section className="projects-section">
              <div className="section-heading">
                <div><h2>Projects in your area</h2><p>Explore budgets, timelines and delivery status.</p></div>
                <span className="results-count">{filtered.length} projects</span>
              </div>
              <div className="filters-bar">
                <div className="search-box"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects, areas, departments..." aria-label="Search projects" />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}</div>
                <div className="filter-select"><SlidersHorizontal size={16} /><select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status"><option>All</option><option>Planned</option><option>Ongoing</option><option>Delayed</option><option>Completed</option></select></div>
              </div>
              <div className="project-grid">
                {filtered.map((p, i) => <article className="project-card" key={p.id} style={{ animationDelay: `${i * 45}ms` }}>
                  <div className={`project-art art-${p.work_type.toLowerCase()}`}>
                    <div className="art-grid" />
                    <span className="project-type">{p.work_type} works</span>
                    <span className="project-id">{p.id}</span>
                    <div className="art-illustration"><div className="art-sun" /><div className="art-hill hill-back" /><div className="art-hill hill-front" /><div className="art-road"><span /><span /><span /></div><div className="art-cone cone-one" /><div className="art-cone cone-two" /></div>
                  </div>
                  <div className="project-card-body">
                    <div className="card-title-row"><h3>{p.title}</h3><StatusPill status={p.status} /></div>
                    <div className="project-location"><MapPin size={14} />{p.area}<span className="location-separator">·</span>{p.department}</div>
                    <p className="project-description">{p.description}</p>
                    <div className="progress-heading"><span>Reported progress</span><strong>{p.progress}%</strong></div>
                    <div className="progress-track"><div className={`progress-fill ${p.status === "Delayed" ? "progress-delayed" : ""}`} style={{ width: `${p.progress}%` }} /></div>
                    <div className="card-meta">
                      <div><span className="meta-label"><CircleDollarSign size={13} /> Budget</span><strong>{fmtMoney(p.budget_inr)}</strong></div>
                      <div><span className="meta-label"><CalendarDays size={13} /> Target finish</span><strong>{fmtDate(p.planned_end)}</strong></div>
                    </div>
                    {p.status === "Delayed" && p.delay_reason && <div className="delay-note"><AlertTriangle size={14} /><span>{p.delay_reason}</span></div>}
                    <button className="details-button" onClick={() => setSelected(p)}>View project details <ChevronRight size={16} /></button>
                  </div>
                </article>)}
              </div>
              {filtered.length === 0 && <div className="empty-state"><Search size={26} /><strong>No projects found</strong><span>Try a different search or status filter.</span><button onClick={() => { setQuery(""); setStatus("All"); }}>Clear filters</button></div>}
            </section>
          </> : <section className="alerts-section">
            <div className="alert-intro"><div className="alert-intro-icon"><AlertTriangle size={22} /></div><div><h2>Potential schedule overlaps</h2><p>These are coordination suggestions, not confirmed service disruptions. A department should review each alert.</p></div></div>
            {conflicts.length ? conflicts.map(c => <article className="conflict-card" key={c.id}>
              <div className="conflict-card-top"><span className="conflict-label"><AlertTriangle size={14} /> REVIEW SUGGESTED</span><span className="conflict-area"><MapPin size={14} />{c.area}</span></div>
              <div className="conflict-projects"><div className="conflict-project"><span className="conflict-project-id">{c.project_a}</span><strong>{c.project_a_title}</strong></div><div className="conflict-link"><span /><span /><span /></div><div className="conflict-project"><span className="conflict-project-id">{c.project_b}</span><strong>{c.project_b_title}</strong></div></div>
              <div className="conflict-details"><div><span>Overlapping dates</span><strong>{fmtDate(c.overlap_start)} – {fmtDate(c.overlap_end)}</strong></div><div><span>Shared road segment</span><strong>{c.road_segment_id}</strong></div></div>
              <p className="conflict-explanation">{c.message}</p>
              <div className="conflict-footer"><span><ShieldCheck size={15} /> Human review required</span><button onClick={() => { const p = projects.find(x => x.id === c.project_a); if (p) setSelected(p); }}>Inspect project <ChevronRight size={15} /></button></div>
            </article>) : <div className="empty-state"><CheckCircle2 size={28} /><strong>No overlaps found</strong><span>There are no matching schedule overlaps in the current demo records.</span></div>}
            <div className="method-note"><strong>How this works</strong><p>The starter detector compares projects that use the same road-segment ID and checks whether their planned date ranges overlap. A future PostGIS version can also detect partial geographic overlap and nearby works.</p></div>
          </section>}

          <footer className="page-footer"><span>© 2026 CivicTrack · Student hackathon prototype</span><span><ShieldCheck size={14} /> Transparency by design</span></footer>
        </div>
      </main>

      {selected && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}>
        <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-top"><span className="modal-kicker">PROJECT PROFILE · {selected.id}</span><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close project details"><X size={19} /></button></div>
          <div className="modal-title-row"><div><h2 id="modal-title">{selected.title}</h2><p><MapPin size={15} />{selected.area} · {selected.work_type} works</p></div><StatusPill status={selected.status} /></div>
          <p className="modal-description">{selected.description}</p>
          <div className="modal-progress"><div><span>Reported completion</span><strong>{selected.progress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${selected.progress}%` }} /></div></div>
          <div className="detail-grid">
            <div><span>Responsible department</span><strong>{selected.department}</strong></div>
            <div><span>Contractor</span><strong>{selected.contractor}</strong></div>
            <div><span>Approved demo budget</span><strong>{fmtMoney(selected.budget_inr)}</strong></div>
            <div><span>Planned start</span><strong>{fmtDate(selected.planned_start)}</strong></div>
            <div><span>Target completion</span><strong>{fmtDate(selected.planned_end)}</strong></div>
            <div><span>Road segment</span><strong>{selected.road_segment_id}</strong></div>
          </div>
          {selected.delay_reason && <div className="modal-delay"><AlertTriangle size={17} /><div><strong>Reported delay reason</strong><p>{selected.delay_reason}</p></div></div>}
          <div className="modal-disclaimer"><ShieldCheck size={17} /><p>These are fictional demonstration records, not official public works data. Progress and budget figures are illustrative.</p></div>
          <button className="modal-done" onClick={() => setSelected(null)}>Close details</button>
        </section>
      </div>}
    </div>
  );
}
