import { memo, useCallback, useEffect, useState } from "react";
import type { CircleMarker as LeafletCircleMarker, LeafletMouseEvent } from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { reefAreaTileUrl } from "@/api/client";
import HeatScenario from "@/components/HeatScenario";
import ReefHoverCard from "@/components/ReefHoverCard";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { CATEGORY_COLORS, REEF_AREA_ATTRIBUTION, REEF_AREA_BOUNDS, coralCoverColor } from "@/lib/reef";
import type { MapColorBy, Reef } from "@/types/reef";

interface ResilienceMapProps {
  reefs: Reef[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  colorBy?: MapColorBy;
  /** Draw the mapped coral reef extent (UNEP-WCMC) beneath the markers. */
  showReefArea?: boolean;
  /** Emphasise reefs flagged as missed by current NOAA alerts and fade the rest. */
  highlightGaps?: boolean;
}

const RADIUS = 7;
const SELECTED_RADIUS = 10;
const HOVER_GROWTH = 3;

function markerColor(reef: Reef, colorBy: MapColorBy) {
  return colorBy === "coral"
    ? coralCoverColor(reef.metrics.coralCover)
    : CATEGORY_COLORS[reef.category].base;
}

const GAP_RING = "#7a1f14";

function markerStyle(reef: Reef, colorBy: MapColorBy, selected: boolean, highlightGaps: boolean) {
  const fillColor = markerColor(reef, colorBy);
  if (selected) return { color: "#12332a", weight: 2.5, fillColor, fillOpacity: 1 };
  if (highlightGaps && reef.noaaGap) return { color: GAP_RING, weight: 2.5, fillColor, fillOpacity: 1 };
  if (highlightGaps) return { color: "#ffffff", weight: 0.5, fillColor, fillOpacity: 0.18 };
  return { color: "#ffffff", weight: 1.5, fillColor, fillOpacity: 0.9 };
}

function markerRadius(reef: Reef, selected: boolean, highlightGaps: boolean) {
  if (selected) return SELECTED_RADIUS;
  if (highlightGaps) return reef.noaaGap ? RADIUS + 1 : RADIUS - 2;
  return RADIUS;
}

/** Click on open water: a model scenario for that point at an assumed heat stress. */
function ProbeLayer() {
  const [probe, setProbe] = useState<{ lat: number; lng: number } | null>(null);
  useMapEvents({
    click(e) {
      const p = e.latlng.wrap();
      setProbe({ lat: p.lat, lng: p.lng });
    },
  });
  if (!probe) return null;
  return (
    <Popup
      position={[probe.lat, probe.lng]}
      minWidth={248}
      maxWidth={260}
      eventHandlers={{ remove: () => setProbe(null) }}
    >
      <div className="w-[15rem] font-sans">
        <p className="text-[11px] font-medium uppercase tracking-wide text-brand">Scenario at this point</p>
        <p className="mb-3 mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          {probe.lat.toFixed(3)}°, {probe.lng.toFixed(3)}°
        </p>
        <HeatScenario
          key={`${probe.lat},${probe.lng}`}
          latitude={probe.lat}
          longitude={probe.lng}
          initialDhw={4}
          mode="assumed"
          compact
        />
      </div>
    </Popup>
  );
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

/** A soft, non-interactive glow in the reef's colour, kept behind the markers. */
function Halo({ reef, colorBy, radius, opacity }: { reef: Reef; colorBy: MapColorBy; radius: number; opacity: number }) {
  return (
    <CircleMarker
      center={[reef.latitude, reef.longitude]}
      radius={radius}
      interactive={false}
      pathOptions={{ stroke: false, fillColor: markerColor(reef, colorBy), fillOpacity: opacity }}
      eventHandlers={{ add: (e) => (e.target as LeafletCircleMarker).bringToBack() }}
    />
  );
}

interface MarkerLayerProps {
  reefs: Reef[];
  selectedId: string | null;
  colorBy: MapColorBy;
  highlightGaps: boolean;
  onSelect: (id: string) => void;
  onHover: (reef: Reef | null) => void;
}

/**
 * All reef markers. Memoised so hovering (which only moves the glow) does not re-render
 * hundreds of markers; the hover "lift" is applied imperatively to the one Leaflet layer.
 */
const MarkerLayer = memo(function MarkerLayer({
  reefs,
  selectedId,
  colorBy,
  highlightGaps,
  onSelect,
  onHover,
}: MarkerLayerProps) {
  // Canvas draws in order: put flagged reefs last so they sit on top while highlighted.
  const ordered = highlightGaps
    ? [...reefs.filter((r) => !r.noaaGap), ...reefs.filter((r) => r.noaaGap)]
    : reefs;
  return (
    <>
      {ordered.map((reef) => {
        const isSelected = reef.id === selectedId;
        const radius = markerRadius(reef, isSelected, highlightGaps);
        return (
          <CircleMarker
            key={reef.id}
            center={[reef.latitude, reef.longitude]}
            radius={radius}
            className="reef-marker"
            // Reef clicks select the reef; they must not also open the open-water scenario probe.
            bubblingMouseEvents={false}
            pathOptions={markerStyle(reef, colorBy, isSelected, highlightGaps)}
            eventHandlers={{
              click: () => onSelect(reef.id),
              mouseover: (e: LeafletMouseEvent) => {
                const layer = e.target as LeafletCircleMarker;
                layer.setRadius(radius + HOVER_GROWTH);
                layer.setStyle({ color: "#12332a", weight: 2.5, fillOpacity: 1 });
                layer.bringToFront();
                onHover(reef);
              },
              mouseout: (e: LeafletMouseEvent) => {
                const layer = e.target as LeafletCircleMarker;
                layer.setRadius(radius);
                layer.setStyle(markerStyle(reef, colorBy, isSelected, highlightGaps));
                onHover(null);
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} className="reef-tooltip">
              <ReefHoverCard reef={reef} colorBy={colorBy} />
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
});

export default function ResilienceMap({
  reefs,
  selectedId,
  onSelect,
  colorBy = "resilience",
  showReefArea = false,
  highlightGaps = false,
}: ResilienceMapProps) {
  const selected = reefs.find((r) => r.id === selectedId) ?? null;
  const [hovered, setHovered] = useState<Reef | null>(null);
  const handleHover = useCallback((reef: Reef | null) => setHovered(reef), []);

  return (
    <div
      role="region"
      aria-label={
        colorBy === "coral"
          ? "Map of reef sites by surveyed hard coral cover"
          : "Global map of reef sites by predicted climate resilience"
      }
      className="h-full w-full"
    >
      <MapContainer
        center={[16, 95]}
        zoom={2}
        minZoom={2}
        maxZoom={11}
        worldCopyJump
        scrollWheelZoom
        // Canvas draws thousands of reef markers far faster than one SVG element each.
        preferCanvas
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Reef extent tiles sit in the tile pane, so they always draw beneath the reef markers. */}
        {showReefArea && (
          <TileLayer
            url={reefAreaTileUrl()}
            bounds={REEF_AREA_BOUNDS}
            minNativeZoom={3}
            maxNativeZoom={11}
            zIndex={2}
            attribution={REEF_AREA_ATTRIBUTION}
          />
        )}

        {/* Soft glows behind the selected and hovered markers. */}
        {selected && <Halo reef={selected} colorBy={colorBy} radius={20} opacity={0.18} />}
        {hovered && hovered.id !== selectedId && (
          <Halo key={`hover-${hovered.id}`} reef={hovered} colorBy={colorBy} radius={17} opacity={0.3} />
        )}

        <MarkerLayer
          reefs={reefs}
          selectedId={selectedId}
          colorBy={colorBy}
          highlightGaps={highlightGaps}
          onSelect={onSelect}
          onHover={handleHover}
        />

        <ProbeLayer />

        <FlyToSelected reef={selected} />
      </MapContainer>
    </div>
  );
}
