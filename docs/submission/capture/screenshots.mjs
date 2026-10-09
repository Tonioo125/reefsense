// Screenshots of the live site for docs/submission/PROJECT.md.
//   node screenshots.mjs            (SITE=https://... for another deployment, ONLY=reef to take one shot)
// Writes raw/<name>.png (2x pixel density). compose.mjs then builds the figures in ../images/.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const SITE = (process.env.SITE || "https://www.reefsense.online").replace(/\/$/, "");
const OUT = path.resolve(import.meta.dirname, "raw");
fs.mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Every Leaflet tile and lazy image in view has loaded (or 8 s have passed). */
async function settle(page, extra = 800) {
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    return [...document.querySelectorAll("img.leaflet-tile, img")].filter(inView).every((i) => i.complete);
  }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(extra);
}

/** Scroll the window so `locator`'s top sits `y` px below the top of the viewport. */
async function scrollTop(page, locator, y) {
  await locator.evaluate((el, off) => scrollTo(0, el.getBoundingClientRect().top + scrollY - off), y);
  await page.waitForTimeout(1600); // scroll reveals (Reveal.tsx) and count-ups
}

/** Scroll the reef panel so `target` sits just under its sticky bar. */
async function panelTo(page, target, offset = 66) {
  await target.evaluate((el, off) => {
    const s = el.closest(".scroll-subtle");
    s.scrollTop += el.getBoundingClientRect().top - s.getBoundingClientRect().top - off;
  }, offset);
  await page.waitForTimeout(900);
}

/** Drag a range input to `value` with the mouse, so React sees every step. */
async function drag(page, range, value, ms = 900) {
  const box = await range.boundingBox();
  const [min, max, cur] = await range.evaluate((el) => [+el.min || 0, +el.max || 100, +el.value]);
  const px = (v) => box.x + 10 + ((v - min) / (max - min)) * (box.width - 20);
  const y = box.y + box.height / 2;
  await page.mouse.move(px(cur), y);
  await page.mouse.down();
  const t0 = Date.now();
  for (;;) {
    const p = Math.min(1, (Date.now() - t0) / ms);
    await page.mouse.move(px(cur + (value - cur) * ease(p)), y);
    if (p >= 1) break;
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
  await page.mouse.move(5, 5); // no hover state left behind
}

const toExplore = async (page) => {
  await page.evaluate(() => document.querySelector("#explore").scrollIntoView());
  await page.waitForTimeout(1200);
};
const panel = (page) => page.locator('aside[aria-label="Reef analysis"]');
const reefReady = async (page) => {
  await page.getByRole("heading", { name: "Crystal Bay" }).first().waitFor({ timeout: 30000 });
  await page.getByText("Model explanation", { exact: true }).first().waitFor({ timeout: 30000 }).catch(() => {});
};

const shots = [];
const shot = (name, opts, run) => shots.push({ name, opts, run });
const snap = async (page, name, clip) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), clip, animations: "allow" });
  console.log("wrote", name);
};
const box = async (locator) => {
  const b = await locator.boundingBox();
  return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
};

// --- Desktop, full window ----------------------------------------------------------------------
shot("hero", { viewport: DESKTOP }, async (page) => {
  await page.goto(SITE + "/");
  await settle(page, 3500);
  await snap(page, "hero");
});

shot("map", { viewport: DESKTOP }, async (page) => {
  await page.goto(SITE + "/");
  await toExplore(page);
  await settle(page, 1500);
  await snap(page, "map");
  await page.getByRole("button", { name: "Highlight" }).click();
  await page.mouse.move(5, 5);
  await settle(page, 1800);
  await snap(page, "noaa-gap");
});

shot("reef", { viewport: DESKTOP }, async (page) => {
  await page.goto(SITE + "/?reef=NP01");
  await reefReady(page);
  await toExplore(page);
  await settle(page, 1800);
  await snap(page, "reef");
});

shot("replay", { viewport: DESKTOP }, async (page) => {
  await page.goto(SITE + "/");
  await toExplore(page);
  await settle(page, 500);
  await page.getByRole("button", { name: /Replay bleaching history/ }).click();
  const y2016 = page.getByRole("group", { name: "Choose a year" }).getByRole("button", { name: /^2016:/ });
  await y2016.waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
  await y2016.click();
  const pause = page.getByRole("button", { name: "Pause replay" });
  if (await pause.count()) await pause.click();
  await page.mouse.move(5, 5);
  await settle(page, 2000);
  await snap(page, "replay");
});

// --- The reef report, as panel strips (a tall window shows more of each part) ------------------
shot("panel", { viewport: { width: 1440, height: 1240 } }, async (page) => {
  await page.goto(SITE + "/?reef=NP01");
  await reefReady(page);
  await toExplore(page);
  await settle(page, 1200);
  const p = panel(page);
  const clip = await box(p);
  const scroller = p.locator(".scroll-subtle").first();
  const top = async () => { await scroller.evaluate((el) => (el.scrollTop = 0)); await page.waitForTimeout(700); };

  await page.getByRole("button", { name: "Plain language" }).click();
  await top(); await settle(page, 900);
  await snap(page, "panel-plain", clip);

  await page.getByRole("button", { name: "Expert" }).click();
  await page.waitForTimeout(900);
  // Heat record, and the what-if scenario pushed to 8 Degree Heating Weeks (re-scored by the model).
  await panelTo(page, p.locator('[aria-label="Heat stress timeline"]').first());
  const scenario = p.locator('[aria-label="Heat stress scenario"] input[type=range]').first();
  await drag(page, scenario, 8);
  await page.waitForTimeout(2200);
  await snap(page, "panel-heat", clip);

  await panelTo(page, p.getByText("Model explanation", { exact: true }).first(), 76);
  await page.waitForTimeout(1200);
  await snap(page, "panel-reasons", clip);

  await top();
  await page.getByRole("button", { name: "Support reef conservation" }).click();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(900);
  await snap(page, "panel-support", clip);

  await panelTo(page, p.getByRole("region", { name: "Past bleaching surveys" }).first());
  await settle(page, 600);
  await snap(page, "panel-surveys", clip);

  await panelTo(page, p.getByRole("heading", { name: "Reef imagery" }).first(), 70);
  await settle(page, 1500);
  await snap(page, "panel-imagery", clip);
});

// --- Sections further down the page ------------------------------------------------------------
shot("restore", { viewport: { width: 1440, height: 1180 } }, async (page) => {
  await page.goto(SITE + "/");
  await page.locator("#restore").scrollIntoViewIfNeeded();
  await scrollTop(page, page.locator("#restore h2"), 112);
  const cover = page.locator("#restore input[type=range]").nth(1);
  await drag(page, cover, 70);
  await page.waitForTimeout(1200);
  await snap(page, "restore");
});

shot("insights", { viewport: DESKTOP }, async (page) => {
  await page.goto(SITE + "/");
  await page.locator("#insights").scrollIntoViewIfNeeded();
  await scrollTop(page, page.locator("#insights h2"), 112);
  const range = page.locator("#insights input[type=range]").first();
  await drag(page, range, 8, 1500);
  await page.waitForTimeout(3500); // corals bleach and the fish leave
  await snap(page, "insights-heat");
});

shot("validation", { viewport: { width: 1440, height: 1000 } }, async (page) => {
  await page.goto(SITE + "/");
  const head = page.getByText(/Shown two reef surveys/i).first();
  await head.scrollIntoViewIfNeeded();
  await scrollTop(page, head, 120);
  await snap(page, "validation");
});

shot("act", { viewport: DESKTOP }, async (page) => {
  await page.goto(SITE + "/");
  await page.locator("#act").scrollIntoViewIfNeeded();
  await scrollTop(page, page.locator("#act h2"), 140);
  await snap(page, "act");
});

// --- Phone ---------------------------------------------------------------------------------------
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
shot("mobile", PHONE, async (page) => {
  await page.goto(SITE + "/");
  await settle(page, 3000);
  await snap(page, "mobile-hero");
  await toExplore(page);
  await settle(page, 1500);
  await snap(page, "mobile-map");
  await page.goto(SITE + "/?reef=NP01");
  await page.getByRole("dialog").getByRole("heading", { name: "Crystal Bay" }).waitFor({ timeout: 30000 });
  await settle(page, 2200);
  await snap(page, "mobile-reef");
});

const browser = await chromium.launch();
let failed = 0;
try {
  for (const s of shots) {
    if (process.env.ONLY && !process.env.ONLY.split(",").includes(s.name)) continue;
    const ctx = await browser.newContext({ deviceScaleFactor: 2, ...s.opts });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    try {
      await s.run(page);
    } catch (err) {
      failed++;
      console.error(`${s.name} failed:`, err.message);
      await page.screenshot({ path: path.join(OUT, `failed-${s.name}.png`) }).catch(() => {});
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
if (failed) process.exitCode = 1;
