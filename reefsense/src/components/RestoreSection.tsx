import { memo, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import Reveal from "@/components/Reveal";
import Term from "@/components/Term";
import { CATEGORY_COLORS, formatPercent } from "@/lib/reef";
import { FULL_COVER_PCT, countriesByReefCount, rankForRestoration } from "@/lib/restore";
import type { RankedReef } from "@/lib/restore";
import type { Reef } from "@/types/reef";

interface RestoreSectionProps {
  reefs: Reef[];
  /** Open a reef's analysis on the map. */
  onOpen: (id: string) => void;
}

const ALL = "__all__";

function Weight({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: ReactNode;
  value: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-foreground">
          {label}
        </label>
        <span className="text-sm tabular-nums text-muted-strong">{value}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[#0B7285]"
      />
      <p className="mt-1 text-xs leading-snug text-muted-strong">{hint}</p>
    </div>
  );
}

function Part({ label, value, note }: { label: string; value: number | null; note?: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[11px] text-muted-strong">
        <span>{label}</span>
        <span className="tabular-nums">{value == null ? "n/a" : formatPercent(value)}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-secondary">
        <div className="h-full rounded-full bg-brand" style={{ width: `${(value ?? 0) * 100}%` }} />
      </div>
      {note && <p className="mt-1 truncate text-[11px] text-muted-strong">{note}</p>}
    </div>
  );
}

function Row({ rank, item, onOpen }: { rank: number; item: RankedReef; onOpen: () => void }) {
  const { reef } = item;
  const year = reef.metrics.coralCoverYear;
  const km = reef.metrics.coralCoverKm;
  const coverNote =
    reef.metrics.coralCover == null
      ? undefined
      : `${Math.round(reef.metrics.coralCover)}% cover${year ? `, ${year} survey` : ""}${km ? `, ${km} km away` : ""}`;
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 py-4 sm:grid-cols-[2rem_minmax(0,1.3fr)_minmax(0,1fr)_auto]">
      <span className="font-display text-xl tabular-nums text-muted-strong">{rank}</span>
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-[15px] font-semibold text-foreground">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: CATEGORY_COLORS[reef.category].base }}
          />
          <span className="truncate">{reef.name}</span>
        </p>
        <p className="truncate text-xs text-muted-strong">{reef.region}</p>
      </div>
      <div className="order-last col-span-3 grid grid-cols-2 gap-3 sm:order-none sm:col-span-1 sm:row-start-1 sm:[grid-column:3]">
        <Part label="Low risk" value={item.safety} />
        <Part label="Coral cover" value={item.cover} note={coverNote} />
      </div>
      <div className="flex items-center gap-3 sm:row-start-1 sm:[grid-column:4]">
        <span className="text-right">
          <span className="block font-display text-2xl font-medium leading-none tabular-nums text-foreground">
            {Math.round(item.score)}
          </span>
          <span className="text-[10px] text-muted-strong">score</span>
        </span>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Show ${reef.name} on the map`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-brand transition-colors hover:border-brand/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

/**
 * "Where to restore first": a transparent ranking of reefs where restoration effort is most likely
 * to last, with the weights in the visitor's hands. Only criteria with real data take part.
 */
export default memo(function RestoreSection({ reefs, onOpen }: RestoreSectionProps) {
  const [risk, setRisk] = useState(60);
  const [cover, setCover] = useState(40);
  const [scope, setScope] = useState("Indonesia");
  const scopeId = useId();

  const countries = useMemo(() => countriesByReefCount(reefs), [reefs]);
  const ranking = useMemo(
    () => rankForRestoration(reefs, { risk: risk / 100, cover: cover / 100 }, scope === ALL ? null : scope),
    [reefs, risk, cover, scope],
  );
  const scopeLabel = scope === ALL ? "all mapped reefs" : `reefs in ${scope}`;

  return (
    <section id="restore" className="scroll-mt-24">
      <div className="mx-auto max-w-[1240px] px-5 pb-8 pt-28 sm:px-8 sm:pt-36">
        <div className="max-w-3xl">
          <Reveal variant="mask">
            <h2 className="text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl">
              Where to restore{" "}
              <span className="font-display font-normal italic tracking-[-0.02em] text-brand">first</span>
            </h2>
          </Reveal>
          <Reveal as="p" delay={150} className="mt-6 max-w-2xl text-base leading-relaxed text-muted-strong sm:text-lg">
            Restoring a reef takes years of work. Put it where it is most likely to last: reefs at low
            risk of bleaching soon, with healthy coral still there to build on. You set the weights;
            nothing is hidden.
          </Reveal>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
          <Reveal className="space-y-6 self-start rounded-[28px] border border-border bg-card p-6 shadow-soft">
            <div>
              <label htmlFor={scopeId} className="text-sm font-semibold text-foreground">
                Reefs in
              </label>
              <select
                id={scopeId}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={ALL}>All mapped reefs ({reefs.length.toLocaleString()})</option>
                {countries.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.country} ({c.count.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <Weight
              label="Low bleaching risk"
              value={risk}
              onChange={setRisk}
              hint="The model's chance this reef avoids bleaching under recent ocean heat."
            />
            <Weight
              label="Healthy coral cover"
              value={cover}
              onChange={setCover}
              hint={
                <>
                  <Term term="coralCover">Living hard coral</Term> from the latest dive survey within 10 km;
                  counts in full at {FULL_COVER_PCT}% or more.
                </>
              }
            />
          </Reveal>

          <Reveal delay={120} className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 className="text-lg font-semibold text-foreground">
                Top {Math.min(10, ranking.ranked.length)} {scopeLabel}
              </h3>
              <p className="text-xs text-muted-strong">
                {ranking.scored.toLocaleString()} scored
                {ranking.excluded > 0 &&
                  ` · ${ranking.excluded.toLocaleString()} left out: no dive survey within 10 km`}
              </p>
            </div>

            {ranking.ranked.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                {risk + cover === 0
                  ? "Give at least one criterion some weight to rank reefs."
                  : "No reefs here have data for every weighted criterion."}
              </p>
            ) : (
              <ol className="mt-2 divide-y divide-border">
                {ranking.ranked.map((item, i) => (
                  <Row key={item.reef.id} rank={i + 1} item={item} onOpen={() => onOpen(item.reef.id)} />
                ))}
              </ol>
            )}

            <p className="mt-4 text-xs leading-relaxed text-muted-strong">
              Score = the weighted average of the criteria above, 0 to 100. A reef missing data for a
              weighted criterion is left out rather than scored on less. Long-term climate refuges (50
              Reefs+) and larval connectivity can join the ranking once their data is added. This is a
              starting point for field assessment, not a substitute for it.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
});
