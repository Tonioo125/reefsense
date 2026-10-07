import { useEffect, useState } from "react";

export type ResourceStatus = "loading" | "ready" | "error";

/**
 * Loads one per-reef resource (heat history, survey history, news) for the selected reef.
 * Responses for a previously selected reef are ignored.
 */
export function useReefResource<T>(
  id: string,
  fetcher: (id: string) => Promise<T | null>,
): { data: T | null; status: ResourceStatus } {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ResourceStatus>("loading");

  useEffect(() => {
    let active = true;
    setData(null);
    setStatus("loading");
    fetcher(id)
      .then((result) => {
        if (!active) return;
        setData(result);
        setStatus(result ? "ready" : "error");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [id, fetcher]);

  return { data, status };
}
