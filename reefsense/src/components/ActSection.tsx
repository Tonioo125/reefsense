import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/Reveal";

const LINK =
  "inline-flex items-center gap-1 rounded-sm font-medium text-brand underline decoration-brand/30 underline-offset-[3px] hover:decoration-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Out({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={LINK}>
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

const ACTIONS = [
  {
    title: "Report what you see",
    body: (
      <>
        Snorkelling or diving? Log coral colour with <Out href="https://coralwatch.org">CoralWatch</Out>, or
        train as a volunteer with <Out href="https://reefcheck.or.id">Reef Check Indonesia</Out>. Field
        reports are how predictions like these get checked.
      </>
    ),
  },
  {
    title: "Back protected reefs",
    body: (
      <>
        Reefs with fewer local pressures, like overfishing and pollution, are better placed to recover
        from bleaching. Support marine protected areas such as Nusa Penida&apos;s, managed with the{" "}
        <Out href="https://coraltrianglecenter.org">Coral Triangle Center</Out>.
      </>
    ),
  },
  {
    title: "Share a reef",
    body: (
      <>
        Open any reef on the map and use the share button to send its outlook to someone who dives,
        fishes or works there.
      </>
    ),
  },
  {
    title: "Restoring a reef?",
    body: (
      <>
        Use the ranking above to shortlist sites, then check them in the water: these are predictions,
        not observations.
      </>
    ),
  },
];

/** What a visitor can do next: the page's call to action. */
export default function ActSection() {
  return (
    <section id="act" className="scroll-mt-24 border-t border-border">
      <div className="mx-auto max-w-[1240px] px-5 py-24 sm:px-8 sm:py-28">
        <div className="max-w-3xl">
          <Reveal variant="mask">
            <h2 className="text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-foreground sm:text-5xl">
              What you can{" "}
              <span className="font-display font-normal italic tracking-[-0.02em] text-brand">do</span>
            </h2>
          </Reveal>
          <Reveal as="p" delay={150} className="mt-6 max-w-2xl text-base leading-relaxed text-muted-strong sm:text-lg">
            Bleaching is driven by warming oceans, so cutting greenhouse emissions is the only lasting
            fix. Closer to home, there is still a lot that helps reefs ride out the heat.
          </Reveal>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-x-14 border-t border-border sm:grid-cols-2">
          {ACTIONS.map((a, i) => (
            <Reveal as="li" key={a.title} delay={i * 100} className="border-b border-border py-7">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{a.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{a.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
