# ReefSense demo playbook

For whoever presents ReefSense to the judges. About 3 minutes of demo, then questions.

## The one sentence

> Most coral bleaching starts before NOAA's alerts sound. ReefSense predicts which reefs are at risk anyway, explains why, and shows where restoration effort is most likely to last.

## Demo path (≈3 min)

Rehearse this exact path. Every step works offline from the fallback video too.

| # | Do | Say |
|---|---|---|
| 1 | Open the site and let the headline land (5 s). | "In 23,186 dive surveys, the heat at which NOAA's alerts begin was reached in only about 1 in 4 bleaching events. Reefs bleach before the alarm sounds." |
| 2 | **Explore the map** → **Highlight** on the NOAA chip. | "These 851 reefs are at elevated risk right now, yet NOAA's alerts stayed silent for 12 weeks." Click **Show all**. |
| 3 | Click **Crystal Bay** in the suggestions. | "Our case study, Nusa Penida in Bali. 86% chance it avoids significant bleaching." |
| 4 | Switch to **Plain language**. | "Every estimate explains itself, for scientists and for everyone else." Switch back to **Expert** and point at the bars: "these are the reasons, straight from the model." |
| 5 | Scroll to **Where to restore first**; drag **Healthy coral cover** up. | "Restoration takes years. This ranks reefs where effort is most likely to last. The weights are yours; nothing is hidden. Reefs without a dive survey are left out, not guessed." |
| 6 | Scroll to **Insights**; drag the heat slider to ~8. | "This is what 8 degree heating weeks does: the branching corals go first and the fish leave." **Cool it down.** (Keep this under 15 s.) |
| 7 | Scroll a little to the skill sentence and the test table. | "Tested on data it never saw: later years, the 2016 global event, an unseen Indonesia. It beats heat alone in each, except Japan, where heat alone does as well. We show that too." |
| 8 | End on **What you can do**. | "Report what you see, back protected reefs, share a reef. Thank you." |

## Numbers you can quote (all from this repo)

| Claim | Value | Source |
|---|---|---|
| Training surveys | 23,186 | `data/processed/model_metrics_global.json` |
| Bleaching events where peak heat reached NOAA's 4 DHW alert level | 26% globally, 22% in the Coral Triangle | same file, `baseline_dhw.dhw_ge_4.recall` |
| Model vs heat alone, regions never seen | 0.75 vs 0.68 (AUC) | same file |
| Indonesia never seen in training | 0.74 vs 0.68 | `data/processed/model_validation.json` |
| 2016 global bleaching event, unseen | 0.77 vs 0.73 | same |
| Later years 2013–2020, unseen | 0.82 vs 0.78 | same |
| Japan never seen (honest loss) | 0.76 vs 0.77 | same |
| At-risk reefs with no NOAA alert | 851 | `/api/noaa-gap` |
| Reefs mapped | 3,780 in 37 countries, mostly across Asia; 635 in Indonesia | `/api/reefs` |

"0.75" in plain words: shown two surveys where only one found bleaching, the model picks the bleached one 75% of the time. 50% is a coin toss.

⚠️ The README's "about 64% of Indonesian bleaching happened below 4 DHW (8,424 observations)" cites "recent work" without a reference. Find the paper before quoting it on stage, or quote the 1-in-4 figure above, which comes from our own data.

## Hard questions

- **"0.75 isn't very high."** Agreed, and we don't sell the number. We sell the comparison: it beats the alert system people use today, on regions, years and an event it never saw. Bleaching depends on things no satellite sees; that's why every estimate says "prediction, not observation".
- **"Why trust it in Indonesia?"** We held Indonesia out completely and tested on it: 0.74 vs 0.68 for heat alone.
- **"Where does it fail?"** Japan: there, heat alone does as well. It's in the table on purpose.
- **"Who would use this?"** Restoration teams choosing sites, and marine-park managers deciding where to look first. The ranking is the tool for them. *(Strongest if you can name a real conversation; see the outreach email below.)*
- **"Why aren't climate refuges or connectivity in the ranking?"** The method supports them; we haven't loaded that data yet, so we leave them out rather than fake them.
- **"Coral cover from 2009?"** Many dive surveys are old. The ranking shows each survey's year and distance so you can judge it, and it never scores a reef without one.

## Before you present

- [ ] Open the live site 10 minutes before. The Azure app keeps one replica warm (`--min-replicas 1`), but the map tiles and photos load from Esri and iNaturalist.
- [ ] Reset the page: reload once, so the slider, filters and open reef are back to default.
- [ ] Bring a phone hotspot in case the venue Wi-Fi is slow.
- [ ] Have the fallback video open in a tab: `demo/reefsense-demo-fallback.webm` (≈70 s, the path above, no sound). It was recorded headless, so motion is less smooth than live; re-record with a screen recorder on your laptop if you have time.
- [ ] Local backup: `uvicorn main:app --port 8000` in `backend/` and `npm run preview` in `reefsense/` serve the same app without the cloud.
- [ ] Shareable link ready to paste: `<your site>/?reef=NP01` opens Crystal Bay directly.

## Outreach email (send this week)

A one-line reply from a real organisation is worth more than another feature. Draft, to the Coral Triangle Center (they work on Nusa Penida's marine protected area; contact via coraltrianglecenter.org):

> **Subject:** Student project: bleaching-risk map for Nusa Penida, 2 minutes of your view?
>
> Hello,
>
> We're a student team building ReefSense, a free map that predicts near-term coral bleaching risk for reefs in Indonesia, including Nusa Penida, and ranks where restoration effort is most likely to last. Our model is tested on regions and years it never saw and outperforms heat-stress alerts alone.
>
> Would you be willing to look at it for two minutes and tell us whether a ranking like this would help your team choose sites, and what's missing? Even a one-line reply would help us a lot.
>
> Live site: <link> · Crystal Bay example: <link>/?reef=NP01
>
> Thank you,
> <names>

Only quote a reply on stage with their permission, and quote it exactly.
