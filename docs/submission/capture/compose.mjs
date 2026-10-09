// Builds the figures in ../images/ from the screenshots in raw/ (screenshots.mjs) and architecture.html.
//   node compose.mjs
// A figure is a PNG, or a JPEG (quality 90) when the PNG would be over MAX_BYTES, so every image stays
// within common upload limits.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const HERE = import.meta.dirname;
const RAW = path.join(HERE, "raw");
const OUT = path.resolve(HERE, "../images");
const MAX_BYTES = 3.5 * 1024 * 1024;
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/\.(png|jpe?g)$/.test(f)) fs.rmSync(path.join(OUT, f));

const raw = (name) => `raw/${name}.png`; // relative to the temporary page in HERE
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600;700&display=block" rel="stylesheet">`;
const BASE = `
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Inter, sans-serif; color: #0A2540; }
  #fig { display: inline-block; background: linear-gradient(180deg, #EAF5FB 0%, #F3F8FB 70%); padding: 40px 48px 44px; }
  .kicker { font-size: 14px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #0B7285; }
  h1 { font-family: Fraunces, serif; font-weight: 500; font-size: 34px; letter-spacing: -.4px; margin-top: 6px; }
  h1 em { color: #0E5E8C; font-weight: 400; }
  .row { display: flex; gap: 34px; margin-top: 26px; align-items: flex-start; }
  .label { margin-bottom: 12px; }
  .label b { display: block; font-size: 17px; font-weight: 600; }
  .label span { display: block; font-size: 13.5px; color: #4A6378; margin-top: 3px; line-height: 1.35; }
  .shot { display: block; border-radius: 18px; border: 1px solid #D3E2EC; box-shadow: 0 24px 48px -30px rgba(10,37,64,.55); }
`;
const pngSize = (file) => { const b = fs.readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1800, height: 1200 } });
const report = [];

/** Screenshot the page's #fig to images/<name>.png, or .jpg if the PNG is too big. */
async function shoot(name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 20000 });
  const fig = page.locator("#fig");
  let file = path.join(OUT, `${name}.png`);
  await fig.screenshot({ path: file });
  if (fs.statSync(file).size > MAX_BYTES) {
    fs.rmSync(file);
    file = path.join(OUT, `${name}.jpg`);
    await fig.screenshot({ path: file, type: "jpeg", quality: 90 });
  }
  const [w, h] = path.extname(file) === ".png" ? pngSize(file) : (await fig.boundingBox().then((b) => [b.width * 2, b.height * 2]));
  report.push(`${path.basename(file)}  ${Math.round(w)}x${Math.round(h)}  ${(fs.statSync(file).size / 1048576).toFixed(2)} MB`);
}

/** Render an HTML document (written next to raw/, so relative image paths work) and shoot #fig. */
async function figure(name, html) {
  const tmp = path.join(HERE, `.tmp-${name}.html`);
  fs.writeFileSync(tmp, html);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
  await shoot(name);
  fs.rmSync(tmp);
}

/** A full-window screenshot as its own figure: copied as is, or re-encoded as JPEG if too big. */
async function single(name, shot) {
  const src = path.join(RAW, `${shot}.png`);
  if (fs.statSync(src).size <= MAX_BYTES) {
    fs.copyFileSync(src, path.join(OUT, `${name}.png`));
    const [w, h] = pngSize(src);
    report.push(`${name}.png  ${w}x${h}  ${(fs.statSync(src).size / 1048576).toFixed(2)} MB`);
    return;
  }
  const [w, h] = pngSize(src);
  await page.setViewportSize({ width: w / 2, height: h / 2 });
  await figure(name, `<style>*{margin:0}</style><img id="fig" src="${raw(shot)}" style="display:block;width:${w / 2}px;height:${h / 2}px">`);
}

/** Three panel strips side by side, each with a label. */
async function strips(name, kicker, title, items) {
  await page.setViewportSize({ width: 1600, height: 1500 });
  const cols = items.map((it) => `
    <div style="width:420px">
      <div class="label"><b>${it.title}</b><span>${it.sub}</span></div>
      <img class="shot" src="${raw(it.shot)}" style="width:420px">
    </div>`).join("");
  await figure(name, `<!doctype html><html><head>${FONTS}<style>${BASE}</style></head><body>
    <div id="fig"><p class="kicker">${kicker}</p><h1>${title}</h1><div class="row">${cols}</div></div></body></html>`);
}

// --- Figures, in the order PROJECT.md uses them --------------------------------------------------
await page.goto(pathToFileURL(path.join(HERE, "architecture.html")).href, { waitUntil: "networkidle" });
await shoot("13-architecture");
await single("01-landing", "hero");
await single("02-map", "map");
await single("03-noaa-gap", "noaa-gap");
await single("04-reef-report", "reef");
await strips("05-explanations", "Crystal Bay, Nusa Penida · reef report", "Every estimate <em>explains itself</em>", [
  { shot: "panel-plain", title: "Plain language", sub: "What the estimate means, in everyday words" },
  { shot: "panel-heat", title: "Heat record + what-if", sub: "12 weeks of satellite heat stress; the model re-scores the reef at 8 DHW" },
  { shot: "panel-reasons", title: "The model's reasons", sub: "What raised the estimate and what lowered it, straight from the model" },
]);
await strips("06-reef-context", "Crystal Bay, Nusa Penida · reef report", "Beyond the estimate: <em>people, records, pictures</em>", [
  { shot: "panel-support", title: "Support reef conservation", sub: "Hand-picked local groups and their own donation pages" },
  { shot: "panel-surveys", title: "Field record + news", sub: "Past bleaching surveys within 10 km, coral stories from the region" },
  { shot: "panel-imagery", title: "Reef imagery", sub: "Satellite view and openly licensed iNaturalist photos" },
]);
await single("07-bleaching-history", "replay");
await single("08-restore", "restore");
await single("09-heat-illustration", "insights-heat");
await single("10-validation", "validation");
await single("11-what-you-can-do", "act");

// Phones: three screens in a simple device frame.
await page.setViewportSize({ width: 1600, height: 1300 });
const phones = [
  { shot: "mobile-hero", title: "Landing" },
  { shot: "mobile-map", title: "Resilience map" },
  { shot: "mobile-reef", title: "Reef report, as a bottom sheet" },
].map((p) => `
  <div style="text-align:center">
    <div style="width:414px;padding:12px;border-radius:56px;background:#0A2540;box-shadow:0 30px 60px -30px rgba(10,37,64,.7)">
      <img src="${raw(p.shot)}" style="display:block;width:390px;border-radius:44px">
    </div>
    <div class="label" style="margin:18px 0 0"><b>${p.title}</b></div>
  </div>`).join("");
await figure("12-mobile", `<!doctype html><html><head>${FONTS}<style>${BASE}</style></head><body>
  <div id="fig"><p class="kicker">On a phone</p><h1>The same map and report, <em>in the field</em></h1><div class="row" style="gap:48px">${phones}</div></div></body></html>`);

await browser.close();
console.log(report.join("\n"));
fs.writeFileSync(path.join(OUT, "SIZES.txt"), report.join("\n") + "\n");
