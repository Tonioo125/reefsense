import { Database, LineChart, ShieldCheck } from "lucide-react";

const POINTS = [
  {
    icon: Database,
    title: "Environmental & ecological data",
    body: "Each reef is characterised by predictors such as sea surface temperature, accumulated heat stress, coral cover, depth and human pressure.",
  },
  {
    icon: LineChart,
    title: "Model-based estimates",
    body: "A classifier estimates the probability of high climate resilience and reports the contribution of each predictor, so every estimate is explainable.",
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
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">About</p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              A transparent lens on reef climate resilience
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              ReefResilience is a research-oriented GIS platform that helps scientists and
              restoration teams explore where coral reef environments show stronger potential to
              persist under climate stress. It pairs an interactive global map with explainable,
              model-based predictions.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              This is an early prototype running on illustrative mock data. The frontend is designed
              so the mock layer can be replaced by a live scientific backend without changes to the
              interface.
            </p>
          </div>

          <ul className="divide-y divide-border border-y border-border">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4 py-6">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center text-brand">
                  <p.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
