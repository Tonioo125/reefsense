import { useCallback, useEffect, useState } from "react";
import { getExplanation, getReef } from "@/api/client";
import type { Reef, ReefExplanation } from "@/types/reef";

export type DetailStatus = "idle" | "loading" | "ready" | "error";

export interface ReefDetail {
  reef: Reef | null;
  explanation: ReefExplanation | null;
  status: DetailStatus;
  error: string | null;
  retry: () => void;
}

/**
 * Loads the detail view for one reef (GET /api/reefs/{id} and
 * GET /api/reefs/{id}/explanation). Stale responses from a previous
 * selection are ignored.
 */
export function useReefDetail(id: string | null): ReefDetail {
  const [reef, setReef] = useState<Reef | null>(null);
  const [explanation, setExplanation] = useState<ReefExplanation | null>(null);
  const [status, setStatus] = useState<DetailStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) {
      setReef(null);
      setExplanation(null);
      setStatus("idle");
      setError(null);
      return;
    }

    let active = true;
    setStatus("loading");
    setError(null);
    setExplanation(null);

    Promise.all([getReef(id), getExplanation(id)])
      .then(([r, e]) => {
        if (!active) return;
        if (!r || !e) {
          setStatus("error");
          setError("Reef data not found.");
          return;
        }
        setReef(r);
        setExplanation(e);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
        setError("Could not load the model analysis for this reef.");
      });

    return () => {
      active = false;
    };
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { reef, explanation, status, error, retry };
}
