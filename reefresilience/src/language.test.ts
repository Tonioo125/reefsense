import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards the scientific framing of user-facing copy: predictions are
 * probabilities, never "resilience scores", and never proof.
 */
const SRC = fileURLToPath(new URL(".", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const files = walk(SRC).filter(
  (f) =>
    !f.endsWith(".test.ts") &&
    (f.endsWith(".tsx") || relative(SRC, f).replace(/\\/g, "/").startsWith("data/")),
);
const sources = files.map((f) => ({ file: relative(SRC, f), text: readFileSync(f, "utf8") }));

describe("scientific language", () => {
  it("scans the UI and data sources", () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it("never calls the prediction a 'resilience score'", () => {
    for (const { file, text } of sources) {
      expect(text, file).not.toMatch(/resilience score/i);
    }
  });

  it("never claims the model proves resilience", () => {
    for (const { file, text } of sources) {
      const cleaned = text.replace(/\bdo(?:es)?\s+not\s+prove\b/gi, "");
      expect(cleaned, file).not.toMatch(/\bproves?\b/i);
    }
  });

  it("contains the required spec copy", () => {
    const components = sources
      .filter((s) => s.file.replace(/\\/g, "/").startsWith("components/"))
      .map((s) => s.text)
      .join("\n");
    for (const phrase of [
      "Predicted probability of high climate resilience",
      "Model prediction based on environmental and ecological predictors.",
      "Model explanation",
      "Understanding coral resilience in a changing climate.",
      "Global Reef Dataset",
      "Explore the map",
      "Powered by environmental and ecological data",
      "Climate Resilience",
    ]) {
      expect(components).toContain(phrase);
    }
  });
});
