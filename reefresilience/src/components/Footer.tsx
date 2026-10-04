export default function Footer() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-medium">ReefResilience</p>
          <p className="mt-1 text-sm text-primary-foreground/70">
            AI-powered insight into coral reef climate resilience.
          </p>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-primary-foreground/60">
          Prototype running on illustrative mock data. Predictions are model-based estimates and do
          not prove that any reef is resilient.
        </p>
      </div>
    </footer>
  );
}
