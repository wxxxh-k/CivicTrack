import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { Project, Road } from "../types";
import { lengthM, nearestOnLine, sliceLine, type Pt } from "../geo";

type Mode = "road" | "trim" | "draw";
const STATUS_COLOR: Record<string, string> = {
  Planned: "#3b82c4", Ongoing: "#e08a00", Delayed: "#c0392b", Completed: "#2d9273", Cancelled: "#8a97a3",
};
const toLL = (g: number[][]): LatLngExpression[] => g.map(([x, y]) => [y, x] as LatLngExpression);

function FitOnce({ points }: { points: number[][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points.map(([x, y]): [number, number] => [y, x]), { padding: [24, 24] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
function Clicks({ onClick }: { onClick: (p: Pt) => void }) {
  useMapEvents({ click(e) { onClick([e.latlng.lng, e.latlng.lat]); } });
  return null;
}

interface Props {
  roads: Road[];
  projects: Project[];
  value: Pt[] | null;
  onChange: (g: Pt[] | null, roadName?: string) => void;
}

export default function MapPicker({ roads, projects, value, onChange }: Props) {
  const [mode, setMode] = useState<Mode>("road");
  const [road, setRoad] = useState<string | null>(null);
  const [trim, setTrim] = useState<Pt[]>([]);
  const [draw, setDraw] = useState<Pt[]>([]);
  const [hint, setHint] = useState("Click a road on the map to select it.");

  const roadGeo = useMemo(() => roads.find(r => r.name === road)?.coordinates as Pt[] | undefined, [roads, road]);
  const allPts = useMemo(() => roads.flatMap(r => r.coordinates), [roads]);

  function reset(m: Mode) {
    setMode(m); setTrim([]); setDraw([]); setRoad(null); onChange(null);
    setHint(m === "road" ? "Click a road on the map to select it." : "Click along the route, one point at a time.");
  }
  function pickRoad(r: Road) {
    setRoad(r.name); setTrim([]); onChange(r.coordinates as Pt[], r.name);
    setHint(`${r.name} selected (whole road). If only part of it is being worked on, choose “Trim to a stretch”.`);
  }
  function onMapClick(p: Pt) {
    if (mode === "draw") {
      const next = [...draw, p]; setDraw(next);
      onChange(next.length >= 2 ? next : null);
      setHint(next.length < 2 ? "Click the next point on the route." : "Keep clicking to extend the route, or use Undo.");
    } else if (mode === "trim" && roadGeo) {
      const near = nearestOnLine(roadGeo, p);
      if (near.dist > 80) { setHint("That click is too far from the selected road. Click closer to the blue line."); return; }
      const pts = [...trim, near.pt];
      if (pts.length === 1) { setTrim(pts); setHint("Now click where the work ends."); return; }
      const g = sliceLine(roadGeo, pts[0], pts[1]);
      setTrim([]); onChange(g, road ?? undefined);
      setHint(`Stretch selected (about ${Math.round(lengthM(g))} m). Click two new points to change it.`);
    }
  }

  return (
    <div className="ws-picker">
      <div className="ws-picker-bar">
        <div className="ws-seg" role="group" aria-label="How to choose the location">
          <button type="button" className={mode !== "draw" ? "on" : ""} onClick={() => reset("road")}>Pick a road</button>
          <button type="button" className={mode === "draw" ? "on" : ""} onClick={() => reset("draw")}>Draw a route</button>
        </div>
        {mode !== "draw" && road && <>
          <button type="button" className="ws-chip" onClick={() => { setMode("trim"); setTrim([]); setHint("Click where the work starts."); }}>Trim to a stretch</button>
          <button type="button" className="ws-chip" onClick={() => { setMode("road"); setTrim([]); if (roadGeo) onChange(roadGeo, road ?? undefined); setHint("Whole road selected."); }}>Use whole road</button>
        </>}
        {mode === "draw" && draw.length > 0 && <button type="button" className="ws-chip" onClick={() => { const n = draw.slice(0, -1); setDraw(n); onChange(n.length >= 2 ? n : null); }}>Undo point</button>}
        {(value || road) && <button type="button" className="ws-chip ghost" onClick={() => reset(mode === "draw" ? "draw" : "road")}>Clear</button>}
      </div>

      <MapContainer center={[13.0, 80.25]} zoom={14} scrollWheelZoom className="ws-map">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitOnce points={allPts} />
        <Clicks onClick={onMapClick} />
        {projects.filter(p => p.geometry && p.geometry.length > 1).map(p => (
          <Polyline key={p.id} positions={toLL(p.geometry!)} interactive={false}
            pathOptions={{ color: STATUS_COLOR[p.status] ?? "#8a97a3", weight: 4, opacity: 0.7 }} />
        ))}
        {roads.map(r => (
          <Polyline key={r.name} positions={toLL(r.coordinates)} interactive={mode === "road"}
            pathOptions={{ color: r.name === road ? "#1d4ed8" : "#64748b", weight: r.name === road ? 6 : 5, opacity: r.name === road ? 0.9 : 0.55 }}
            eventHandlers={mode === "road" ? { click: () => pickRoad(r) } : undefined} />
        ))}
        {value && value.length > 1 && <Polyline positions={toLL(value)} interactive={false} pathOptions={{ color: "#e8590c", weight: 7, opacity: 0.95 }} />}
        {[...trim, ...draw].map((p, i) => <CircleMarker key={i} center={[p[1], p[0]]} radius={6} pathOptions={{ color: "#fff", weight: 2, fillColor: "#e8590c", fillOpacity: 1 }} />)}
      </MapContainer>

      <p className="ws-hint" aria-live="polite">{hint}</p>
      <div className="ws-legend"><span><i style={{ background: "#e8590c" }} /> Selected work area</span><span><i style={{ background: "#64748b" }} /> Roads</span>
        {Object.entries(STATUS_COLOR).slice(0, 4).map(([k, c]) => <span key={k}><i style={{ background: c }} /> {k}</span>)}</div>
      {value && <p className="ws-picked">Selected: about <strong>{Math.round(lengthM(value))} m</strong>{road && mode !== "draw" ? <> on <strong>{road}</strong></> : null}</p>}
    </div>
  );
}
