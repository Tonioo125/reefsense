import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  active: string;
  onNavigate: (id: string) => void;
}

const NAV_ITEMS = [
  { id: "explore", label: "Explore" },
  { id: "insights", label: "Insights" },
  { id: "about", label: "About" },
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="hsl(var(--primary))" />
      <circle cx="16" cy="16" r="2.6" fill="hsl(var(--brand))" />
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="hsl(var(--brand))" strokeWidth="1.5" opacity="0.7" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="hsl(var(--brand))" strokeWidth="1.5" opacity="0.38" />
    </svg>
  );
}

function StatusIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-2 py-1 sm:px-3">
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
      </span>
      <span className="whitespace-nowrap text-[11px] font-medium text-secondary-foreground sm:text-xs">
        Global Reef Dataset
      </span>
    </div>
  );
}

export default function Navbar({ active, onNavigate }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const go = (id: string) => {
    onNavigate(id);
    setOpen(false);
  };

  // Escape closes the mobile menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6">
        <button
          onClick={() => go("top")}
          className={cn("flex items-center gap-2.5 rounded-md", FOCUS_RING)}
          aria-label="ReefResilience home"
        >
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight text-foreground max-[359px]:hidden">
            ReefResilience
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              aria-current={active === item.id ? "true" : undefined}
              className={cn(
                "relative rounded-md px-3 py-2 text-sm transition-colors hover:text-foreground",
                FOCUS_RING,
                active === item.id ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
              {active === item.id && (
                <span className="absolute inset-x-3 -bottom-[13px] h-px bg-brand" aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <StatusIndicator />
          <button
            onClick={() => setOpen((v) => !v)}
            className={cn("rounded-md p-2 text-foreground hover:bg-secondary md:hidden", FOCUS_RING)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="border-t border-border bg-background px-4 py-2 sm:px-6 md:hidden"
          aria-label="Mobile"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              aria-current={active === item.id ? "true" : undefined}
              className={cn(
                "block w-full rounded-md px-2 py-2.5 text-left text-sm hover:bg-secondary hover:text-foreground",
                FOCUS_RING,
                active === item.id ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
