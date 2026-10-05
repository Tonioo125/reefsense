import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { CATEGORY_COLORS, formatPercent } from "@/lib/reef";
import type { Reef } from "@/types/reef";

interface ResilienceMapProps {
  reefs: Reef[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Eases the map to the selected reef whenever the selection changes. */
function FlyToSelected({ reef }: { reef: Reef | null }) {
  const map = useMap();
  const reduceMotion = usePrefersReducedMotion();
  useEffect(() => {
    if (reef) {
      map.flyTo([reef.latitude, reef.longitude], Math.max(map.getZoom(), 5), {
        animate: !reduceMotion,
        duration: 0.8,
      });
    }
  }, [reef, map, reduceMotion]);
  return null;
}

export default function ResilienceMap({ reefs, selectedId, onSelect }: ResilienceMapProps) {
  const selected = reefs.find((r) => r.id === selectedId) ?? null;

  return (
    <div
      role="region"
      aria-label="Global map of reef sites by predicted climate resilience"
      className="h-full w-full"
    >
      <MapContainer
        center={[16, 95]}
        zoom={2}
        minZoom={2}
        maxZoom={11}
        worldCopyJump
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Soft halo behind the active marker. */}
        {selected && (
          <CircleMarker
            center={[selected.latitude, selected.longitude]}
            radius={20}
            interactive={false}
            pathOptions={{
              stroke: false,
              fillColor: CATEGORY_COLORS[selected.category].base,
              fillOpacity: 0.18,
            }}
          />
        )}

        {reefs.map((reef) => {
          const isSelected = reef.id === selectedId;
          const color = CATEGORY_COLORS[reef.category].base;
          return (
            <CircleMarker
              key={reef.id}
              center={[reef.latitude, reef.longitude]}
              radius={isSelected ? 10 : 7}
              // Applied once at creation (category never changes for a reef).
              className={`reef-marker reef-marker--${reef.category.toLowerCase()}`}
              pathOptions={{
                color: isSelected ? "#12332a" : "#ffffff",
                weight: isSelected ? 2.5 : 1.5,
                fillColor: color,
                fillOpacity: isSelected ? 1 : 0.9,
              }}
              eventHandlers={{ click: () => onSelect(reef.id) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} className="reef-tooltip">
                {reef.name} · {formatPercent(reef.resilienceProbability)}
              </Tooltip>
            </CircleMarker>
          );
        })}

        <FlyToSelected reef={selected} />
      </MapContainer>
    </div>
  );
}
