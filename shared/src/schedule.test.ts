import { describe, expect, it } from "vitest";
import { addMonths, averageKmPerDay, scheduleDue } from "./schedule.js";

const schedule = (overrides: Partial<Parameters<typeof scheduleDue>[0]> = {}) => ({
  intervalKm: null,
  intervalMonths: null,
  warnKm: null,
  warnDays: null,
  startDate: "2026-01-01",
  startOdo: 100_000,
  lastAction: null,
  ...overrides,
});

describe("addMonths", () => {
  it("adds months across years", () => {
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });

  it("clamps to the end of shorter months", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });
});

describe("averageKmPerDay", () => {
  it("averages over the last year", () => {
    const readings = [
      { date: "2024-01-01", odo: 0 },
      { date: "2025-06-01", odo: 50_000 },
      { date: "2025-12-01", odo: 51_000 },
      { date: "2026-06-01", odo: 61_000 },
    ];
    // 2025-06-01 is the first reading within a year of the latest one.
    expect(averageKmPerDay(readings)).toBeCloseTo(11_000 / 365);
  });

  it("needs at least a month of readings", () => {
    expect(averageKmPerDay([{ date: "2026-01-01", odo: 0 }])).toBeNull();
    expect(
      averageKmPerDay([
        { date: "2026-01-01", odo: 0 },
        { date: "2026-01-20", odo: 1000 },
      ]),
    ).toBeNull();
  });
});

describe("scheduleDue", () => {
  it("counts a time interval from the start when never performed", () => {
    const due = scheduleDue(schedule({ intervalMonths: 12 }), { today: "2026-06-01", latestOdo: null });
    expect(due).toMatchObject({ dueDate: "2027-01-01", dueOdo: null, kmLeft: null, status: "ok" });
  });

  it("counts from the last action", () => {
    const due = scheduleDue(
      schedule({ intervalKm: 15_000, lastAction: { id: 1, date: "2026-03-01", odo: 110_000 } }),
      { today: "2026-06-01", latestOdo: 115_000 },
    );
    expect(due).toMatchObject({ dueOdo: 125_000, kmLeft: 10_000, dueDate: null, status: "ok" });
  });

  it("warns within the threshold", () => {
    const due = scheduleDue(schedule({ intervalKm: 15_000, warnKm: 2000 }), {
      today: "2026-06-01",
      latestOdo: 113_500,
    });
    expect(due).toMatchObject({ kmLeft: 1500, status: "dueSoon", urgentKm: true, urgentDate: false });
  });

  it("uses the default thresholds", () => {
    const due = scheduleDue(schedule({ intervalMonths: 6 }), { today: "2026-06-10", latestOdo: null });
    expect(due).toMatchObject({ daysLeft: 21, status: "dueSoon", urgentDate: true });
  });

  it("is overdue when either interval has passed", () => {
    const due = scheduleDue(schedule({ intervalKm: 15_000, intervalMonths: 12 }), {
      today: "2026-06-01",
      latestOdo: 116_000,
    });
    expect(due).toMatchObject({ kmLeft: -1000, daysLeft: 214, status: "overdue", urgentKm: true, urgentDate: false });
  });

  it("assumes the start odo when no newer reading is known", () => {
    const due = scheduleDue(schedule({ intervalKm: 15_000 }), { today: "2026-06-01", latestOdo: 90_000 });
    expect(due.kmLeft).toBe(15_000);
  });

  it("estimates when the distance is reached", () => {
    const due = scheduleDue(schedule({ intervalKm: 15_000 }), {
      today: "2026-06-01",
      latestOdo: 105_000,
      kmPerDay: 50,
    });
    expect(due.estimatedOdoDate).toBe("2026-12-18");
  });
});
