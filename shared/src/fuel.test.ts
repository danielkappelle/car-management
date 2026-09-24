import { describe, expect, it } from "vitest";
import { computeFuelStats } from "./fuel.js";

const uplift = (
  id: number,
  odo: number,
  volume: number,
  overrides: { fullTank?: boolean; missedPrevious?: boolean; totalPrice?: number } = {},
) => ({
  id,
  date: "2026-01-01",
  odo,
  volume,
  totalPrice: overrides.totalPrice ?? volume * 2,
  fullTank: overrides.fullTank ?? true,
  missedPrevious: overrides.missedPrevious ?? false,
});

describe("computeFuelStats", () => {
  it("measures consumption between two full tanks", () => {
    const stats = computeFuelStats([uplift(1, 1000, 40), uplift(2, 1500, 30)]);

    expect(stats.entries.get(1)?.consumption).toBeNull();
    expect(stats.entries.get(2)?.consumption).toEqual({ litersPer100Km: 6, kmPerLiter: 500 / 30 });
    expect(stats.entries.get(2)?.distance).toBe(500);
  });

  it("adds partial uplifts to the next full tank", () => {
    const stats = computeFuelStats([
      uplift(1, 1000, 40),
      uplift(2, 1200, 10, { fullTank: false }),
      uplift(3, 1500, 20),
    ]);

    expect(stats.entries.get(2)?.consumption).toBeNull();
    expect(stats.entries.get(3)?.consumption?.litersPer100Km).toBeCloseTo(6);
  });

  it("breaks the chain on a missed previous uplift", () => {
    const stats = computeFuelStats([
      uplift(1, 1000, 40),
      uplift(2, 1500, 30, { missedPrevious: true }),
      uplift(3, 2000, 35),
    ]);

    expect(stats.entries.get(2)?.consumption).toBeNull();
    expect(stats.entries.get(3)?.consumption?.litersPer100Km).toBeCloseTo(7);
    expect(stats.summary.averageConsumption?.litersPer100Km).toBeCloseTo(7);
  });

  it("sorts by odo regardless of input order", () => {
    const stats = computeFuelStats([uplift(2, 1500, 30), uplift(1, 1000, 40)]);

    expect(stats.entries.get(2)?.consumption?.litersPer100Km).toBeCloseTo(6);
  });

  it("summarizes totals and averages", () => {
    const stats = computeFuelStats([
      uplift(1, 1000, 40, { totalPrice: 80 }),
      uplift(2, 1500, 30, { totalPrice: 66 }),
    ]);

    expect(stats.summary).toMatchObject({ count: 2, totalLiters: 70, totalSpent: 146 });
    expect(stats.summary.averagePricePerLiter).toBeCloseTo(146 / 70);
  });

  it("handles no uplifts", () => {
    const stats = computeFuelStats([]);

    expect(stats.summary.averageConsumption).toBeNull();
    expect(stats.summary.averagePricePerLiter).toBeNull();
  });
});
