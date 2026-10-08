# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: hackathon judges and evaluators seeing ReefSense in a demo or pitch. They meet it once, for a few minutes, often on a projected screen or a laptop someone else is driving. Their job is to understand the problem, see that the predictions are real and explainable, and judge whether the work is credible and useful. The app has to explain itself without a narrator.

Secondary (implied by the product, not the current audience): reef restoration teams in Indonesia who must decide where limited effort will last.

## Product Purpose

ReefSense shows, for each surveyed reef, a predicted probability that it avoids bleaching (≥ 10% of colonies) under the past 12 weeks of satellite heat stress, explains what drove each estimate, and supports restoration prioritisation. Success in the current context: a judge leaves convinced that the problem is real (most Indonesian bleaching happens below NOAA's alert thresholds), that the model adds skill beyond heat alone, and that every number on screen is traceable.

## Positioning

Standard alerts escalate at 4 degree heating weeks (DHW), yet about 64% of recorded Indonesian bleaching happened below that level. ReefSense combines live NOAA Coral Reef Watch heat stress with local site conditions (turbidity, depth, exposure, cyclone history) in a LightGBM model validated by ecoregion, by later years and by unseen countries, and beats DHW alone on most of those tests. Each prediction carries its own feature-contribution explanation and a statement of how well nearby survey data supports it.

## Operating Context

- Live demo in a pitch; one shared Docker image serves the web app and the FastAPI backend from one URL (Azure Container Apps, Google Cloud Run or Fly.io).
- Single-page app: Explore (resilience map, reef analysis panel), Insights, About. Supporting views include a heat timeline, a heat scenario tool, survey history, a bleaching-history replay map, a NOAA-gap banner/note and regional coral news.
- Geographic scope: about 3,756 surveyed reefs across 26 Asian countries, with Indonesia as the focus and Bali / Nusa Penida as the case study.

## Capabilities and Constraints

- Naming: **ReefSense** is the user-facing web app; **ReefCast** is the project, model, pipeline and API. The `reefresilience/` folder is due to be renamed `reefsense/`.
- Stack (existing): React 18, TypeScript, Vite 5, Tailwind CSS 3, shadcn/ui primitives, React Leaflet 4 (requires React 18), Lucide, Recharts, Vitest. Versions are pinned exactly. A legacy single-panel UI remains in `frontend/`.
- No mock or offline mode: every number comes from the trained model and real data; when the API is down the UI says so instead of showing placeholders.
- Satellite pixels are 5 km; training heat metrics (CoRTAD) and live inputs (NOAA CRW) are different products. The estimate is near-term resistance, not a long-term projection.
- UNEP-WCMC reef-area layer: non-commercial, may be shown online only if not downloadable, with citation.
- API surface: `/api/reefs`, `/api/reefs/{id}` (+ `/explanation`, `/heat-history`, `/survey-history`, `/news`), `/api/noaa-gap`, `/api/bleaching-history`, `/api/predict`, `/api/model`.

## Brand Commitments

- Scientific framing is binding and enforced by `reefresilience/src/language.test.ts`: values are a "predicted probability of high climate resilience", never a "resilience score", and the model never "proves" resilience. ReefSense supports prioritisation; it does not prove a reef is resilient.
- Honest, plain voice: state limits, show where the model does not add skill (e.g. Japan), cite data sources.
- Existing assets: ReefSense logo and mark in `reefresilience/public/` (`logo.png`, `logo-mark.png`, `ReefSense Tropical Logo.png`, favicons).

## Evidence on Hand

- Model metrics in `data/processed/model_metrics_*.json`; stress-test results from `pipeline/06_validate_model.py` (summarised in the root README): spatial CV ROC AUC 0.754 global vs 0.677 for DHW alone; unseen Indonesia 0.744 vs 0.680.
- Scored sites in `data/processed/sites_scored.json`; labelled surveys from the Global Coral-Bleaching Database.
- Data sources and licences listed in the root README (NOAA CRW, GCBD, Allen Coral Atlas, MERMAID, 50 Reefs+, UNEP-WCMC).
- Hero photo: aerial view of Broken Beach, Nusa Penida (case-study area), by FBilula on Wikimedia Commons, CC BY 4.0; WebP sizes in `reefresilience/public/hero/`. The licence requires the visible credit kept in the hero.
- Absent and not to be fabricated: users, partner organisations, testimonials, field deployments, adoption numbers, press.

## Product Principles

1. Every number is real and traceable; never show a placeholder or invented figure.
2. Explain before asserting: each estimate comes with what drove it and how well it is supported.
3. Be honest about limits; showing where the model fails builds more credibility than hiding it.
4. Lead with the problem a judge can grasp in seconds: bleaching below NOAA's alert threshold.
5. Probability, not verdict: the product supports decisions, it does not make them.
