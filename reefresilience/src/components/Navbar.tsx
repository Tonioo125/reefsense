import { useState } from "react";
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

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="hsl(var(--primary))" />
      <circle cx="16" cy="16" r="2.6" fill="hsl(var(--brand))" />
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="hsl(var(--brand))" strokeWidth="1.5" opacity="0.7" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="hsl(var(--brand))" strokeWidth="1.5" opacity="0.38" />
    </svg>
  );
}

function StatusIndicator() {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 sm:flex">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
      </span>
      <span className="text-xs font-medium text-secondary-foreground">Global Reef Dataset</span>
    </div>
  );
}

export default function Navbar({ active, onNavigate }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const go = (id: string) => {
    onNavigate(id);
    setOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-6">
        <button
          onClick={() => go("top")}
          className="flex items-center gap-2.5"
          aria-label="ReefResilience home"
        >
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            ReefResilience
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={cn(
                "relative rounded-md px-3 py-2 text-sm transition-colors hover:text-foreground",
                active === item.id ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
              {active === item.id && (
                <span className="absolute inset-x-3 -bottom-[13px] h-px bg-brand" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <StatusIndicator />
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 text-foreground hover:bg-secondary md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-6 py-2 md:hidden" aria-label="Mobile">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className="block w-full rounded-md px-2 py-2.5 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
