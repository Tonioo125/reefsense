export default function Footer() {
  return (
    <footer className="border-t border-border bg-secondary text-foreground">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-medium">ReefResilience</p>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered insight into coral reef climate resilience.
          </p>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-muted-strong">
          Data: Global Coral-Bleaching Database (CC BY 4.0), NOAA Coral Reef Watch and UNEP-WCMC
          coral reef extent v4.1 (2021, non-commercial use). Predictions
          are model-based estimates and do not prove that any reef is resilient.
        </p>
      </div>
    </footer>
  );
}
