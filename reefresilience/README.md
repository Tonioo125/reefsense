# ReefResilience

**An AI-powered GIS platform for exploring the climate resilience of coral reefs.**

ReefResilience helps answer one question:

> _Which coral reef areas are more likely to remain resilient under climate stress?_

It pairs an interactive global map with explainable, model-based predictions served by the ReefCast FastAPI backend (`../backend`). The model is a LightGBM bleaching classifier trained on the Global Coral-Bleaching Database, scored against live NOAA Coral Reef Watch heat stress.

> ⚠️ Scientific framing: every value is a **predicted probability of high climate resilience**, defined as the model's estimated chance that the reef avoids bleaching of 10% or more of its colonies under the past 12 weeks of satellite heat stress. It is not a guaranteed "resilience score". The platform supports prioritisation; it does not prove that a reef is resilient.

## Features

- **Resilience map** — a world map (React Leaflet + OpenStreetMap) of reef sites, colour-coded by predicted resilience category, with a floating legend and a category filter.
- **AI prediction** — selecting a reef opens an analysis panel with the headline probability, environmental predictors and model confidence.
- **AI explanation** — a SHAP-style feature-contribution visualisation showing which predictors raise or lower the estimate.
- **Insights** — aggregate, model-based patterns across the dataset (Recharts).

## Tech stack

React · TypeScript · Vite · Tailwind CSS · shadcn/ui-style primitives · React Leaflet · Lucide React · Recharts

## Getting started

Requires **Node 18+**, and the API running (see the top-level README for the pipeline):

```bash
# terminal 1 — API
cd ../backend && uvicorn main:app --port 8000

# terminal 2 — frontend (proxies /api to localhost:8000)
npm install
npm run dev     # http://localhost:5173
```

There is no offline or mock mode: every number shown comes from the trained model and real data. If the API is down, the map says so instead of showing placeholder values.

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
    client.ts              # API layer for the FastAPI backend
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
  lib/
    reef.ts                 # Category colours, labels, formatters
    utils.ts                # cn() class-name helper
    scroll.ts
  pages/
    Explore.tsx             # The main page: hero, map, panel, insights, about
  types/
    reef.ts                 # Domain types
```

Reef data is never hardcoded inside UI components — it flows from the API through `api/client.ts` into the views.

## Responsive behaviour

- **Desktop** — the map fills most of the viewport; the analysis panel is a right-hand rail.
- **Tablet / mobile** — the map is compact and the analysis panel opens as a bottom sheet.

## API

| Endpoint | Function in `src/api/client.ts` |
|---|---|
| `GET /api/reefs` | `listReefs()` |
| `GET /api/reefs/{id}` | `getReef(id)` |
| `POST /api/predict` | `predict(input)` |
| `GET /api/reefs/{id}/explanation` | `getExplanation(id)` |
| `GET /api/model` | `getModelMetrics()` |

The dev server proxies `/api` to `http://localhost:8000`; set `VITE_API_BASE` (see `.env.example`) to point elsewhere. Response shapes match the TypeScript types in `src/types/reef.ts`.

## Notes

- Reefs show only the variables the data supports: sea temperature and anomaly, Degree Heating Weeks and current NOAA alert status (NOAA Coral Reef Watch), and coral cover and depth from the nearest surveys (GCBD). There is no human-pressure variable or per-reef confidence score, because neither exists in the source data.
- Feature contributions are in log-odds and sign-flipped from the bleaching model, so positive values raise predicted resilience.
- `React.StrictMode` is intentionally omitted in `main.tsx` to avoid Leaflet's double-mount initialisation error in development.
