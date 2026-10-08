import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import Reveal from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import type { DetailStatus } from "@/hooks/useReefDetail";
import {
  ESRI_IMAGERY_ATTRIBUTION,
  ESRI_IMAGERY_URL,
  PHOTO_RADIUS_KM,
  SATELLITE_ZOOM,
  licenseLabel,
  photoAlt,
  photoCredit,
} from "@/lib/imagery";
import type { Reef, ReefPhoto } from "@/types/reef";

interface ReefImageryProps {
  reef: Reef;
  photos: ReefPhoto[];
  status: DetailStatus;
  /** Reloads the community photos after an error. */
  onRetry: () => void;
}

const RING = "#ffffff";

/** Small, non-interactive satellite view of the reef. Always shown, so imagery never comes up empty. */
function SatelliteView({ reef }: { reef: Reef }) {
  return (
    // MapContainer only forwards className/id/style to its <div>, so the label sits on the figure.
    <figure className="isolate" aria-label={`Satellite view centred on ${reef.name}`}>
      <MapContainer
        key={reef.id}
        center={[reef.latitude, reef.longitude]}
        zoom={SATELLITE_ZOOM}
        dragging={false}
        touchZoom={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
        className="h-44 w-full rounded-md border border-border"
      >
        <TileLayer url={ESRI_IMAGERY_URL} attribution={ESRI_IMAGERY_ATTRIBUTION} />
        <CircleMarker
          center={[reef.latitude, reef.longitude]}
          radius={12}
          interactive={false}
          pathOptions={{ color: RING, weight: 2, opacity: 0.95, fill: false }}
        />
      </MapContainer>
      <figcaption className="mt-1.5 text-[11px] text-muted-strong">
        Satellite view · imagery dates vary by location
      </figcaption>
    </figure>
  );
}

function PhotoGallery({ reef, photos, status, onRetry }: ReefImageryProps) {
  if (status === "error") {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          Community photos could not be loaded. The satellite view is still shown.
        </p>
        {/* Named apart from the explanation's "Try again" in the same panel. */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          aria-label="Try again to load community photos"
          className="mt-3"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <>
        <span className="sr-only" role="status">
          Loading community photos…
        </span>
        <div aria-hidden="true" className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square rounded-md bg-muted motion-safe:animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  if (photos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No openly licensed community photos within {PHOTO_RADIUS_KM} km yet. Showing the satellite
        view only.
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-2">
        {photos.map((photo) => {
          const alt = photoAlt(photo, reef.name);
          const credit = photoCredit(photo);
          return (
            <li key={photo.id} className="min-w-0">
              <a
                href={photo.observationUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${alt}, ${credit}. Opens the iNaturalist observation in a new tab`}
                className="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <img
                  src={photo.url}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  decoding="async"
                  alt={alt}
                  title={photo.attribution}
                  className="aspect-square h-auto w-full rounded-md border border-border object-cover transition-opacity group-hover:opacity-90 motion-reduce:transition-none"
                />
                {/* Only the name truncates, so the licence stays visible on narrow tiles. */}
                <span className="mt-1 flex text-[11px] text-muted-strong">
                  <span className="truncate">{photo.photographer}</span>
                  <span className="shrink-0">&nbsp;· {licenseLabel(photo.license)}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-strong">
        Community photos near this site via iNaturalist — not a record of current reef condition.
      </p>
    </>
  );
}

/**
 * "Reef imagery": an always-on Esri satellite view plus openly licensed iNaturalist photos
 * within 10 km. Purely presentational; photos load in `useReefPhotos`.
 */
export default function ReefImagery({ reef, photos, status, onRetry }: ReefImageryProps) {
  return (
    <Reveal as="section" variant="fade-in">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Reef imagery</h3>
      <SatelliteView reef={reef} />
      <div className="mt-4">
        <PhotoGallery reef={reef} photos={photos} status={status} onRetry={onRetry} />
      </div>
    </Reveal>
  );
}
