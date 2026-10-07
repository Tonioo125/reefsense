import { Database, LineChart, ShieldCheck } from "lucide-react";
import Reveal from "@/components/Reveal";

const POINTS = [
  {
    icon: Database,
    title: "Environmental & ecological data",
    body: "Each reef is characterised by predictors such as accumulated heat stress (Degree Heating Weeks), sea temperature anomalies, turbidity, depth, wave exposure and cyclone frequency.",
  },
  {
    icon: LineChart,
    title: "Model-based estimates",
    body: "A gradient-boosted classifier estimates the chance a reef avoids significant bleaching (10% or more of colonies) and reports each predictor's contribution, so every estimate is explainable.",
  },
  {
    icon: ShieldCheck,
    title: "Decision support, not proof",
    body: "Outputs are predictions, not guarantees. They are intended to support prioritisation alongside field assessment, not to replace it.",
  },
];

export default function AboutSection() {
  return (
    <section id="about" className="scroll-mt-16 border-t border-border">
      <div className="mx-auto max-w-[1240px] px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">About</p>
              <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                A transparent lens on reef climate resilience
              </h2>
            </Reveal>
            <Reveal as="p" delay={100} className="mt-5 text-base leading-relaxed text-muted-foreground">
              ReefSense is a research-oriented GIS platform that helps scientists and
              restoration teams explore where coral reef environments show stronger potential to
              persist under climate stress. It pairs an interactive global map with explainable,
              model-based predictions.
            </Reveal>
            <Reveal as="p" delay={180} className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Bleaching labels and reef conditions come from the Global Coral-Bleaching Database
              (van Woesik &amp; Kratochwill 2022, CC BY 4.0); live heat stress comes from NOAA Coral
              Reef Watch daily 5 km satellite products. Training heat metrics (CoRTAD) and live
              ones (Coral Reef Watch) are related but distinct products. Non-heat conditions come
              from each reef&apos;s own survey where one exists, otherwise from the nearest surveyed
              reefs.
            </Reveal>
            <Reveal as="p" delay={260} className="mt-4 text-xs leading-relaxed text-muted-strong">
              Reef area: UNEP-WCMC, WorldFish Centre, WRI, TNC (2010). Global distribution of
              warm-water coral reefs, compiled from multiple sources including the Millennium Coral
              Reef Mapping Project. Version 4.1, released 2021. Cambridge (UK): UNEP World
              Conservation Monitoring Centre.{" "}
              <a
                href="https://www.unep-wcmc.org"
                target="_blank"
                rel="noopener"
                className="text-brand underline underline-offset-2 hover:text-foreground"
              >
                unep-wcmc.org
              </a>
            </Reveal>
          </div>

          <ul className="divide-y divide-border border-y border-border">
            {POINTS.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 120} className="flex gap-4 py-6">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center text-primary">
                  <p.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
