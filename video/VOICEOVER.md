# ReefSense demo: voiceover script

Generated from `src/timeline.ts` (the same text as the captions). Total length 3:27.
Read at a calm pace; each line starts at its timestamp. Record as `public/voiceover.mp3`, then render with `--props='{"voiceover":true}'`.

## 0:00 · Hook

- **0:00** Coral reefs bleach when the ocean stays too hot for too long.
- **0:04** And most bleaching starts before the alarm sounds.

## 0:08 · Problem

- **0:08** Scientists track heat stress in Degree Heating Weeks: how hot the water has been, and for how long.
- **0:16** NOAA's alerts start escalating at 4 Degree Heating Weeks.
- **0:20** But in 23,186 dive surveys, that level was reached in only about 1 in 4 bleaching events.
- **0:27** In Indonesia, at the heart of the Coral Triangle, restoration teams have small budgets and need to know where their work will last.

## 0:33 · Solution

- **0:33** ReefSense uses AI to estimate bleaching risk for 3,780 reefs, explains every estimate,
- **0:39** and ranks where restoration effort is most likely to last.

## 0:44 · Live at reefsense.online

- **0:44** This is the live site. One click takes you to the map.

## 0:52 · The NOAA gap

- **0:53** Every reef is scored from the last 12 weeks of NOAA satellite heat stress.
- **0:58** 851 reefs are at elevated risk right now, yet NOAA's alerts stayed silent for 12 weeks.
- **1:06** Our case study: Crystal Bay, Nusa Penida, in Bali.

## 1:13 · Explainable AI

- **1:14** An 86% chance Crystal Bay avoids significant bleaching under recent heat.
- **1:18** Plain language: every estimate explains itself, for scientists and for everyone else.
- **1:23** The expert view adds the satellite heat record and a what-if heat scenario...
- **1:32** ...and the model's reasons: what pushed this estimate up, and what pulled it down.
- **1:40** These come straight from the trained model, not from a chatbot.

## 1:47 · Where to restore first

- **1:47** Restoration takes years, so this ranks reefs where effort is most likely to last.
- **1:53** Give more weight to healthy coral cover, and the ranking updates. The weights are yours.
- **1:58** Reefs without a dive survey are left out, not guessed.

## 2:02 · What if the water gets hotter?

- **2:03** What does more heat do to a reef?
- **2:12** At 8 Degree Heating Weeks, branching corals bleach first and the fish leave.
- **2:16** Cool it back down, and the reef recovers in the illustration. It is a picture of how bleaching spreads, not a forecast.

## 2:26 · Tested on data it never saw

- **2:27** Shown two surveys where only one bleached, the model picks the bleached one 75% of the time. Heat alone: 68%.
- **2:33** In Japan, heat alone does as well, and we show that too.

## 2:38 · What you can do

- **2:39** And anyone can act: report what you see, back protected reefs, share a reef.

## 2:47 · How

- **2:47** Under the hood: live NOAA heat stress, 23,186 labelled dive surveys and each reef's own conditions...
- **2:54** ...feed a LightGBM model. Its per-feature contributions are the explanations you just saw.

## 3:02 · Results

- **3:03** We tested it the hard way: on later years, the 2016 global bleaching event, and an Indonesia it never saw.
- **3:10** It beats heat alone in each, except Japan. We report that too.

## 3:16 · Close

- **3:16** Built for restoration teams choosing sites, and marine-park managers deciding where to look first.
- **3:22** ReefSense. See the risk before the alarm.

_432 words._
