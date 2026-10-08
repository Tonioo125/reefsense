---
version: 1
slug: "reefresilience-src-pages-explore-tsx"
primary_target: "reefresilience/src/pages/Explore.tsx"
related_targets: ["reefresilience/src/components/Hero.tsx"]
---

# ReefSense single page (hero + explorer + insights + about)

Scope: the one-page app. Hero is Persuade; the map and analysis panel are Operate; Insights/About are Read.
Audience: hackathon judges, one pass, often projected. Job: grasp the problem, see real explainable predictions, trust the numbers.
Constraints: every number from the API; spec copy kept (language.test.ts); photo credit visible (CC BY-SA 4.0, Akbar raf, Wikimedia Commons).
Pinned direction: the user's Dribbble reference (Ocevia hero) for composition: photo in an inset rounded frame, centred sans + italic-serif headline, one pill action, quiet centred nav. User then asked for LIGHT MODE across the whole page including the hero (binding), and for the Plain language / Expert switch to move to the top of the analysis panel. Hero photo must show coral reefs (user rejected a coastline photo).

## Direction contract

THESIS: The page is a dive into the reef: you start at the sunlit surface over a real Raja Ampat reef and descend into the data. It refuses the light-teal SaaS page with a hero over a row of cards.
OWN-WORLD: Daylight: pale cool ground (#F3F8FB), white panels inside rounded inset frames with hairline lines (#D3E2EC), deep-navy ink type (#0A2540), reef teal (#0B7285) for links and the italic clause, ocean blue (#0E5E8C) / ink for filled actions, coral only for heat and risk. Inter for structure, Fraunces italic for the human clause in every heading.
STORY: The visitor sees the reef from above, reads the one-line premise, presses Explore, lands on a daylight map of the Indo-Pacific reefs, opens one, flips Plain language / Expert at the top of the panel, then reads the model's skill and its limits.
FIRST VIEWPORT: Full-height inset frame, underwater photo of the Arborek reef (Raja Ampat) with a pale surface wash from the top, a thin band of photo around the inner panel. Logo left, three links centred, dataset pill right. Headline centred at 40-45% height, two lines sans, one line italic serif, max about 5.5rem. One paragraph, one solid ink pill "Explore the map" centred below. Photo credit tiny bottom-right.
FORM: Pinned by the user (Dribbble reference), extended to the whole page as the deep-water world; no concept-seed roll, pinned direction. Signature interaction: the dive (photo zooms and the frame tightens as you scroll, content rises out, caustic light drifts over the water), word-masked headline entrance, masked heading reveals per section.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
