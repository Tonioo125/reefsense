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

const marks = JSON.parse(fs.readFileSync(path.join(OUT,"clips.json"),"utf8"));
async function shot(browser, name, url, run) {
  if (process.env.ONLY && process.env.ONLY !== name) return;
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: VIEW } });
  await ctx.addInitScript(CURSOR);
  const t0 = Date.now();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1500); // fonts, tiles, map markers
  mouse = { x: 1500, y: 700 };
  await page.mouse.move(mouse.x, mouse.y);
  const startMs = Date.now() - t0;
  await run(page);
  const endMs = Date.now() - t0;
  const video = page.video();
  await ctx.close();
  fs.renameSync(await video.path(), path.join(OUT, `${name}.webm`));
  marks[name] = { startMs, endMs };
  console.log(`${name}: ${((endMs - startMs) / 1000).toFixed(1)} s`);
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

  // 4. Where to restore first: raise the weight on healthy coral cover.
  await shot(browser, "04-restore", SITE + "/", async (page) => {
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

  // 5. Insights: what 8 degree heating weeks does, then cool it down.
  await shot(browser, "05-heat", SITE + "/", async (page) => {
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

  // 6. Tested on data it never saw (the skill sentence and the stress-test table).
  await shot(browser, "06-skill", SITE + "/", async (page) => {
    const head = page.getByText(/Shown two reef surveys/i).first();
    await page.evaluate(() => scrollTo(0, document.querySelector("#insights").getBoundingClientRect().top + scrollY));
    await page.waitForTimeout(800);
    await scrollTo(page, head, 140, 1800);
    await page.waitForTimeout(3000);
    const japan = page.getByText(/Japan, never seen/i).first();
    await moveTo(page, (await center(japan)).x, (await center(japan)).y, 1200);
    await page.waitForTimeout(3000);
  });

  // 7. What you can do.
  await shot(browser, "07-act", SITE + "/", async (page) => {
    await page.evaluate(() => scrollTo(0, document.querySelector("#act").getBoundingClientRect().top + scrollY - 500));
    await page.waitForTimeout(800);
    await scrollTo(page, page.locator("#act"), 90, 1600);
    await page.waitForTimeout(4500);
  });
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, "clips.json"), JSON.stringify(marks, null, 2));
}
