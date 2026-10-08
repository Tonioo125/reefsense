import { describe, expect, it } from "vitest";
import {
  canAnimate,
  canObserve,
  clamp01,
  countUpValue,
  easeOutCubic,
  parallaxOffset,
} from "./motion";

describe("motion helpers", () => {
  it("clamps to the unit interval", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(3)).toBe(1);
  });

  it("eases out cubically", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
    expect(easeOutCubic(-2)).toBe(0);
    expect(easeOutCubic(5)).toBe(1);
  });

  it("counts between two values", () => {
    expect(countUpValue(0, 200, 0)).toBe(0);
    expect(countUpValue(0, 200, 1)).toBe(200);
    expect(countUpValue(0, 200, 0.5)).toBeCloseTo(175);
    expect(countUpValue(80, 40, 1)).toBe(40);
  });

  it("offsets parallax layers with clamping", () => {
    expect(parallaxOffset(100, 0.2)).toBeCloseTo(20);
    expect(parallaxOffset(100, -0.1)).toBeCloseTo(-10);
    expect(parallaxOffset(5000, 0.5)).toBe(160);
    expect(parallaxOffset(5000, -0.5, 40)).toBe(-40);
  });

  it("reports no animation or observer support without a window", () => {
    expect(canAnimate()).toBe(false);
    expect(canObserve()).toBe(false);
  });
});
