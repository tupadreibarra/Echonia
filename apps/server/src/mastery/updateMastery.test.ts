import { describe, expect, it } from "vitest";
import { boxIntervalMs, computeTierDrift, nextBoxLevel } from "./updateMastery.js";

describe("nextBoxLevel", () => {
  it("perfect advances the box by one", () => {
    expect(nextBoxLevel(0, "perfect")).toBe(1);
    expect(nextBoxLevel(3, "perfect")).toBe(4);
  });

  it("perfect at the top box (5) stays at 5 — does not overflow", () => {
    expect(nextBoxLevel(5, "perfect")).toBe(5);
  });

  it("good leaves the box unchanged at every level, including the extremes", () => {
    expect(nextBoxLevel(0, "good")).toBe(0);
    expect(nextBoxLevel(3, "good")).toBe(3);
    expect(nextBoxLevel(5, "good")).toBe(5);
  });

  it("practice demotes the box by two", () => {
    expect(nextBoxLevel(4, "practice")).toBe(2);
    expect(nextBoxLevel(5, "practice")).toBe(3);
  });

  it("practice at box 0 stays at 0 — does not go negative", () => {
    expect(nextBoxLevel(0, "practice")).toBe(0);
  });

  it("practice at box 1 floors at 0, not -1", () => {
    expect(nextBoxLevel(1, "practice")).toBe(0);
  });
});

describe("boxIntervalMs", () => {
  it("box 0 is due immediately", () => {
    expect(boxIntervalMs(0)).toBe(0);
  });

  it("matches Phase 3's documented interval table", () => {
    expect(boxIntervalMs(1)).toBe(10 * 60 * 1000);
    expect(boxIntervalMs(2)).toBe(24 * 60 * 60 * 1000);
    expect(boxIntervalMs(3)).toBe(3 * 24 * 60 * 60 * 1000);
    expect(boxIntervalMs(4)).toBe(7 * 24 * 60 * 60 * 1000);
    expect(boxIntervalMs(5)).toBe(21 * 24 * 60 * 60 * 1000);
  });
});

describe("computeTierDrift", () => {
  it("does not drift below the 15-attempt threshold, even with an extreme score", () => {
    expect(computeTierDrift(3, "wordsmith", 100, 14)).toBe(3);
    expect(computeTierDrift(3, "wordsmith", 0, 14)).toBe(3);
  });

  it("does not drift at exactly 15 attempts if the score sits at the boundary (not strictly above/below)", () => {
    expect(computeTierDrift(3, "wordsmith", 85, 15)).toBe(3);
    expect(computeTierDrift(3, "wordsmith", 40, 15)).toBe(3);
  });

  it("drifts up when the score is above 85 with at least 15 attempts", () => {
    expect(computeTierDrift(3, "wordsmith", 90, 15)).toBe(4);
    expect(computeTierDrift(3, "wordsmith", 86, 20)).toBe(4);
  });

  it("drifts down when the score is below 40 with at least 15 attempts", () => {
    expect(computeTierDrift(3, "wordsmith", 39, 15)).toBe(2);
    expect(computeTierDrift(3, "wordsmith", 10, 20)).toBe(2);
  });

  it("does not drift in the stable 40-85 band", () => {
    expect(computeTierDrift(3, "wordsmith", 60, 20)).toBe(3);
  });

  it("caps drift-up at the age band's starting-range upper bound + 2, and does not exceed it on repeated calls", () => {
    // Wordsmith: starting range 3-5, cap 7.
    expect(computeTierDrift(7, "wordsmith", 95, 20)).toBe(7);
    let tier = 3;
    for (let i = 0; i < 10; i++) tier = computeTierDrift(tier, "wordsmith", 95, 20);
    expect(tier).toBe(7);
  });

  it("floors drift-down at 1 (universal, not age-band-relative), and does not go below it on repeated calls", () => {
    expect(computeTierDrift(1, "loremaster", 5, 20)).toBe(1);
    let tier = 6;
    for (let i = 0; i < 10; i++) tier = computeTierDrift(tier, "loremaster", 5, 20);
    expect(tier).toBe(1);
  });

  it("uses the correct cap per age band", () => {
    // Fledgling: starting range 1-2, cap 4.
    expect(computeTierDrift(4, "fledgling", 90, 20)).toBe(4);
    // Loremaster: starting range 6-8, cap 10.
    expect(computeTierDrift(10, "loremaster", 90, 20)).toBe(10);
  });
});
