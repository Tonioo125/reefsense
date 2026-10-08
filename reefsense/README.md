# ReefSense

**An AI-powered GIS platform for exploring the climate resilience of coral reefs.**

ReefSense helps answer one question:

> _Which coral reef areas are more likely to remain resilient under climate stress?_

It pairs an interactive global map with explainable, model-based predictions served by the ReefCast FastAPI backend (`../backend`). The model is a LightGBM bleaching classifier trained on the Global Coral-Bleaching Database, scored against live NOAA Coral Reef Watch heat stress.

> Scientific framing: every value is a **predicted probability of high climate resilience**, defined as the model's estimated chance that the reef avoids bleaching of 10% or more of its colonies under the past 12 weeks of satellite heat stress. It is not a "resilience score". The platform supports prioritisation; it does not prove that a reef is resilient.

## Features

- **Resilience map**: a world map (React Leaflet + OpenStreetMap) of the scored reef sites, colour-coded by predicted category (High / Medium / Low), with a floating legend and a category filter.
- **AI prediction**: selecting a reef opens an analysis panel with the predicted probability and its environmental predictors (sea temperature, Degree Heating Weeks, NOAA alert status, coral cover, depth).
- **AI explanation**: a SHAP-style diverging bar chart showing which predictors raise or lower the estimate, plus a short model insight and how well the estimate is supported by nearby survey data.
- **Reef imagery**: every analysis panel shows a small Esri World Imagery satellite view of the reef, plus up to six openly licensed iNaturalist coral photos taken within 10 km (credited, each linking to its observation).
- **Insights**: aggregate patterns across the mapped reefs and the model's cross-validated skill against heat stress alone (Recharts).

## Tech stack

React 18 · TypeScript · Vite 5 · Tailwind CSS · shadcn/ui primitives · React Leaflet 4 · Lucide React · Recharts · Vitest

All dependency versions are pinned exactly in `package.json`. react-leaflet 4 requires React 18, so don't upgrade React to 19 without also moving to react-leaflet 5.

## Getting started

Requires **Node 18+** (20 recommended, see `.nvmrc`). If your nvm defaults to an older Node, run `nvm use 20` first; Vite 5 fails to start on Node 14/16. The API must be running (see [`../pipeline/README.md`](../pipeline/README.md) for the data pipeline):

```bash
# terminal 1 — API
cd ../backend && uvicorn main:app --port 8000

# terminal 2 — frontend (proxies /api to localhost:8000)
npm install
npm run dev        # http://localhost:5173
```

There is no offline or mock mode: every number shown comes from the trained model and real data. If the API is down, the map says so instead of showing placeholder values.

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
| `VITE_API_BASE_URL` | _(empty)_ | Backend origin. Empty means same-origin `/api/...`, which the dev server proxies to `http://localhost:8000`. A different origin needs CORS enabled on the backend (`REEFCAST_CORS`). |

## Project structure

```
src/
  api/
    client.ts               # API layer for the FastAPI backend
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
    ReefInsight.tsx         # Top factors, data support, environmental summary
    ReefImagery.tsx         # Satellite view + iNaturalist photo gallery
    InsightsSection.tsx     # Recharts aggregate charts
    AboutSection.tsx
    Footer.tsx
    Reveal.tsx              # Scroll-reveal wrapper (fade-up / fade-in / scale-in)
    ui/                     # shadcn/ui primitives (Button, Badge)
  hooks/
    useMediaQuery.ts        # Breakpoints + prefers-reduced-motion
    useReefDetail.ts        # Loads reef + explanation for the selection
    useReefPhotos.ts        # Loads community photos for the selection
    useInView.ts            # IntersectionObserver, latches once visible
    useCountUp.ts           # Eased number count-up
    useScroll.ts            # Navbar scroll state + hero parallax
  lib/
    reef.ts                 # Thresholds, colours, labels, formatters
    reef.test.ts
    imagery.ts              # Satellite tile constants, photo licence/alt/credit text
    imagery.test.ts
    motion.ts               # Easing, count-up and parallax maths
    motion.test.ts
    scroll.ts
    utils.ts                # cn() class-name helper
  pages/
    Explore.tsx             # Main page: hero, map, panel, insights, about
  types/
    reef.ts                 # Domain + API types
  language.test.ts          # Guards the scientific wording of UI copy
  vite-env.d.ts             # Typed import.meta.env
public/
  logo.png                  # Full ReefSense lockup (transparent, cropped)
  logo-mark.png             # Coral + waves mark, used in the navbar
  favicon.png, favicon-32.png, apple-touch-icon.png
  ReefSense Tropical Logo.png # Source artwork the assets are cut from
components.json             # shadcn/ui configuration
```

Reef data is never hardcoded in UI components. It flows from the API through `api/client.ts` into the views.

## Responsive behaviour

- **Desktop (≥ 1024 px)**: the map fills most of the viewport; the analysis panel is a right-hand rail.
- **Tablet (768–1023 px)**: the map stays dominant; the analysis panel sits below it in two columns.
- **Mobile (< 768 px)**: a compact map; the analysis opens as a bottom sheet (tap the backdrop, the close button or press Escape to dismiss).

Scroll reveals, the hero parallax, count-ups and the chart and bar animations use IntersectionObserver and CSS (no animation library). Each runs once, and everything renders in its final state when the OS requests reduced motion.

## API

| Endpoint | Function in `src/api/client.ts` | Response type (`src/types/reef.ts`) |
|---|---|---|
| `GET /api/reefs` | `listReefs()` | `Reef[]` |
| `GET /api/reefs/{id}` | `getReef(id)` | `Reef` (404 → `null`) |
| `GET /api/reefs/{id}/explanation` | `getExplanation(id)` | `ReefExplanation` (404 → `null`) |
| `GET /api/reefs/{id}/photos` | `getReefPhotos(id)` | `ReefPhoto[]` (404 → `[]`) |
| `POST /api/predict` | `predict(input)` | body `PredictRequest`, returns `PredictResponse` |
| `GET /api/model` | `getModelMetrics()` | `ModelMetrics` |

Non-2xx responses other than 404, and an unreachable API, surface as an `ApiError`, which the UI shows with a "Try again" action.

## Data sync & imagery

- A GitHub Actions workflow (`.github/workflows/data-sync.yml`) refreshes the data: daily at 22:30 UTC for NOAA Coral Reef Watch heat stress, and weekly on Monday at 00:00 UTC for GCBD, MERMAID coral cover and iNaturalist photos. Details, manual runs and caveats are in [`../pipeline/README.md`](../pipeline/README.md).
- Community photos come from iNaturalist (`data/processed/reef_photos.json`, served by `GET /api/reefs/{id}/photos`). Only Creative Commons-licensed photos are used; each shows its photographer and licence and links to its observation. The gallery is captioned "Community photos near this site via iNaturalist — not a record of current reef condition."
- The satellite view uses Esri World Imagery tiles with the attribution Esri requires; review Esri's terms of use before production use. It is always shown, so a reef without photos (or a failed photo request) still has imagery.

## Notes

- Reefs show only the variables the data supports: sea temperature and anomaly, Degree Heating Weeks and current NOAA alert status (NOAA Coral Reef Watch), and coral cover and depth from the nearest surveys (GCBD). There is no human-pressure variable or per-reef confidence score, because neither exists in the source data. Missing values are shown as "n/a", never estimated.
- Feature contributions are in log-odds and sign-flipped from the bleaching model, so positive values raise predicted resilience.
- `React.StrictMode` is intentionally omitted in `main.tsx` to avoid Leaflet's double-mount initialisation error in development.
- Map tiles come from the public OpenStreetMap tile server; respect its [usage policy](https://operations.osmfoundation.org/policies/tiles/) for anything beyond prototyping.
