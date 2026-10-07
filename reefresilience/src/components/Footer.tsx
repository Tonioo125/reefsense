import Reveal from "@/components/Reveal";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-secondary text-foreground">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Reveal>
          <img
            src="/logo.png"
            alt="ReefSense"
            width={409}
            height={270}
            className="h-14 w-auto"
            loading="lazy"
            decoding="async"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered insight into coral reef climate resilience.
          </p>
        </Reveal>
        <Reveal as="p" delay={120} className="max-w-sm text-xs leading-relaxed text-muted-strong">
          Data: Global Coral-Bleaching Database (CC BY 4.0), NOAA Coral Reef Watch and UNEP-WCMC
          coral reef extent v4.1 (2021, non-commercial use). Predictions
          are model-based estimates and do not prove that any reef is resilient.
        </Reveal>
      </div>
    </footer>
  );
}
