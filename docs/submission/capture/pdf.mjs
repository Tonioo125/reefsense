// Renders ../PROJECT.md (with its images) to ../PROJECT.pdf, A4.
//   node pdf.mjs
// Markdown is converted in the page by marked (pinned, from jsDelivr), so no extra npm packages.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DOC = path.resolve(import.meta.dirname, "..");
const md = fs.readFileSync(path.join(DOC, "PROJECT.md"), "utf8");

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600;700&display=block" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/marked@15.0.12/marked.min.js"></script>
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter, sans-serif; font-size: 9.6pt; line-height: 1.5; color: #0A2540; margin: 0; }
  h1 { font-family: Fraunces, serif; font-weight: 500; font-size: 25pt; line-height: 1.1; letter-spacing: -.3pt; margin: 0 0 8pt; }
  h2 { font-family: Fraunces, serif; font-weight: 600; font-size: 15pt; margin: 20pt 0 6pt; break-after: avoid; }
  h3 { font-size: 11pt; font-weight: 600; margin: 14pt 0 4pt; color: #0B7285; break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  p { margin: 0 0 7pt; }
  ul, ol { margin: 0 0 8pt; padding-left: 16pt; }
  li { margin-bottom: 3pt; }
  a { color: #0E5E8C; text-decoration: none; }
  hr { border: 0; border-top: 1px solid #D3E2EC; margin: 10pt 0 4pt; }
  code { font-family: ui-monospace, Menlo, monospace; font-size: 8.6pt; background: #EEF4F8; padding: 0 3pt; border-radius: 3pt; }
  blockquote { margin: 6pt 0 9pt; padding: 7pt 11pt; background: #F3F8FB; border-left: 3pt solid #0B7285; border-radius: 0 6pt 6pt 0; font-family: ui-monospace, Menlo, monospace; font-size: 8.6pt; }
  blockquote p { margin: 0; }
  table { width: 100%; border-collapse: collapse; margin: 4pt 0 10pt; font-size: 8.6pt; break-inside: avoid; }
  th, td { text-align: left; vertical-align: top; padding: 4pt 6pt; border-bottom: 1px solid #D3E2EC; }
  th { font-weight: 600; background: #F3F8FB; }
  p:has(> img) { margin: 8pt 0 3pt; break-inside: avoid; break-after: avoid; }
  img { display: block; max-width: 100%; max-height: 120mm; margin: 0 auto; border-radius: 5pt; border: 1px solid #D3E2EC; }
  p:has(> img) + p:has(> em:only-child) { font-size: 8.2pt; color: #4A6378; text-align: center; margin-bottom: 11pt; break-before: avoid; }
  body > p:first-of-type strong { font-size: 11pt; font-weight: 500; color: #0E5E8C; }
</style></head><body><main id="doc"></main>
<script>
  document.getElementById("doc").innerHTML = marked.parse(${JSON.stringify(md)});
  window.rendered = true;
</script></body></html>`;

const tmp = path.join(DOC, ".tmp-project.html");
fs.writeFileSync(tmp, html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
page.on("requestfailed", (r) => console.error("failed:", r.url(), r.failure()?.errorText));
await page.waitForFunction(() => window.rendered && [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 })
  .catch(async (err) => {
    console.error(await page.evaluate(() => ({ marked: typeof marked, rendered: !!window.rendered,
      broken: [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.getAttribute("src")) })));
    throw err;
  });
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: path.join(DOC, "PROJECT.pdf"),
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="width:100%;font-family:Inter,sans-serif;font-size:7.5pt;color:#4A6378;padding:0 15mm;display:flex;justify-content:space-between"><span>ReefSense · www.reefsense.online</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
});
await browser.close();
fs.rmSync(tmp);
console.log("wrote PROJECT.pdf", (fs.statSync(path.join(DOC, "PROJECT.pdf")).size / 1048576).toFixed(1), "MB");
