import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { bleachColor } from "../colors.js";

function FlyTo({ site }) {
  const map = useMap();
  useEffect(() => {
    if (site) map.flyTo([site.lat, site.lon], Math.max(map.getZoom(), 10), { duration: 0.8 });
  }, [site, map]);
  return null;
}

export default function ReefMap({ sites, selectedId, onSelect }) {
  const selected = sites.find((s) => s.site_id === selectedId);
  return (
    <>
      <MapContainer center={[-8.45, 115.15]} zoom={9} className="map" scrollWheelZoom>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri"
          maxZoom={13}
        />
        {sites.map((s) => (
          <CircleMarker
            key={s.site_id}
            center={[s.lat, s.lon]}
            radius={s.site_id === selectedId ? 12 : 9}
            pathOptions={{
              fillColor: bleachColor(s.bleaching_probability),
              fillOpacity: 1,
              color: "#17324b",
              weight: s.site_id === selectedId ? 3 : 1.25,
              dashArray: s.bleaching_probability == null ? "3 3" : null,
            }}
            eventHandlers={{ click: () => onSelect(s.site_id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>{s.name}</Tooltip>
          </CircleMarker>
        ))}
        <FlyTo site={selected} />
      </MapContainer>

      <div className="legend" aria-label="Map legend">
        <span>Bleaching likelihood</span>
        <div className="legend-bar" />
        <div className="legend-ends"><span>Low</span><span>High</span></div>
      </div>
    </>
  );
}
