import { describe, expect, it } from "vitest";
import { boxIntervalMs, nextBoxLevel } from "./updateMastery.js";

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
