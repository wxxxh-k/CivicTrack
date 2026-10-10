import DashboardProjectMap from "./components/DashboardProjectMap";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarDays,
  CheckCircle2, ChevronRight, CircleDollarSign, Clock3, Construction,
  FileText, Filter, MapPin, Menu, Search, ShieldCheck, SlidersHorizontal,
  TrendingUp, X, Layers3, LocateFixed, Waves, Zap, MapPinned, LogIn, LogOut, Building2
} from "lucide-react";
import type { Conflict, Project, ProjectStatus } from "./types";
import { api, getSession, saveSession, type Session } from "./api";
import SignInModal from "./components/SignInModal";
import Workspace from "./components/Workspace";

const fmtMoney = (amount: number) => amount >= 10000000
  ? `₹${(amount / 10000000).toFixed(2)} Cr`
  : amount >= 100000 ? `₹${(amount / 100000).toFixed(1)} L` : `₹${amount.toLocaleString("en-IN")}`;
const sourceLabel = (s?: string) => s === "official" ? "Department entry" : s === "import" ? "Department CSV import" : "Fictional demo record";
const fmtDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function StatusPill({ status }: { status: ProjectStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}><span className="status-dot" />{status}</span>;
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<Project | null>(null);
  const [tab, setTab] = useState<"projects" | "coordination" | "workspace">("projects");
  const [mobileNav, setMobileNav] = useState(false);
  const [apiLive, setApiLive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selectedMapArea, setSelectedMapArea] = useState("");
  const [session, setSession] = useState<Session | null>(getSession());
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    const h = () => setSession(getSession());
    window.addEventListener("ct-session", h);
    return () => window.removeEventListener("ct-session", h);
  }, []);
  useEffect(() => {
    if (!projects.length || projects.some(p => p.area.toLowerCase() === selectedMapArea.toLowerCase())) return;
    const counts = new Map<string, number>();
    projects.forEach(p => counts.set(p.area, (counts.get(p.area) ?? 0) + 1));
    setSelectedMapArea([...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }, [projects, selectedMapArea]);
  const signOut = () => { saveSession(null); if (tab === "workspace") setTab("projects"); };

  const refresh = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api.projects(),
        api.conflicts(),
      ]);
      
      setProjects(p);
      setConflicts(c);
      setApiLive(true);
      setLoaded(true);
    } catch (error) {
      setApiLive(false);
      setLoaded(true);
      console.error("Failed to refresh CivicTrack data:", error);
    }
  }, []);

  useEffect(() => {
        void refresh();
      }, [refresh]);

  const filtered = useMemo(() => projects.filter(p => {
    const text = `${p.title} ${p.area} ${p.department} ${p.contractor} ${p.work_type}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "All" || p.status === status);
  }), [projects, query, status]);

  const stats = [
    { label: "Total projects", value: projects.length.toString(), note: `Across ${new Set(projects.map(p => p.area)).size} areas`, icon: Construction, tone: "blue" },
    { label: "Ongoing works", value: projects.filter(p => p.status === "Ongoing").length.toString(), note: "Currently in progress", icon: Activity, tone: "purple" },
    { label: "Delayed projects", value: projects.filter(p => p.status === "Delayed").length.toString(), note: "Need closer monitoring", icon: Clock3, tone: "orange" },
    { label: "Completed", value: projects.filter(p => p.status === "Completed").length.toString(), note: "Marked as finished", icon: CheckCircle2, tone: "green" },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Construction size={22} strokeWidth={2.4} /></div>
          <div><div className="brand-name" style={{ color: "#f31800" }}>civictrack<span></span></div><div className="brand-subtitle" style={{ color: "#135def" }}>PUBLIC WORKS, IN THE OPEN</div></div>
          <button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="nav-label" style={{ color: "#020d22" }}>WORKSPACE</div>
        <button className="nav-item active" onClick={() => { setTab("projects"); setMobileNav(false); }}><Activity size={18} />Overview</button>
        <button className={`nav-item ${tab === "projects" ? "subtle-active" : ""}`} onClick={() => { setTab("projects"); setMobileNav(false); }}><FileText size={18} />Public projects<span className="nav-count">{projects.length}</span></button>
        <button className={`nav-item ${tab === "coordination" ? "subtle-active" : ""}`} onClick={() => { setTab("coordination"); setMobileNav(false); }}><AlertTriangle size={18} />Coordination alerts{conflicts.length > 0 && <span className="nav-count alert-count">{conflicts.length}</span>}</button>
        {session && <button className={`nav-item ${tab === "workspace" ? "subtle-active" : ""}`} onClick={() => { setTab("workspace"); setMobileNav(false); }}><Building2 size={18} />Department workspace</button>}
        <div className="sidebar-bottom" style={{ color: "#06ff66" }}>
          <div className="transparency-card">
            <div className="transparency-icon"><ShieldCheck size={19} /></div>
            <strong>Built for public trust</strong>
            <p style={{ color: "#135def" }}>Clear project details help residents understand what is happening in their neighbourhood.</p>
          </div>
          <div className="sidebar-footer"><span className="online-dot" />Public works tracker <span className="version">v0.2</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="breadcrumb">Workspace <ChevronRight size={14} /> <strong>{tab === "coordination" ? "Coordination alerts" : tab === "workspace" ? "Department workspace" : "Overview"}</strong></div>
          <div className="topbar-right"><span className={`api-indicator ${apiLive ? "api-live" : ""}`}><span /> {!loaded ? "Connecting…" : apiLive ? "Connected to database" : "Server offline"}</span>{session
            ? <><span className="ws-who"><Building2 size={14} />{session.department.name}</span><button className="ws-link" onClick={signOut}><LogOut size={14} />Sign out</button></>
            : <button className="ws-signin" onClick={() => setShowSignIn(true)}><LogIn size={15} />Department sign-in</button>}</div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> CIVIC INFRASTRUCTURE MONITOR</div>
              <h1>{tab === "coordination" ? "Coordination alerts" : tab === "workspace" ? "Department workspace" : "Public works overview"}</h1>
              <p className="page-description">{tab === "coordination" ? "Spot scheduling overlaps early and give departments a chance to coordinate." : tab === "workspace" ? "Add a project on the map or import many from a CSV file." : "A clearer view of the infrastructure projects shaping your neighbourhood."}</p>
            </div>
            {/* <div className="demo-badge"><span /> {projects.some(p => p.source === "demo" || p.source === undefined) ? "INCLUDES FICTIONAL DEMO DATA" : "DEPARTMENT-SUBMITTED DATA"}</div> */}
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

          {loaded && !apiLive && <div className="ws-error" role="alert">Cannot reach the server, so no live records can be shown. Start the backend (uvicorn) and refresh the page.</div>}
          {tab === "workspace" ? (session
            ? <Workspace session={session} projects={projects} onChanged={refresh} />
            : <section className="ws-card"><h2>Department sign-in required</h2><p className="ws-muted">Only a signed-in department can add or import project details.</p><button className="ws-primary" onClick={() => setShowSignIn(true)}>Department sign-in</button></section>
          ) : tab === "projects" ? <>
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
                <button
                  className="text-button text-sm px-4 py-2"
                  onClick={() => setTab("coordination")}
                >
                  Review alerts <ChevronRight size={16} />
                </button>            </section>

            <section className="command-grid">
              <article className="map-panel">
                <div className="command-panel-heading">
                  <div><span className="panel-kicker"><span className="live-pulse" /> SPATIAL INTELLIGENCE</span><h2>Infrastructure watch</h2><p>Explore work zones and shared corridors.</p></div>
                  <span className="map-chip"><MapPinned size={14} /> Chennai region</span>
                </div>
                  <DashboardProjectMap
                    projects={projects}
                    selectedArea={selectedMapArea}
                    onSelectProject={setSelected}
                    onSelectArea={setSelectedMapArea}
                  />
                <div className="map-selected-row">
                  <div className="selected-area-icon"><Layers3 size={17} /></div>
                  <div className="selected-area-copy"><span>SELECTED ZONE</span><strong>{selectedMapArea || "No projects yet"}</strong></div>
                  <div className="selected-area-count">
                    <strong>
                      {projects.filter(
                        p => p.area.toLowerCase() === selectedMapArea.toLowerCase()
                      ).length}
                    </strong>
                    <span>projects</span>
                  </div>
                  <button className="map-view-button" onClick={() => { setQuery(selectedMapArea); setTab("projects"); }}>Explore zone <ChevronRight size={15} /></button>
                </div>
              </article>
              <article className="intel-panel">
                <div className="command-panel-heading"><div><span className="panel-kicker">SYSTEM INTELLIGENCE</span><h2>At a glance</h2><p>Signals calculated from current records.</p></div><div className="intel-icon"><Zap size={18} /></div></div>
                <div className="intel-risk-card">
                  <div className="risk-top"><span>COORDINATION RISK</span><span className="risk-badge"><span /> {conflicts.length ? "REVIEW" : "CLEAR"}</span></div>
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
                <div className="intel-footnote"><ShieldCheck size={15} /><span>Calculated from {projects.length} records in the database.{projects.some(p => p.source === "demo") ? " Some are fictional demo records." : ""} Verify with departments before acting.</span></div>
              </article>
            </section>

            <section className="projects-section">
              <div className="section-heading">
                  <div ><h2 style={{ color: "#eaebed" }}>Projects in your area</h2 ><p style={{ color: "#eaebed" }}>Explore budgets, timelines and delivery status.</p></div>
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
              {filtered.length === 0 && <div className="empty-state"><Search size={26} /><strong>{projects.length === 0 ? "No projects yet" : "No projects found"}</strong><span>{projects.length === 0 ? (loaded && !apiLive ? "The server is not reachable. Start the backend and refresh." : "A signed-in department can add a project or import a CSV file.") : "Try a different search or status filter."}</span>{projects.length > 0 && <button onClick={() => { setQuery(""); setStatus("All"); }}>Clear filters</button>}</div>}
            </section>
          </> : <section className="alerts-section">
            <div className="alert-intro"><div className="alert-intro-icon"><AlertTriangle size={22} /></div><div><h2>Potential schedule overlaps</h2><p>These are coordination suggestions, not confirmed service disruptions. A department should review each alert.</p></div></div>
            {conflicts.length ? conflicts.map(c => <article className="conflict-card" key={c.id}>
              <div className="conflict-card-top"><span className="conflict-label"><AlertTriangle size={14} /> REVIEW SUGGESTED</span><span className="conflict-area"><MapPin size={14} />{c.area}</span></div>
              <div className="conflict-projects"><div className="conflict-project"><span className="conflict-project-id">{c.project_a}</span><strong>{c.project_a_title}</strong></div><div className="conflict-link"><span /><span /><span /></div><div className="conflict-project"><span className="conflict-project-id">{c.project_b}</span><strong>{c.project_b_title}</strong></div></div>
              <div className="conflict-details"><div><span>{c.overlap_start ? "Overlapping dates" : "Schedule gap"}</span><strong>{c.overlap_start && c.overlap_end ? `${fmtDate(c.overlap_start)} – ${fmtDate(c.overlap_end)}` : `${Math.max(c.gap_days ?? 0, 0)} days apart`}</strong></div><div><span>Location relationship</span><strong>{c.kind === "nearby" ? "Right next to each other" : c.kind === "same_stretch" ? `Same stretch${c.shared_m ? ` (about ${c.shared_m} m)` : ""}` : (c.road_segment_id ?? "Same road")}</strong></div></div>
              <p className="conflict-explanation">{c.message}</p>
              <div className="conflict-footer"><span><ShieldCheck size={15} /> Human review required</span><button onClick={() => { const p = projects.find(x => x.id === c.project_a); if (p) setSelected(p); }}>Inspect project <ChevronRight size={15} /></button></div>
            </article>) : <div className="empty-state"><CheckCircle2 size={28} /><strong>No overlaps found</strong><span>There are no matching schedule overlaps in the current records.</span></div>}
            <div className="method-note"><strong>How this works</strong><p>Each project stores its route as map coordinates. The detector compares routes and flags works on the same stretch of road, or right next to each other, when their dates are within 120 days. It also notices recently finished work. A person should review every alert.</p></div>
          </section>}

          <footer className="page-footer" style={{ color: "#eaebed" }}><span>© 2026 CivicTech </span><span><ShieldCheck size={14} /> Transparency by design</span></footer>
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
            <div><span>Budget</span><strong>{fmtMoney(selected.budget_inr)}</strong></div>
            <div><span>Planned start</span><strong>{fmtDate(selected.planned_start)}</strong></div>
            <div><span>Target completion</span><strong>{fmtDate(selected.planned_end)}{selected.dates_estimated ? " (estimated)" : ""}</strong></div>
            <div><span>Record source</span><strong>{sourceLabel(selected.source)}</strong></div>
            {selected.tender_id && <div><span>Tender ID</span><strong>{selected.source_url ? <a href={selected.source_url} target="_blank" rel="noreferrer">{selected.tender_id}</a> : selected.tender_id}</strong></div>}
          </div>
          {selected.delay_reason && <div className="modal-delay"><AlertTriangle size={17} /><div><strong>Reported delay reason</strong><p>{selected.delay_reason}</p></div></div>}
          <div className="modal-disclaimer"><ShieldCheck size={17} /><p>{selected.source === "official" || selected.source === "import" ? "This record was entered by the responsible department. Progress is as reported by them." : "This is a fictional demonstration record, not official public works data. Progress and budget figures are illustrative."}</p></div>
          <button className="modal-done" onClick={() => setSelected(null)}>Close details</button>
        </section>
      </div>}
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} onSignedIn={() => { setShowSignIn(false); setTab("workspace"); }} />}
    </div>
  );
}
