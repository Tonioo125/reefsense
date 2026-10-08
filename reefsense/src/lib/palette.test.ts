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
      background: PALETTE.ground,
      foreground: PALETTE.ink,
      card: PALETTE.white,
      primary: PALETTE.ocean,
      "primary-foreground": PALETTE.white,
      "primary-strong": PALETTE.oceanStrong,
      secondary: PALETTE.shelf,
      muted: PALETTE.shelf,
      "muted-foreground": PALETTE.slate,
      "muted-strong": PALETTE.slateStrong,
      brand: PALETTE.reef,
      border: PALETTE.line,
      ring: PALETTE.reef,
    };
    for (const [name, hex] of Object.entries(expected)) {
      expect(cssVar(name), name).toBe(channels(hex).join(" "));
    }
  });

  it("uses the resilience colours everywhere", () => {
    expect(CATEGORY_COLORS).toEqual(RESILIENCE);
    expect(CATEGORY_COLORS.High.base).toBe("#1E9E8F");
    expect(CATEGORY_COLORS.Medium.base).toBe("#E3B55B");
    expect(CATEGORY_COLORS.Low.base).toBe("#E2593B");
  });

  it("maps stressor levels onto the resilience tones", () => {
    const tone = (c: keyof typeof RESILIENCE) => ({ soft: RESILIENCE[c].soft, text: RESILIENCE[c].text });
    expect(levelTone("Low")).toEqual(tone("High"));
    expect(levelTone("Moderate")).toEqual(tone("Medium"));
    expect(levelTone("High")).toEqual(tone("Low"));
  });

  it("keeps text pairs at WCAG AA contrast", () => {
    const pairs: [string, string, string][] = [
      ["ink on ground", PALETTE.ink, PALETTE.ground],
      ["ink on white", PALETTE.ink, PALETTE.white],
      ["slate on white", PALETTE.slate, PALETTE.white],
      ["slate on shelf", PALETTE.slate, PALETTE.shelf],
      ["slateStrong on ground", PALETTE.slateStrong, PALETTE.ground],
      ["reef on white", PALETTE.reef, PALETTE.white],
      ["reef on ground", PALETTE.reef, PALETTE.ground],
      ["white on ocean", PALETTE.white, PALETTE.ocean],
      ["coralText on coralSoft", PALETTE.coralText, PALETTE.coralSoft],
      ...(Object.keys(RESILIENCE) as (keyof typeof RESILIENCE)[]).map(
        (c): [string, string, string] => [`${c} text on soft`, RESILIENCE[c].text, RESILIENCE[c].soft],
      ),
    ];
    for (const [label, fg, bg] of pairs) {
      expect(contrast(fg, bg), label).toBeGreaterThanOrEqual(4.5);
    }
  });
});
