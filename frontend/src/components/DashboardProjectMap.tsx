import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import type { Project } from "../types";

interface Props {
  projects: Project[];
  selectedArea: string | null;
  onSelectProject: (project: Project) => void;
  onSelectArea: (area: string) => void;
}

const COLORS: Record<string, string> = {
  Planned: "#3b82c4",
  Ongoing: "#e08a00",
  Delayed: "#c0392b",
  Completed: "#2d9273",
  Cancelled: "#8a97a3",
};

// CivicTrack stores geometry as [longitude, latitude].
// Leaflet expects [latitude, longitude].
function toLatLngs(geometry: number[][]): LatLngExpression[] {
  return geometry
    .filter(
      (point) =>
        point.length >= 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1]) &&
        Math.abs(point[0]) <= 180 &&
        Math.abs(point[1]) <= 90
    )
    .map(([lng, lat]) => [lat, lng] as LatLngExpression);
}

function FitProjects({ projects }: { projects: Project[] }) {
  const map = useMap();

  useEffect(() => {
    const points = projects.flatMap((project) =>
      project.geometry && project.geometry.length > 1
        ? toLatLngs(project.geometry)
        : []
    );

    if (points.length > 0) {
      map.fitBounds(points as LatLngBoundsExpression, {
        padding: [30, 30],
        maxZoom: 14,
      });
    }
  }, [projects, map]);

  return null;
}

export default function DashboardProjectMap({
  projects,
  selectedArea,
  onSelectProject,
  onSelectArea,
}: Props) {
  const locatedProjects = projects.filter(
    (project) =>
      project.geometry &&
      toLatLngs(project.geometry).length > 1
  );

  return (
    <div className="dashboard-real-map">
      <MapContainer
        center={[13.02, 80.22]}
        zoom={12}
        scrollWheelZoom
        className="dashboard-leaflet"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitProjects projects={locatedProjects} />

        {locatedProjects.map((project) => {
          const positions = toLatLngs(project.geometry!);
          const middle = positions[Math.floor(positions.length / 2)];
          const color = COLORS[project.status] ?? "#64748b";
          const isSelected =
            selectedArea?.toLowerCase() === project.area.toLowerCase();

          return (
            <div key={project.id}>
              <Polyline
                positions={positions}
                pathOptions={{
                  color,
                  weight: isSelected ? 7 : 4,
                  opacity: 0.8,
                }}
                eventHandlers={{
                  click: () => {
                    onSelectProject(project);
                    onSelectArea(project.area);
                  },
                }}
              >
                <Tooltip sticky>
                  <strong>{project.title}</strong>
                  <br />
                  {project.area} · {project.status}
                </Tooltip>
              </Polyline>

              <CircleMarker
                center={middle}
                radius={isSelected ? 9 : 7}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 1,
                }}
                eventHandlers={{
                  click: () => {
                    onSelectProject(project);
                    onSelectArea(project.area);
                  },
                }}
              >
                <Tooltip>
                  {project.title} · {project.area}
                </Tooltip>
              </CircleMarker>
            </div>
          );
        })}
      </MapContainer>

      {locatedProjects.length === 0 && (
        <div className="dashboard-map-empty">
          No project routes with valid coordinates are available.
          Import projects with mapped road geometry to display them here.
        </div>
      )}
    </div>
  );
}