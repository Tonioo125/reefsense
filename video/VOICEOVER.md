# ReefSense demo: voiceover script

Generated from `src/timeline.ts` by `node scripts-voiceover.mjs` (the same text as the captions). Total length 3:52.
The narration is synthesised line by line with Kokoro TTS (`bun scripts/voiceover.ts`, voice af_heart) into the files below,
and each file starts on its caption. To use a human voice instead, record each line into the same file, then run
`bun scripts/voiceover.ts --measure`.

## 0:00 · Hook

- **0:00** Coral reefs bleach when the ocean stays too hot for too long. <sub>`voiceover/hook-1.mp3`, 3.3 s</sub>
- **0:04** And most bleaching starts before the alarm sounds. <sub>`voiceover/hook-2.mp3`, 2.5 s</sub>

## 0:08 · Problem

- **0:08** Scientists track heat stress in Degree Heating Weeks: how hot the water has been, and for how long. <sub>`voiceover/problem-1.mp3`, 5.0 s</sub>
- **0:14** NOAA's alerts start escalating at 4 Degree Heating Weeks. <sub>`voiceover/problem-2.mp3`, 3.2 s</sub>
- **0:17** But in 23,186 dive surveys, that level was reached in only about 1 in 4 bleaching events. <sub>`voiceover/problem-3.mp3`, 7.3 s</sub>
- **0:25** In Indonesia, at the heart of the Coral Triangle, restoration teams have small budgets and need to know where their work will last. <sub>`voiceover/problem-4.mp3`, 7.0 s</sub>

## 0:33 · Solution

- **0:33** ReefSense uses AI to estimate bleaching risk for 3,780 reefs, explains every estimate, <sub>`voiceover/solution-1.mp3`, 6.9 s</sub>
- **0:41** and ranks where restoration effort is most likely to last. <sub>`voiceover/solution-2.mp3`, 3.1 s</sub>

## 0:45 · Live at reefsense.online

- **0:45** This is the live site. One click takes you to the map. <sub>`voiceover/hero-1.mp3`, 2.9 s</sub>

## 0:53 · The NOAA gap

- **0:53** Every reef is scored from the last 12 weeks of NOAA satellite heat stress. <sub>`voiceover/gap-1.mp3`, 4.0 s</sub>
- **0:58** 851 reefs are at elevated risk right now, yet NOAA's alerts stayed silent for 12 weeks. <sub>`voiceover/gap-2.mp3`, 6.3 s</sub>
- **1:06** Our case study: Crystal Bay, Nusa Penida, in Bali. <sub>`voiceover/gap-3.mp3`, 3.1 s</sub>

## 1:14 · Explainable AI

- **1:14** An 86% chance Crystal Bay avoids significant bleaching. <sub>`voiceover/reef-1.mp3`, 3.9 s</sub>
- **1:18** Plain language: every estimate explains itself, for scientists and for everyone else. <sub>`voiceover/reef-2.mp3`, 4.8 s</sub>
- **1:24** The expert view adds the satellite heat record and a what-if heat scenario... <sub>`voiceover/reef-3.mp3`, 4.0 s</sub>
- **1:33** ...and the model's reasons: what pushed this estimate up, and what pulled it down. <sub>`voiceover/reef-4.mp3`, 3.6 s</sub>
- **1:40** These come straight from the trained model, not from a chatbot. <sub>`voiceover/reef-5.mp3`, 2.9 s</sub>

## 1:47 · Inside the dashboard

- **1:48** The dashboard: every reef on the map, its report alongside. Filter it, or colour it by coral cover. <sub>`voiceover/dashboard-1.mp3`, 5.4 s</sub>
- **1:54** Support reef conservation lists hand-picked local groups and their own donation pages. ReefSense never handles the money. <sub>`voiceover/dashboard-2.mp3`, 6.9 s</sub>
- **2:01** Further down: past bleaching surveys nearby, and coral news from the region. <sub>`voiceover/dashboard-3.mp3`, 4.0 s</sub>
- **2:05** And reef imagery: a satellite view, plus openly licensed community photos from iNaturalist. <sub>`voiceover/dashboard-4.mp3`, 5.4 s</sub>

## 2:12 · Where to restore first

- **2:12** Restoration takes years, so this ranks reefs where effort is most likely to last. <sub>`voiceover/restore-1.mp3`, 4.4 s</sub>
- **2:18** Give more weight to healthy coral cover, and the ranking updates. The weights are yours. <sub>`voiceover/restore-2.mp3`, 4.4 s</sub>
- **2:23** Reefs without a dive survey are left out, not guessed. <sub>`voiceover/restore-3.mp3`, 2.7 s</sub>

## 2:27 · What if the water gets hotter?

- **2:28** What does more heat do to a reef? <sub>`voiceover/heat-1.mp3`, 1.6 s</sub>
- **2:37** At 8 Degree Heating Weeks, branching corals bleach first and the fish leave. <sub>`voiceover/heat-2.mp3`, 4.0 s</sub>
- **2:41** Cool it back down, and the reef recovers in the illustration. It is a picture of how bleaching spreads, not a forecast. <sub>`voiceover/heat-3.mp3`, 6.1 s</sub>

## 2:51 · Tested on data it never saw

- **2:52** Shown two surveys where only one bleached, the model picks the bleached survey 75% of the time. Heat alone: 68%. <sub>`voiceover/skill-1.mp3`, 7.7 s</sub>
- **3:00** In Japan, heat alone does as well, and we show that too. <sub>`voiceover/skill-2.mp3`, 3.1 s</sub>

## 3:03 · What you can do

- **3:04** And anyone can act: report what you see, back protected reefs, share a reef. <sub>`voiceover/act-1.mp3`, 3.9 s</sub>

## 3:12 · How

- **3:12** Under the hood: live NOAA heat stress, 23,186 labelled dive surveys and each reef's own conditions... <sub>`voiceover/how-1.mp3`, 7.2 s</sub>
- **3:20** ...feed a LightGBM model. Its per-feature contributions are the explanations you just saw. <sub>`voiceover/how-2.mp3`, 5.2 s</sub>

## 3:27 · Results

- **3:27** We tested it the hard way: on later years, the 2016 global bleaching event, and an Indonesia it never saw. <sub>`voiceover/results-1.mp3`, 6.2 s</sub>
- **3:35** It beats heat alone in each, except Japan. We report that too. <sub>`voiceover/results-2.mp3`, 3.6 s</sub>

## 3:41 · Close

- **3:41** Built for restoration teams choosing sites, and marine-park managers deciding where to look first. <sub>`voiceover/close-1.mp3`, 5.5 s</sub>
- **3:47** ReefSense. See the risk before the alarm. <sub>`voiceover/close-2.mp3`, 2.5 s</sub>

_489 words._
