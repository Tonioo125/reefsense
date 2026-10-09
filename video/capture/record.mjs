// Records the real ReefSense site, shot by shot, for the Remotion demo video.
//   node record.mjs            (SITE=https://... to record another deployment, ONLY=04-dashboard for one shot)
// Writes ../public/clips/<name>.webm and ../public/clips/clips.json ({name: {startMs, endMs, beats}}):
// the trim points skip each shot's page load, so Remotion only shows the action.
//
// Every shot is paced by its narration (../public/voiceover/lines.json, from scripts/voiceover.ts):
// say.start(i) logs line i's start as beat "l<i+1>", say.end(i) waits until it has been spoken.
// Other beats mark actions (a click, a scroll) and where their element was. src/timeline.ts places
// the captions, voice, camera moves and callouts on these beats, so the video stays in sync however
// fast or slow the recording machine is.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const SITE = (process.env.SITE || "https://www.reefsense.online").replace(/\/$/, "");
const OUT = path.resolve(import.meta.dirname, "../public/clips");
const VIEW = { width: 1920, height: 1080 };
fs.mkdirSync(OUT, { recursive: true });

// A visible cursor and click ripple: headless Chromium draws neither.
const CURSOR = `
addEventListener("DOMContentLoaded", () => {
  const c = document.createElement("div");
  c.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.5L9 19z" fill="#0A2540" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, {position:"fixed", left:"-50px", top:"-50px", zIndex:2147483647, pointerEvents:"none", transform:"translate(-6px,-4px)", filter:"drop-shadow(0 2px 3px rgba(0,0,0,.35))"});
  document.documentElement.appendChild(c);
  addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }, true);
  addEventListener("mousedown", (e) => {
    const r = document.createElement("div");
    Object.assign(r.style, {position:"fixed", left:(e.clientX-22)+"px", top:(e.clientY-22)+"px", width:"44px", height:"44px", borderRadius:"50%", border:"3px solid #1E9E8F", zIndex:2147483646, pointerEvents:"none", transition:"transform .5s ease-out, opacity .5s ease-out"});
    document.documentElement.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = "scale(1.8)"; r.style.opacity = "0"; });
    setTimeout(() => r.remove(), 600);
  }, true);
});`;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let mouse = { x: 960, y: 540 };

// Mouse moves are timed by the clock, not by a step count: each mouse.move waits for the page to
// handle the event, which on a busy CI runner takes far longer than on a laptop.
async function moveTo(page, x, y, ms = 700) {
  const from = { ...mouse }, t0 = Date.now();
  for (;;) {
    const p = Math.min(1, (Date.now() - t0) / ms), t = ease(p);
    await page.mouse.move(from.x + (x - from.x) * t, from.y + (y - from.y) * t);
    if (p >= 1) break;
    await page.waitForTimeout(12);
  }
  mouse = { x, y };
}

async function center(locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error("element not visible: " + locator);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, box: b };
}

/** Move to the element and click it; `onDown` runs just before the press (to log a beat). */
async function click(page, locator, pause = 1200, onDown) {
  const { x, y } = await center(locator);
  await moveTo(page, x, y);
  await page.waitForTimeout(150);
  if (onDown) await onDown();
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(pause);
}

// Eased window scroll so the target sits `offset` px below the top.
async function scrollTo(page, locator, offset = 110, ms = 1600) {
  const y = await locator.evaluate((el, off) => el.getBoundingClientRect().top + scrollY - off, offset);
  await page.evaluate(([to, dur]) => new Promise((done) => {
    const from = scrollY, t0 = performance.now();
    const e = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => { const t = Math.min(1, (now - t0) / dur); scrollTo(0, from + (to - from) * e(t)); t < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  }), [y, ms]);
  await page.waitForTimeout(500);
}

// Eased scroll inside a scrollable element (the reef panel).
async function scrollInside(page, locator, by, ms = 1400) {
  await locator.evaluate((el, [dy, dur]) => new Promise((done) => {
    const from = el.scrollTop, t0 = performance.now();
    const e = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => { const t = Math.min(1, (now - t0) / dur); el.scrollTop = from + dy * e(t); t < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  }), [by, ms]);
  await page.waitForTimeout(400);
}

// Scroll the reef panel so `target` sits `offset` px below the panel's top (under its sticky bar).
async function scrollPanelTo(page, panel, target, offset = 76, ms = 1400) {
  const dy = await target.evaluate((el, off) => {
    const s = el.closest(".scroll-subtle");
    return el.getBoundingClientRect().top - s.getBoundingClientRect().top - off;
  }, offset);
  await scrollInside(page, panel, dy, ms);
}

// Drag a range input's thumb to a value over `ms` (by the clock), so React updates along the way.
async function drag(page, range, value, ms = 2200) {
  const { box } = await center(range);
  const [min, max, cur] = await range.evaluate((el) => [+el.min || 0, +el.max || 100, +el.value]);
  const px = (v) => box.x + 10 + ((v - min) / (max - min)) * (box.width - 20);
  const y = box.y + box.height / 2;
  await moveTo(page, px(cur), y);
  await page.mouse.down();
  const t0 = Date.now();
  for (;;) {
    const p = Math.min(1, (Date.now() - t0) / ms);
    mouse = { x: px(cur + (value - cur) * ease(p)), y };
    await page.mouse.move(mouse.x, y);
    if (p >= 1) break;
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
  await page.waitForTimeout(400);
}

// Narration lengths (scripts/voiceover.ts), so a shot can wait for each of its lines to finish.
const VO = (() => {
  try { return JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../public/voiceover/lines.json"), "utf8")); }
  catch { return {}; }
})();
const GAP = 0.35; // seconds of quiet between one narrated line and the next

const marks = JSON.parse(fs.readFileSync(path.join(OUT, "clips.json"), "utf8"));
// `prep` runs before the trim point (not in the video): use it to position the page and load what
// the shot will show. `run(page, { beat, place, until, say })`, see the top of this file.
async function shot(browser, name, scene, url, run, prep) {
  if (process.env.ONLY && process.env.ONLY !== name) return;
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: VIEW } });
  await ctx.addInitScript(CURSOR);
  const t0 = Date.now();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1500); // fonts, tiles, map markers
  if (prep) await prep(page);
  mouse = { x: 1500, y: 700 };
  await page.mouse.move(mouse.x, mouse.y);
  const startMs = Date.now() - t0;
  const now = () => (Date.now() - t0 - startMs) / 1000;
  const beats = {};
  const place = async (key, locator) => {
    const b = await locator.boundingBox();
    if (b) Object.assign(beats[key], { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) });
  };
  const beat = async (key, locator) => {
    beats[key] = { t: +now().toFixed(2) };
    if (locator) await place(key, locator);
    return beats[key].t;
  };
  const until = async (s) => { const ms = (s - now()) * 1000; if (ms > 0) await page.waitForTimeout(ms); };
  const spoken = (i) => VO[scene]?.[i]?.seconds ?? 4;
  const say = {
    start: (i) => beat(`l${i + 1}`),
    /** Wait until line i has been spoken (plus the gap, plus `extra` seconds). */
    end: (i, extra = 0) => until(beats[`l${i + 1}`].t + spoken(i) + GAP + extra),
    /** Wait until a fraction of line i has been spoken. */
    part: (i, f) => until(beats[`l${i + 1}`].t + spoken(i) * f),
  };
  await run(page, { beat, place, until, say });
  const endMs = Date.now() - t0;
  const video = page.video();
  await ctx.close();
  fs.renameSync(await video.path(), path.join(OUT, `${name}.webm`));
  marks[name] = { startMs, endMs, beats };
  console.log(`${name}: ${((endMs - startMs) / 1000).toFixed(1)} s`, JSON.stringify(beats));
}

const toExplore = async (page) => {
  await page.evaluate(() => document.querySelector("#explore").scrollIntoView());
  await page.waitForTimeout(1000);
};
const panelOf = (page) => page.locator(".scroll-subtle").filter({ has: page.getByRole("heading", { name: "Crystal Bay" }) }).last();

const browser = await chromium.launch();
try {
  // 1. Hero, then into the map.
  await shot(browser, "01-hero", "hero", SITE + "/", async (page, { beat, say }) => {
    await page.waitForTimeout(300);
    await say.start(0);
    await page.waitForTimeout(4000);
    await click(page, page.getByRole("button", { name: "Explore the map" }), 2500, () => beat("explore"));
  });

  // 2. The NOAA gap: highlight the 851 reefs NOAA's alerts missed, then open Crystal Bay.
  await shot(browser, "02-noaa-gap", "gap", SITE + "/", async (page, { beat, say }) => {
    await page.waitForTimeout(300);
    await say.start(0);
    await page.waitForTimeout(900);
    const highlight = page.getByRole("button", { name: "Highlight" });
    await click(page, highlight, 1000, () => beat("highlight", highlight));
    await say.end(0);
    await say.start(1);
    await say.end(1);
    await say.start(2);
    await click(page, page.getByRole("button", { name: /^Crystal Bay/ }), 3000, () => beat("crystal"));
    await say.end(2, 1.2);
  }, toExplore);

  // 3. Crystal Bay: plain language, then the expert view down to the model's reasons.
  await shot(browser, "03-reef", "reef", SITE + "/?reef=NP01", async (page, { beat, until, say }) => {
    await page.waitForTimeout(100);
    await say.start(0);
    await until(2.0);
    await click(page, page.getByRole("button", { name: "Plain language" }), 400, () => beat("plain"));
    await say.end(0);
    await say.start(1);
    await say.end(1);
    await click(page, page.getByRole("button", { name: "Expert" }), 600, () => beat("expert"));
    await say.start(2);
    // The panel's own scroll container (Explore.tsx: "scroll-subtle ... lg:overflow-y-auto").
    const target = page.getByText("Model explanation", { exact: true }).first();
    const sc = page.locator(".scroll-subtle").filter({ has: target }).last();
    const box = await sc.boundingBox();
    if (box) await moveTo(page, box.x + box.width / 2, box.y + box.height * 0.6);
    const dist = await target.evaluate((el) => {
      const s = el.closest(".scroll-subtle");
      return el.getBoundingClientRect().top - s.getBoundingClientRect().top - 24;
    });
    // Predictors and the heat record, then the model's reasons.
    for (const part of [0.35, 0.35]) {
      await scrollInside(page, sc, dist * part, 1300);
      await page.waitForTimeout(800);
    }
    await say.end(2, 0.4);
    await say.start(3);
    await scrollInside(page, sc, dist * 0.3, 1300);
    await beat("reasons");
    await say.end(3);
    await say.start(4);
    await say.end(4, 1.8);
  }, toExplore);

  // 4. The rest of the dashboard: the map tools, "Support reef conservation" (the donation links),
  //    the field record and news, then the reef imagery (satellite view + community photos).
  await shot(browser, "04-dashboard", "dashboard", SITE + "/?reef=NP01", async (page, { beat, place, say }) => {
    await page.waitForTimeout(400);

    // Line 1: across the filter, then colour the map by coral cover.
    const filter = page.getByRole("group", { name: "Filter reefs by predicted resilience" });
    await say.start(0);
    await beat("tools", filter);
    for (const name of [/^High predicted/, /^Medium predicted/, /^Low predicted/]) {
      const c = await center(filter.getByRole("button", { name }));
      await moveTo(page, c.x, c.y, 450);
      await page.waitForTimeout(150);
    }
    const coral = page.getByRole("group", { name: "Colour reefs by" }).getByRole("button", { name: "Coral cover" });
    await click(page, coral, 600, () => beat("legend", coral));
    await say.end(0);

    // Line 2: the donation links under the reef's name, and the note that ReefSense handles no money.
    const support = page.getByRole("button", { name: "Support reef conservation" });
    await say.start(1);
    await click(page, support, 700, () => beat("support", support));
    const list = page.getByRole("region", { name: "Community reef conservation" });
    await list.waitFor();
    await beat("orgs", list);
    const firstOrg = await center(list.getByRole("link").first());
    await moveTo(page, firstOrg.x, firstOrg.y, 700);
    await say.part(1, 0.5);
    const disclaimer = list.getByText(/does not receive or handle donations/);
    await beat("disclaimer", disclaimer);
    const d = await center(disclaimer);
    await moveTo(page, d.x + 60, d.y + 4, 900);
    await say.end(1);

    // Line 3: further down the panel, past bleaching surveys and coral news.
    const panel = panelOf(page);
    const surveys = page.getByRole("region", { name: "Past bleaching surveys" });
    await say.start(2);
    await beat("surveys");
    await scrollPanelTo(page, panel, surveys, 76, 1400);
    await place("surveys", surveys);
    const s = await center(surveys);
    await moveTo(page, s.x + 40, s.y + 20, 600);
    await say.part(2, 0.55);
    const news = page.getByRole("region", { name: "Coral news for this region" });
    await beat("news");
    await scrollPanelTo(page, panel, news, 76, 900);
    await place("news", news);
    await say.end(2);

    // Line 4: reef imagery, the satellite view and the iNaturalist photos. The page also scrolls a
    // little, so the photos at the bottom of the panel clear the captions.
    const imagery = page.locator("section", { has: page.getByRole("heading", { name: "Reef imagery" }) }).last();
    await say.start(3);
    await beat("imagery");
    await Promise.all([scrollPanelTo(page, panel, imagery, 76, 1300), scrollTo(page, page.locator("#explore"), -40, 1300)]);
    await place("imagery", imagery);
    const photo = imagery.locator("ul img").nth(1);
    if (await photo.count()) {
      const p = await center(photo);
      await moveTo(page, p.x, p.y, 900);
    }
    await say.end(3, 1.4);
  }, async (page) => {
    // Load everything the tour will show (support list, surveys, news, lazy photos and satellite tiles).
    await toExplore(page);
    await page.getByRole("button", { name: "Support reef conservation" }).waitFor({ timeout: 30000 });
    const panel = panelOf(page);
    await panel.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(3500);
    await page.locator("section", { has: page.getByRole("heading", { name: "Reef imagery" }) }).last().locator("ul img").first().waitFor({ timeout: 15000 }).catch(() => {});
    await panel.evaluate((el) => el.scrollTo(0, 0));
    await page.waitForTimeout(1200);
  });

  // 5. Where to restore first: raise the weight on healthy coral cover.
  await shot(browser, "05-restore", "restore", SITE + "/", async (page, { beat, say }) => {
    const sec = page.locator("#restore");
    await page.waitForTimeout(300);
    await say.start(0);
    await scrollTo(page, sec, 90, 1500);
    const ranges = sec.locator("input[type=range]");
    const n = await ranges.count();
    let coral = ranges.nth(n - 1);
    for (let i = 0; i < n; i++) {
      const label = await ranges.nth(i).evaluate((el) => (el.labels?.[0]?.innerText || el.getAttribute("aria-label") || el.closest("label,div")?.innerText || "").toLowerCase());
      if (label.includes("coral")) { coral = ranges.nth(i); break; }
    }
    const max = await coral.evaluate((el) => +el.max || 100);
    await say.end(0);
    await say.start(1);
    await beat("drag", coral);
    await drag(page, coral, max * 0.9, 2600);
    await say.end(1);
    await say.start(2);
    await say.end(2, 1.4);
  }, async (page) => {
    await page.evaluate(() => scrollTo(0, document.querySelector("#restore").getBoundingClientRect().top + scrollY - 400));
    await page.waitForTimeout(800);
  });

  // 6. Insights: what 8 degree heating weeks does, then cool it down.
  await shot(browser, "06-heat", "heat", SITE + "/", async (page, { beat, say }) => {
    const range = page.locator("#insights input[type=range]").first();
    await page.waitForTimeout(300);
    await say.start(0);
    await scrollTo(page, range, 420, 1200);
    await page.waitForTimeout(600);
    await beat("hot", range);
    await drag(page, range, 8, 3000);
    await beat("hotEnd");
    await page.waitForTimeout(500);
    await say.end(0);
    await say.start(1);
    await say.end(1, 0.5);
    await say.start(2);
    await beat("cool");
    await drag(page, range, 0, 1800);
    await say.end(2, 1.0);
  }, async (page) => {
    await page.evaluate(() => scrollTo(0, document.querySelector("#insights input[type=range]").getBoundingClientRect().top + scrollY - 700));
    await page.waitForTimeout(800);
  });

  // 7. Tested on data it never saw (the skill sentence and the stress-test table).
  await shot(browser, "07-skill", "skill", SITE + "/", async (page, { beat, say }) => {
    const head = page.getByText(/Shown two reef surveys/i).first();
    await page.waitForTimeout(300);
    await say.start(0);
    await scrollTo(page, head, 140, 1800);
    await beat("table");
    await say.end(0);
    await say.start(1);
    const japan = page.getByText(/Japan, never seen/i).first();
    const j = await center(japan);
    await moveTo(page, j.x, j.y, 1200);
    await beat("japan", japan);
    await say.end(1, 1.2);
  }, async (page) => {
    await page.evaluate(() => scrollTo(0, document.querySelector("#insights").getBoundingClientRect().top + scrollY));
    await page.waitForTimeout(800);
  });

  // 8. What you can do.
  await shot(browser, "08-act", "act", SITE + "/", async (page, { say }) => {
    await page.waitForTimeout(300);
    await say.start(0);
    await scrollTo(page, page.locator("#act"), 90, 1600);
    await say.end(0, 2.2);
  }, async (page) => {
    await page.evaluate(() => scrollTo(0, document.querySelector("#act").getBoundingClientRect().top + scrollY - 500));
    await page.waitForTimeout(800);
  });
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, "clips.json"), JSON.stringify(marks, null, 2));
}
