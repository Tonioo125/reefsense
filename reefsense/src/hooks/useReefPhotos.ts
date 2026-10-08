import { useCallback, useEffect, useState } from "react";
import { getReefPhotos } from "@/api/client";
import type { DetailStatus } from "@/hooks/useReefDetail";
import type { ReefPhoto } from "@/types/reef";

export interface ReefPhotos {
  /** Reef the current photos belong to (null while idle or loading). */
  reefId: string | null;
  photos: ReefPhoto[];
  status: DetailStatus;
  retry: () => void;
}

/**
 * Loads community photos for one reef (GET /api/reefs/{id}/photos).
 * Stale responses from a previous selection are ignored.
 */
export function useReefPhotos(id: string | null): ReefPhotos {
  const [reefId, setReefId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ReefPhoto[]>([]);
  const [status, setStatus] = useState<DetailStatus>("idle");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) {
      setReefId(null);
      setPhotos([]);
      setStatus("idle");
      return;
    }

    let active = true;
    setReefId(null);
    setPhotos([]);
    setStatus("loading");

    getReefPhotos(id)
      .then((list) => {
        if (!active) return;
        setReefId(id);
        setPhotos(list);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setReefId(id);
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { reefId, photos, status, retry };
}
