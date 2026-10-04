# ReefResilience

**An AI-powered GIS platform for exploring the climate resilience of coral reefs.**

ReefResilience helps answer one question:

> _Which coral reef areas are more likely to remain resilient under climate stress?_

It pairs an interactive global map with explainable, model-based predictions. This repository is a **polished frontend prototype running on mock data** — the Python backend is intentionally not implemented yet. The data layer is designed so the mock API can be swapped for a real FastAPI backend without touching UI components.

> ⚠️ Scientific framing: every value is a **predicted probability of high climate resilience**, not a guaranteed "resilience score". The platform supports prioritisation; it does not prove that a reef is resilient.

## Features

- **Resilience map** — a world map (React Leaflet + OpenStreetMap) of reef sites, colour-coded by predicted resilience category, with a floating legend and a category filter.
- **AI prediction** — selecting a reef opens an analysis panel with the headline probability, environmental predictors and model confidence.
- **AI explanation** — a SHAP-style feature-contribution visualisation showing which predictors raise or lower the estimate.
- **Insights** — aggregate, model-based patterns across the dataset (Recharts).

## Tech stack

React · TypeScript · Vite · Tailwind CSS · shadcn/ui-style primitives · React Leaflet · Lucide React · Recharts

## Getting started

Requires **Node 18+**.

```bash
npm install
npm run dev     # http://localhost:5173
```

Other scripts:

```bash
npm run build     # type-check + production build
npm run preview   # preview the production build
npm run typecheck # type-check only
```

## Project structure

```
src/
  api/
    client.ts              # Mock API layer; mirrors the planned FastAPI contract
  components/
    Navbar.tsx
    Hero.tsx
    ResilienceMap.tsx       # React Leaflet map + markers
    MapLegend.tsx
    MapFilter.tsx
    ReefAnalysisPanel.tsx   # Composes the three sub-panels below
    ResilienceScore.tsx     # Headline predicted probability
    EnvironmentalMetrics.tsx
    FeatureContributions.tsx # SHAP-style model explanation
    InsightsSection.tsx     # Recharts aggregate charts
    AboutSection.tsx
    Footer.tsx
    CategoryBadge.tsx
    ui/                     # Button, Badge (shadcn-style primitives)
  data/
    mockReefs.ts            # The only place reef data lives
  lib/
    reef.ts                 # Category colours, labels, formatters
    utils.ts                # cn() class-name helper
    scroll.ts
  pages/
    Explore.tsx             # The main page: hero, map, panel, insights, about
  types/
    reef.ts                 # Domain types
```

Reef data is never hardcoded inside UI components — it flows from `data/mockReefs.ts` through `api/client.ts` into the views.

## Responsive behaviour

- **Desktop** — the map fills most of the viewport; the analysis panel is a right-hand rail.
- **Tablet / mobile** — the map is compact and the analysis panel opens as a bottom sheet.

## Connecting a real backend

The frontend already expects this API contract:

| Endpoint | Function in `src/api/client.ts` |
|---|---|
| `GET /api/reefs` | `listReefs()` |
| `GET /api/reefs/{id}` | `getReef(id)` |
| `POST /api/predict` | `predict(input)` |
| `GET /api/reefs/{id}/explanation` | `getExplanation(id)` |

To go live:

1. Copy `.env.example` to `.env` and set `VITE_API_BASE` (the dev server already proxies `/api` to `http://localhost:8000`).
2. In `src/api/client.ts`, replace each mock body with the commented `http()` call.

No component changes are required — the response shapes match the TypeScript types in `src/types/reef.ts`.

## Notes

- All data is illustrative mock data for demonstration only.
- `React.StrictMode` is intentionally omitted in `main.tsx` to avoid Leaflet's double-mount initialisation error in development.
