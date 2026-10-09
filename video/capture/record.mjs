// Records the real ReefSense site, shot by shot, for the Remotion demo video.
//   node record.mjs            (SITE=https://... to record another deployment)
// Writes ../public/clips/<name>.webm and ../public/clips/clips.json ({name: {startMs, endMs}}):
// the trim points skip each shot's page load, so Remotion only shows the action.
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

async function moveTo(page, x, y, ms = 700) {
  const from = { ...mouse }, steps = Math.max(10, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps);
    await page.mouse.move(from.x + (x - from.x) * t, from.y + (y - from.y) * t);
    await page.waitForTimeout(ms / steps);
  }
  mouse = { x, y };
}

async function center(locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error("element not visible: " + locator);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, box: b };
}

async function click(page, locator, pause = 1200) {
  const { x, y } = await center(locator);
  await moveTo(page, x, y);
  await page.waitForTimeout(150);
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

// Drag a range input's thumb to a value, slowly enough that React updates along the way.
async function drag(page, range, value, ms = 2200) {
  const { box } = await center(range);
  const [min, max, cur] = await range.evaluate((el) => [+el.min || 0, +el.max || 100, +el.value]);
  const px = (v) => box.x + 10 + ((v - min) / (max - min)) * (box.width - 20);
  const y = box.y + box.height / 2;
  await moveTo(page, px(cur), y);
  await page.mouse.down();
  const steps = Math.round(ms / 30);
  for (let i = 1; i <= steps; i++) {
    const v = cur + (value - cur) * ease(i / steps);
    mouse = { x: px(v), y };
    await page.mouse.move(mouse.x, y);
    await page.waitForTimeout(ms / steps);
  }
  await page.mouse.up();
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

// Narration lengths (scripts/voiceover.ts), so a shot can wait for each of its lines to finish.
const VO = (() => {
  try { return JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../public/voiceover/lines.json"), "utf8")); }
  catch { return {}; }
})();
const GAP = 0.35; // seconds of quiet between one narrated line and the next

const marks = JSON.parse(fs.readFileSync(path.join(OUT,"clips.json"),"utf8"));
// `prep` runs before the trim point (not in the video): use it to load what the shot will show.
// `run(page, beat, until)`: beat(key, locator?) logs the moment (and where the element is) to
// clips.json, place(key, locator) adds the position later; until(s) waits until s seconds into the shot.
async function shot(browser, name, url, run, prep) {
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
  await run(page, beat, until, place);
  const endMs = Date.now() - t0;
  const video = page.video();
  await ctx.close();
  fs.renameSync(await video.path(), path.join(OUT, `${name}.webm`));
  marks[name] = { startMs, endMs, ...(Object.keys(beats).length ? { beats } : {}) };
  console.log(`${name}: ${((endMs - startMs) / 1000).toFixed(1)} s`, Object.keys(beats).length ? JSON.stringify(beats) : "");
}

const browser = await chromium.launch();
try {
  // 1. Hero, then into the map.
  await shot(browser, "01-hero", SITE + "/", async (page) => {
    await page.waitForTimeout(4500);
    await click(page, page.getByRole("button", { name: "Explore the map" }), 2500);
  });

  // 2. The NOAA gap: highlight the 851 reefs NOAA's alerts missed, then open Crystal Bay.
  await shot(browser, "02-noaa-gap", SITE + "/", async (page) => {
    await page.evaluate(() => document.querySelector("#explore").scrollIntoView());
    await page.waitForTimeout(1200);
    await click(page, page.getByRole("button", { name: "Highlight" }), 4500);
    const all = page.getByRole("button", { name: /show all/i });
    if (await all.count()) await click(page, all.first(), 1500);
    await click(page, page.getByRole("button", { name: /^Crystal Bay/ }), 4000);
  });

  // 3. Crystal Bay: plain language, then the model's reasons (expert view).
  await shot(browser, "03-reef", SITE + "/?reef=NP01", async (page) => {
    await page.evaluate(() => document.querySelector("#explore").scrollIntoView());
    await page.waitForTimeout(2500);
    await click(page, page.getByRole("button", { name: "Plain language" }), 3500);
    await click(page, page.getByRole("button", { name: "Expert" }), 1500);
    // The panel's own scroll container (Explore.tsx: "scroll-subtle ... lg:overflow-y-auto").
    const target = page.getByText("Model explanation", { exact: true }).first();
    const sc = page.locator(".scroll-subtle").filter({ has: target }).last();
    const box = await sc.boundingBox();
    if (box) await moveTo(page, box.x + box.width / 2, box.y + box.height * 0.6);
    const dist = await target.evaluate((el) => {
      const s = el.closest(".scroll-subtle");
      return el.getBoundingClientRect().top - s.getBoundingClientRect().top - 24;
    });
    // In three eased steps: predictors, heat chart, then the model's reasons.
    for (const part of [0.35, 0.35, 0.3]) {
      await scrollInside(page, sc, dist * part, 1300);
      await page.waitForTimeout(2200);
    }
    await page.waitForTimeout(2500);
  });

  // 4. The rest of the dashboard: the map tools, "Support reef conservation" (the donation links),
  //    the field record and news, then the reef imagery (satellite view + community photos).
  //    Paced by its narration: each step waits for its line to finish (timeline.ts reads the beats).
  const panelOf = (page) => page.locator(".scroll-subtle").filter({ has: page.getByRole("heading", { name: "Crystal Bay" }) }).last();
  await shot(browser, "04-dashboard", SITE + "/?reef=NP01", async (page, beat, until, place) => {
    const line = (i) => VO.dashboard?.[i]?.seconds ?? 5;
    await page.waitForTimeout(600);

    // Line 1: filter the map, then colour it by coral cover.
    const filter = page.getByRole("group", { name: "Filter reefs by predicted resilience" });
    const t1 = await beat("tools", filter);
    await click(page, filter.getByRole("button", { name: /^High predicted resilience/ }), 1100);
    await click(page, filter.getByRole("button", { name: /^All reefs/ }), 500);
    const coral = page.getByRole("group", { name: "Colour reefs by" }).getByRole("button", { name: "Coral cover" });
    await beat("legend", coral);
    await click(page, coral, 600);
    await until(t1 + line(0) + GAP);

    // Line 2: the donation links under the reef's name, and the note that ReefSense handles no money.
    const support = page.getByRole("button", { name: "Support reef conservation" });
    const t2 = await beat("support", support);
    await click(page, support, 700);
    const list = page.getByRole("region", { name: "Community reef conservation" });
    await beat("orgs", list);
    const firstOrg = list.getByRole("link").first();
    await moveTo(page, (await center(firstOrg)).x, (await center(firstOrg)).y, 700);
    await until(t2 + line(1) * 0.5);
    const disclaimer = list.getByText(/does not receive or handle donations/);
    await beat("disclaimer", disclaimer);
    await moveTo(page, (await center(disclaimer)).x + 60, (await center(disclaimer)).y + 4, 900);
    await until(t2 + line(1) + GAP);

    // Line 3: further down the panel, past bleaching surveys and coral news.
    const panel = panelOf(page);
    const surveys = page.getByRole("region", { name: "Past bleaching surveys" });
    const t3 = await beat("surveys");
    await scrollPanelTo(page, panel, surveys, 76, 1600);
    await place("surveys", surveys);
    await moveTo(page, (await center(surveys)).x + 40, (await center(surveys)).y + 20, 700);
    await until(t3 + line(2) * 0.55);
    const news = page.getByRole("region", { name: "Coral news for this region" });
    await beat("news");
    await scrollPanelTo(page, panel, news, 76, 900);
    await place("news", news);
    await until(t3 + line(2) + GAP);

    // Line 4: reef imagery, the satellite view and the iNaturalist photos.
    const imagery = page.locator("section", { has: page.getByRole("heading", { name: "Reef imagery" }) }).last();
    const t4 = await beat("imagery");
    await scrollPanelTo(page, panel, imagery, 76, 1300);
    await place("imagery", imagery);
    const photo = imagery.locator("ul img").nth(1);
    if (await photo.count()) await moveTo(page, (await center(photo)).x, (await center(photo)).y, 900);
    await until(t4 + line(3) + 1.4);
  }, async (page) => {
    // Load everything the tour will show (support list, surveys, news, lazy photos and satellite tiles).
    await page.evaluate(() => document.querySelector("#explore").scrollIntoView());
    await page.getByRole("button", { name: "Support reef conservation" }).waitFor({ timeout: 30000 });
    const panel = panelOf(page);
    await panel.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(3500);
    await page.locator("section", { has: page.getByRole("heading", { name: "Reef imagery" }) }).last().locator("ul img").first().waitFor({ timeout: 15000 }).catch(() => {});
    await panel.evaluate((el) => el.scrollTo(0, 0));
    await page.waitForTimeout(1200);
  });

  // 5. Where to restore first: raise the weight on healthy coral cover.
  await shot(browser, "05-restore", SITE + "/", async (page) => {
    const sec = page.locator("#restore");
    await page.evaluate(() => scrollTo(0, document.querySelector("#restore").getBoundingClientRect().top + scrollY - 400));
    await page.waitForTimeout(800);
    await scrollTo(page, sec, 90, 1500);
    await page.waitForTimeout(1500);
    const ranges = sec.locator("input[type=range]");
    const n = await ranges.count();
    let coral = ranges.nth(n - 1);
    for (let i = 0; i < n; i++) {
      const label = await ranges.nth(i).evaluate((el) => (el.labels?.[0]?.innerText || el.getAttribute("aria-label") || el.closest("label,div")?.innerText || "").toLowerCase());
      if (label.includes("coral")) { coral = ranges.nth(i); break; }
    }
    const max = await coral.evaluate((el) => +el.max || 100);
    await drag(page, coral, max * 0.9, 2600);
    await page.waitForTimeout(3500);
  });

  // 6. Insights: what 8 degree heating weeks does, then cool it down.
  await shot(browser, "06-heat", SITE + "/", async (page) => {
    const range = page.locator("#insights input[type=range]").first();
    await page.evaluate(() => scrollTo(0, document.querySelector("#insights input[type=range]").getBoundingClientRect().top + scrollY - 700));
    await page.waitForTimeout(800);
    await scrollTo(page, range, 420, 1200);
    await page.waitForTimeout(1200);
    await drag(page, range, 8, 3000);
    await page.waitForTimeout(3500);
    await drag(page, range, 0, 1800);
    await page.waitForTimeout(1500);
  });

  // 7. Tested on data it never saw (the skill sentence and the stress-test table).
  await shot(browser, "07-skill", SITE + "/", async (page) => {
    const head = page.getByText(/Shown two reef surveys/i).first();
    await page.evaluate(() => scrollTo(0, document.querySelector("#insights").getBoundingClientRect().top + scrollY));
    await page.waitForTimeout(800);
    await scrollTo(page, head, 140, 1800);
    await page.waitForTimeout(3000);
    const japan = page.getByText(/Japan, never seen/i).first();
    await moveTo(page, (await center(japan)).x, (await center(japan)).y, 1200);
    await page.waitForTimeout(3000);
  });

  // 8. What you can do.
  await shot(browser, "08-act", SITE + "/", async (page) => {
    await page.evaluate(() => scrollTo(0, document.querySelector("#act").getBoundingClientRect().top + scrollY - 500));
    await page.waitForTimeout(800);
    await scrollTo(page, page.locator("#act"), 90, 1600);
    await page.waitForTimeout(4500);
  });
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, "clips.json"), JSON.stringify(marks, null, 2));
}
