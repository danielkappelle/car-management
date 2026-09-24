import type { FuelUplift } from "./types.js";

type UpliftForStats = Pick<
  FuelUplift,
  "id" | "date" | "odo" | "volume" | "totalPrice" | "fullTank" | "missedPrevious"
>;

export interface Consumption {
  litersPer100Km: number;
  kmPerLiter: number;
}

export interface FuelEntryStats {
  pricePerLiter: number;
  /** Distance since the previous uplift, null for the first one. */
  distance: number | null;
  /** Consumption since the previous full tank, only set on full-tank uplifts with a valid chain. */
  consumption: Consumption | null;
}

export interface FuelSummary {
  count: number;
  totalLiters: number;
  totalSpent: number;
  averagePricePerLiter: number | null;
  averageConsumption: Consumption | null;
}

export interface FuelStats {
  entries: Map<number, FuelEntryStats>;
  summary: FuelSummary;
}

function consumptionFor(liters: number, distance: number): Consumption {
  return { litersPer100Km: (liters / distance) * 100, kmPerLiter: distance / liters };
}

/**
 * Consumption can only be measured between two full-tank uplifts: the fuel of all uplifts
 * after the first full tank, up to and including the second, was burned over that distance.
 * An uplift marked `missedPrevious` breaks the chain, since unknown fuel was added before it.
 */
export function computeFuelStats(uplifts: UpliftForStats[]): FuelStats {
  const sorted = [...uplifts].sort(
    (a, b) => a.odo - b.odo || a.date.localeCompare(b.date) || a.id - b.id,
  );

  const entries = new Map<number, FuelEntryStats>();
  let previousOdo: number | null = null;
  let anchorOdo: number | null = null;
  let litersSinceAnchor = 0;
  let measuredLiters = 0;
  let measuredDistance = 0;

  for (const uplift of sorted) {
    let consumption: Consumption | null = null;

    if (uplift.missedPrevious) {
      anchorOdo = null;
    }

    if (anchorOdo !== null) {
      litersSinceAnchor += uplift.volume;
      if (uplift.fullTank) {
        const distance = uplift.odo - anchorOdo;
        if (distance > 0) {
          consumption = consumptionFor(litersSinceAnchor, distance);
          measuredLiters += litersSinceAnchor;
          measuredDistance += distance;
        }
      }
    }

    if (uplift.fullTank) {
      anchorOdo = uplift.odo;
      litersSinceAnchor = 0;
    }

    entries.set(uplift.id, {
      pricePerLiter: uplift.totalPrice / uplift.volume,
      distance: previousOdo === null ? null : uplift.odo - previousOdo,
      consumption,
    });
    previousOdo = uplift.odo;
  }

  const totalLiters = sorted.reduce((sum, uplift) => sum + uplift.volume, 0);
  const totalSpent = sorted.reduce((sum, uplift) => sum + uplift.totalPrice, 0);

  return {
    entries,
    summary: {
      count: sorted.length,
      totalLiters,
      totalSpent,
      averagePricePerLiter: totalLiters > 0 ? totalSpent / totalLiters : null,
      averageConsumption:
        measuredDistance > 0 ? consumptionFor(measuredLiters, measuredDistance) : null,
    },
  };
}
