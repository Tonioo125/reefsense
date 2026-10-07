import { ExternalLink } from "lucide-react";
import { getReefNews } from "@/api/client";
import { useReefResource } from "@/hooks/useReefResource";
import { formatDay } from "@/lib/reef";

/** Joins place names for a sentence: "Bali", "Bali or Indonesia", "A, B or C". */
function orList(items: string[]): string {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

/**
 * Coral news about the reef's region (GET /api/reefs/{id}/news). Matched by place name, so the
 * stories are about the area, not necessarily this reef; the panel says so.
 */
export default function ReefNews({ reefId }: { reefId: string }) {
  const { data, status } = useReefResource(reefId, getReefNews);

  return (
    <section aria-label="Coral news for this region">
      <p className="text-[11px] font-medium uppercase tracking-wide text-brand">In the news</p>
      <h3 className="mt-1 text-[15px] font-semibold text-foreground">Coral stories from this region</h3>

      {status === "loading" ? (
        <div aria-hidden="true" className="mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded-md bg-muted motion-safe:animate-pulse" />
          ))}
          <span className="sr-only" role="status">
            Loading news…
          </span>
        </div>
      ) : status === "error" || !data || data.status === "unavailable" ? (
        <p className="mt-3 text-xs text-muted-foreground">The news source could not be reached right now.</p>
      ) : data.articles.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No coral coverage found on {data.source} for {orList(data.searched)}.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {data.articles.map((a) => (
            <li key={a.url} className="py-2.5 first:pt-0">
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-start gap-1 rounded text-sm font-medium leading-snug text-foreground hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {a.title}
                <ExternalLink
                  className="mt-1 h-3 w-3 shrink-0 text-muted-foreground group-hover:text-brand"
                  aria-hidden="true"
                />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <p className="mt-0.5 text-[11px] text-muted-strong">
                {a.published && <time dateTime={a.published}>{formatDay(a.published)}</time>}
                {a.published && " · "}
                {a.place}
              </p>
              {a.summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.summary}</p>}
            </li>
          ))}
        </ul>
      )}

      {data && data.status === "ok" && (
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Stories from{" "}
          <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
            {data.source}
          </a>{" "}
          that mention corals and name {orList(data.searched)}: about the region, not necessarily this reef.
        </p>
      )}
    </section>
  );
}
