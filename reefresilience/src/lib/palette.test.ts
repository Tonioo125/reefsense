import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PALETTE, RESILIENCE } from "@/lib/palette";
import { CATEGORY_COLORS, levelTone } from "@/lib/reef";

/**
 * Keeps src/index.css (RGB CSS variables) in sync with src/lib/palette.ts, and guards
 * the text-contrast choices behind the derived shades.
 */
const css = readFileSync(fileURLToPath(new URL("../index.css", import.meta.url)), "utf8");

function cssVar(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`--${name} not found in index.css`);
  return match[1].trim();
}

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("palette tokens", () => {
  it("mirrors the palette as RGB CSS variables", () => {
    const expected: Record<string, string> = {
      background: PALETTE.iceOcean,
      foreground: PALETTE.deepTeal,
      primary: PALETTE.brightTeal,
      "primary-strong": PALETTE.tealStrong,
      secondary: PALETTE.softAqua,
      muted: PALETTE.softAqua,
      "muted-foreground": PALETTE.seaGray,
      "muted-strong": PALETTE.seaGrayStrong,
      brand: PALETTE.tealStrong,
      border: PALETTE.border,
      ring: PALETTE.brightTeal,
    };
    for (const [name, hex] of Object.entries(expected)) {
      expect(cssVar(name), name).toBe(channels(hex).join(" "));
    }
  });

  it("uses the resilience colours everywhere", () => {
    expect(CATEGORY_COLORS).toEqual(RESILIENCE);
    expect(CATEGORY_COLORS.High.base).toBe("#2E9B72");
    expect(CATEGORY_COLORS.Medium.base).toBe("#E0B84C");
    expect(CATEGORY_COLORS.Low.base).toBe("#D95C5C");
  });

  it("maps stressor levels onto the resilience tones", () => {
    const tone = (c: keyof typeof RESILIENCE) => ({ soft: RESILIENCE[c].soft, text: RESILIENCE[c].text });
    expect(levelTone("Low")).toEqual(tone("High"));
    expect(levelTone("Moderate")).toEqual(tone("Medium"));
    expect(levelTone("High")).toEqual(tone("Low"));
  });

  it("keeps text pairs at WCAG AA contrast", () => {
    const pairs: [string, string, string][] = [
      ["seaGrayStrong on iceOcean", PALETTE.seaGrayStrong, PALETTE.iceOcean],
      ["seaGrayStrong on softAqua", PALETTE.seaGrayStrong, PALETTE.softAqua],
      ["tealStrong on white", PALETTE.tealStrong, PALETTE.white],
      ["deepTeal on iceOcean", PALETTE.deepTeal, PALETTE.iceOcean],
      ["white on tealStrong", PALETTE.white, PALETTE.tealStrong],
      ...(Object.keys(RESILIENCE) as (keyof typeof RESILIENCE)[]).map(
        (c): [string, string, string] => [`${c} text on soft`, RESILIENCE[c].text, RESILIENCE[c].soft],
      ),
    ];
    for (const [label, fg, bg] of pairs) {
      expect(contrast(fg, bg), label).toBeGreaterThanOrEqual(4.5);
    }
  });
});
