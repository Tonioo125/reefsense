import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L, { type CircleMarker as LeafletCircleMarker } from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { reefAreaTileUrl } from "@/api/client";
import HeatScenario from "@/components/HeatScenario";
import ReefHoverCard from "@/components/ReefHoverCard";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { PALETTE } from "@/lib/palette";
import { bleachColor } from "@/lib/history";
import { CATEGORY_COLORS, REEF_AREA_ATTRIBUTION, REEF_AREA_BOUNDS, coralCoverColor } from "@/lib/reef";
import type { HistoryPoint, MapColorBy, Reef } from "@/types/reef";

interface ResilienceMapProps {
  reefs: Reef[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  colorBy?: MapColorBy;
  /** Draw the mapped coral reef extent (UNEP-WCMC) beneath the markers. */
  showReefArea?: boolean;
  /** Emphasise reefs flagged as missed by current NOAA alerts and fade the rest. */
  highlightGaps?: boolean;
  /** History replay: show these observed surveys (one year) instead of today's reef scores. */
  history?: { points: HistoryPoint[]; countries: string[]; thresholdPct: number } | null;
}

const RADIUS = 7;
const SELECTED_RADIUS = 10;
const HOVER_GROWTH = 3;

function markerColor(reef: Reef, colorBy: MapColorBy) {
  return colorBy === "coral"
    ? coralCoverColor(reef.metrics.coralCover)
    : CATEGORY_COLORS[reef.category].base;
}

const OUTLINE = PALETTE.deepTeal;
const GAP_RING = PALETTE.deepTeal;

function markerStyle(reef: Reef, colorBy: MapColorBy, selected: boolean, highlightGaps: boolean) {
  const fillColor = markerColor(reef, colorBy);
  if (selected) return { color: OUTLINE, opacity: 1, weight: 2.5, fillColor, fillOpacity: 1 };
  if (highlightGaps && reef.noaaGap) return { color: GAP_RING, opacity: 1, weight: 2.5, fillColor, fillOpacity: 1 };
  if (highlightGaps) return { color: OUTLINE, opacity: 0.25, weight: 0.5, fillColor, fillOpacity: 0.18 };
  return { color: OUTLINE, opacity: 0.55, weight: 1, fillColor, fillOpacity: 0.9 };
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
        <p className="mb-3 mt-0.5 text-[11px] tabular-nums text-muted-strong">
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
 * All reef markers, managed directly as Leaflet layers on one canvas rather than as thousands of React
 * components: markers are built once per data/colour/highlight change, and a selection or hover
 * restyles only the markers involved.
 */
function MarkerLayer({ reefs, selectedId, colorBy, highlightGaps, onSelect, onHover }: MarkerLayerProps) {
  const map = useMap();
  const markers = useRef(new Map<string, { marker: LeafletCircleMarker; reef: Reef }>());
  const selectedRef = useRef(selectedId);
  const styledSelected = useRef<string | null>(null);
  const handlers = useRef({ onSelect, onHover });
  handlers.current = { onSelect, onHover };

  const restyle = useCallback(
    (id: string | null) => {
      const entry = id ? markers.current.get(id) : undefined;
      if (!entry) return;
      const selected = id === selectedRef.current;
      entry.marker.setStyle(markerStyle(entry.reef, colorBy, selected, highlightGaps));
      entry.marker.setRadius(markerRadius(entry.reef, selected, highlightGaps));
      if (selected) entry.marker.bringToFront();
    },
    [colorBy, highlightGaps],
  );

  useEffect(() => {
    const group = L.layerGroup();
    const built = new Map<string, { marker: LeafletCircleMarker; reef: Reef }>();
    // Canvas draws in order: put flagged reefs last so they sit on top while highlighted.
    const ordered = highlightGaps
      ? [...reefs.filter((r) => !r.noaaGap), ...reefs.filter((r) => r.noaaGap)]
      : reefs;
    for (const reef of ordered) {
      const selected = reef.id === selectedRef.current;
      const marker = L.circleMarker([reef.latitude, reef.longitude], {
        radius: markerRadius(reef, selected, highlightGaps),
        // Reef clicks select the reef; they must not also open the open-water scenario probe.
        bubblingMouseEvents: false,
        ...markerStyle(reef, colorBy, selected, highlightGaps),
      });
      marker.on("click", () => handlers.current.onSelect(reef.id));
      marker.on("mouseover", () => {
        const isSelected = reef.id === selectedRef.current;
        marker.setRadius(markerRadius(reef, isSelected, highlightGaps) + HOVER_GROWTH);
        marker.setStyle({ color: OUTLINE, opacity: 1, weight: 2.5, fillOpacity: 1 });
        marker.bringToFront();
        handlers.current.onHover(reef);
      });
      marker.on("mouseout", () => {
        const isSelected = reef.id === selectedRef.current;
        marker.setRadius(markerRadius(reef, isSelected, highlightGaps));
        marker.setStyle(markerStyle(reef, colorBy, isSelected, highlightGaps));
        handlers.current.onHover(null);
      });
      group.addLayer(marker);
      built.set(reef.id, { marker, reef });
    }
    group.addTo(map);
    markers.current = built;
    styledSelected.current = selectedRef.current;
    const selected = selectedRef.current ? built.get(selectedRef.current) : undefined;
    selected?.marker.bringToFront();
    return () => {
      group.remove();
    };
  }, [map, reefs, colorBy, highlightGaps]);

  // Selection changes restyle just the previous and the new selected marker.
  useEffect(() => {
    selectedRef.current = selectedId;
    const previous = styledSelected.current;
    styledSelected.current = selectedId;
    if (previous !== selectedId) restyle(previous);
    restyle(selectedId);
  }, [selectedId, restyle]);

  return null;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * History replay: one year's observed bleaching surveys, coloured by mean % of colonies bleached.
 * Drawn imperatively on the shared canvas, like today's markers; worst-hit locations are drawn last.
 */
function HistoryLayer({
  points,
  countries,
  thresholdPct,
}: {
  points: HistoryPoint[];
  countries: string[];
  thresholdPct: number;
}) {
  const map = useMap();
  useEffect(() => {
    const group = L.layerGroup();
    for (const [lat, lon, year, mean, max, n, country] of [...points].sort((a, b) => a[3] - b[3])) {
      const severe = mean >= thresholdPct;
      const marker = L.circleMarker([lat, lon], {
        radius: severe ? 6 : 4.5,
        color: PALETTE.deepTeal,
        opacity: severe ? 0.7 : 0.35,
        weight: severe ? 1 : 0.75,
        fillColor: bleachColor(mean),
        fillOpacity: 0.95,
        bubblingMouseEvents: false,
      });
      marker.bindTooltip(
        `<div class="text-xs"><p class="font-semibold">${escapeHtml(countries[country] ?? "")}, ${year}</p>` +
          `<p>${mean}% of colonies bleached on average${n > 1 ? ` (max ${max}%)` : ""}</p>` +
          `<p class="text-muted-strong">${n} survey${n === 1 ? "" : "s"} at this location</p></div>`,
        { direction: "top", offset: [0, -6], className: "reef-tooltip", opacity: 1 },
      );
      group.addLayer(marker);
    }
    group.addTo(map);
    return () => {
      group.remove();
    };
  }, [map, points, countries, thresholdPct]);
  return null;
}

export default function ResilienceMap({
  reefs,
  selectedId,
  onSelect,
  colorBy = "resilience",
  showReefArea = false,
  highlightGaps = false,
  history = null,
}: ResilienceMapProps) {
  const selected = reefs.find((r) => r.id === selectedId) ?? null;
  const [hovered, setHovered] = useState<Reef | null>(null);
  const handleHover = useCallback((reef: Reef | null) => setHovered(reef), []);
  // Markers removed by switching modes never fire mouseout: drop any stale hover card.
  const replaying = history != null;
  useEffect(() => setHovered(null), [replaying]);
  const renderer = useMemo(() => L.canvas({ padding: 0.3, tolerance: 3 }), []);

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
        // Canvas draws thousands of reef markers far faster than one SVG element each; every marker
        // shares this one canvas, and a few px of hit tolerance makes small markers easy to hover and tap.
        preferCanvas
        renderer={renderer}
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="basemap-tiles"
          opacity={0.85}
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

        {history && (
          <HistoryLayer points={history.points} countries={history.countries} thresholdPct={history.thresholdPct} />
        )}

        {/* Soft glows behind the selected and hovered markers. */}
        {!history && selected && <Halo reef={selected} colorBy={colorBy} radius={20} opacity={0.18} />}
        {!history && hovered && hovered.id !== selectedId && (
          <Halo key={`hover-${hovered.id}`} reef={hovered} colorBy={colorBy} radius={17} opacity={0.3} />
        )}
        {/* One shared hover card on an invisible anchor, instead of a tooltip bound to every marker. */}
        {!history && hovered && (
          <CircleMarker
            key={`tip-${hovered.id}`}
            center={[hovered.latitude, hovered.longitude]}
            radius={1}
            interactive={false}
            pathOptions={{ stroke: false, fillOpacity: 0 }}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={1} permanent className="reef-tooltip">
              <ReefHoverCard reef={hovered} colorBy={colorBy} />
            </Tooltip>
          </CircleMarker>
        )}

        {!history && (
          <MarkerLayer
            reefs={reefs}
            selectedId={selectedId}
            colorBy={colorBy}
            highlightGaps={highlightGaps}
            onSelect={onSelect}
            onHover={handleHover}
          />
        )}

        {!history && <ProbeLayer />}

        <FlyToSelected reef={selected} />
      </MapContainer>
    </div>
  );
}
