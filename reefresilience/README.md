# ReefResilience

**An AI-powered GIS platform for exploring the climate resilience of coral reefs.**

ReefResilience helps answer one question:

> _Which coral reef areas are more likely to remain resilient under climate stress?_

It pairs an interactive global map with explainable, model-based predictions. This repository is a **frontend prototype running on mock data**. The Python backend is intentionally not implemented yet; the API layer is built so the mock data can be swapped for a FastAPI backend without touching UI components.

> Scientific framing: every value is a **predicted probability of high climate resilience**, not a "resilience score". The platform supports prioritisation; it does not prove that a reef is resilient.

## Features

- **Resilience map**: a world map (React Leaflet + OpenStreetMap) of 24 reef sites, colour-coded by predicted category (High / Medium / Low), with a floating legend and a category filter.
- **AI prediction**: selecting a reef opens an analysis panel with the predicted probability, environmental predictors and model confidence.
- **AI explanation**: a SHAP-style diverging bar chart showing which predictors raise or lower the estimate, plus a short model insight.
- **Insights**: aggregate, model-based patterns across the dataset (Recharts).

## Tech stack

React 18 · TypeScript · Vite 5 · Tailwind CSS · shadcn/ui primitives · React Leaflet 4 · Lucide React · Recharts · Vitest

All dependency versions are pinned exactly in `package.json`. react-leaflet 4 requires React 18, so don't upgrade React to 19 without also moving to react-leaflet 5.

## Getting started

Requires **Node 18+** (20 recommended, see `.nvmrc`). If your nvm defaults to an older Node, run `nvm use 20` first; Vite 5 fails to start on Node 14/16.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build (http://localhost:4173)
npm test           # unit tests (Vitest)
npm run typecheck  # type-check only
```

## Environment variables

Copy `.env.example` to `.env` to change them.

| Variable | Default | Meaning |
|---|---|---|
| `VITE_USE_MOCK` | `true` | Any value other than `false` serves data from `src/data/mockReefs.ts` with ~350 ms simulated latency. |
| `VITE_API_BASE_URL` | _(empty)_ | Backend origin. Empty means same-origin `/api/...`, which the dev server proxies to `http://localhost:8000`. |

## Project structure

```
src/
  api/
    client.ts               # API layer: mock or HTTP, mirrors the FastAPI contract
    client.test.ts
  components/
    Navbar.tsx
    Hero.tsx
    ResilienceMap.tsx       # React Leaflet map + markers
    MapLegend.tsx
    MapFilter.tsx
    ReefAnalysisPanel.tsx   # Composes the sub-panels below
    ResilienceScore.tsx     # Headline predicted probability
    EnvironmentalMetrics.tsx
    FeatureContributions.tsx # SHAP-style model explanation
    ReefInsight.tsx         # Confidence, top factors, environmental summary
    InsightsSection.tsx     # Recharts aggregate charts
    AboutSection.tsx
    Footer.tsx
    ui/                     # shadcn/ui primitives (Button, Badge)
  data/
    mockReefs.ts            # The only place reef data lives
    mockReefs.test.ts
  hooks/
    useMediaQuery.ts        # Breakpoints + prefers-reduced-motion
    useReefDetail.ts        # Loads reef + explanation for the selection
  lib/
    reef.ts                 # Thresholds, colours, labels, formatters
    reef.test.ts
    scroll.ts
    utils.ts                # cn() class-name helper
  pages/
    Explore.tsx             # Main page: hero, map, panel, insights, about
  types/
    reef.ts                 # Domain + API types
  language.test.ts          # Guards the scientific wording of UI copy
  vite-env.d.ts             # Typed import.meta.env
components.json             # shadcn/ui configuration
```

Reef data is never hardcoded in UI components. It flows from `data/mockReefs.ts` through `api/client.ts` into the views.

## Responsive behaviour

- **Desktop (≥ 1024 px)**: the map fills most of the viewport; the analysis panel is a right-hand rail.
- **Tablet (768–1023 px)**: the map stays dominant; the analysis panel sits below it in two columns.
- **Mobile (< 768 px)**: a compact map; the analysis opens as a bottom sheet (tap the backdrop, the close button or press Escape to dismiss).

Animations are subtle and turn off when the OS requests reduced motion.

## Connecting the FastAPI backend

The frontend already calls this contract:

| Endpoint | Function in `src/api/client.ts` | Response type (`src/types/reef.ts`) |
|---|---|---|
| `GET /api/reefs` | `listReefs()` | `Reef[]` |
| `GET /api/reefs/{id}` | `getReef(id)` | `Reef` (404 → `null`) |
| `POST /api/predict` | `predict(input)` | body `PredictRequest`, returns `PredictResponse` |
| `GET /api/reefs/{id}/explanation` | `getExplanation(id)` | `ReefExplanation` (404 → `null`) |

To go live:

1. Create `.env` with `VITE_USE_MOCK=false`.
2. Either leave `VITE_API_BASE_URL` empty and run FastAPI on `http://localhost:8000` (the Vite dev proxy forwards `/api`), or set it to the full backend URL. A different origin needs CORS enabled on the backend.
3. Restart `npm run dev`.

No component changes are needed. Non-2xx responses other than 404 surface as an `ApiError`, which the UI shows with a "Try again" action.

## Notes

- All reef data is illustrative mock data for demonstration only.
- `React.StrictMode` is intentionally omitted in `main.tsx` to avoid Leaflet's double-mount initialisation error in development.
- Map tiles come from the public OpenStreetMap tile server; respect its [usage policy](https://operations.osmfoundation.org/policies/tiles/) for anything beyond prototyping.
