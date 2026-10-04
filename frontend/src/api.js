const BASE = import.meta.env.VITE_API_BASE ?? "";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request to ${path} failed with status ${res.status}.`);
  }
  return res.json();
}

export const fetchSites = () => get("/api/sites");
export const fetchModel = () => get("/api/model");
export const fetchRanking = (w) => get(`/api/ranking?${new URLSearchParams(w)}`);
