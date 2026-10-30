import type { MaintenanceSchedule } from "./types.js";

/** Warning thresholds used when a schedule doesn't set its own. */
export const DEFAULT_WARN_KM = 1000;
export const DEFAULT_WARN_DAYS = 30;

const DAY_MS = 86_400_000;

const toTime = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`);

/** Adds months to an ISO `YYYY-MM-DD` date, clamping to the end of shorter months (31 Jan + 1 = 28 Feb). */
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const daysInMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, daysInMonth));
  return target.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  return new Date(toTime(isoDate) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toTime(to) - toTime(from)) / DAY_MS);
}

/**
 * Average distance driven per day, from odometer readings over roughly the last year.
 * Null when the readings span less than a month or show no distance.
 */
export function averageKmPerDay(readings: { date: string; odo: number }[]): number | null {
  if (readings.length < 2) return null;
  const sorted = [...readings].sort((a, b) => toTime(a.date) - toTime(b.date) || a.odo - b.odo);
  const latest = sorted[sorted.length - 1]!;
  const yearAgo = addDays(latest.date, -365);
  const first = sorted.find((reading) => reading.date >= yearAgo) ?? sorted[0]!;
  const days = daysBetween(first.date, latest.date);
  const distance = latest.odo - first.odo;
  if (days < 30 || distance <= 0) return null;
  return distance / days;
}

export type DueStatus = "ok" | "dueSoon" | "overdue";

export interface ScheduleDue {
  dueDate: string | null;
  dueOdo: number | null;
  /** Days until the due date, negative when overdue. */
  daysLeft: number | null;
  /** Kilometers until the due odometer reading, negative when overdue. Null when the current odo is unknown. */
  kmLeft: number | null;
  /** When the due odometer reading is expected to be reached, based on the average distance per day. */
  estimatedOdoDate: string | null;
  status: DueStatus;
  /** Which intervals caused the status, so warnings can mention only those. */
  urgentDate: boolean;
  urgentKm: boolean;
}

type ScheduleForDue = Pick<
  MaintenanceSchedule,
  "intervalKm" | "intervalMonths" | "warnKm" | "warnDays" | "startDate" | "startOdo" | "lastAction"
>;

/**
 * When a recurring maintenance is due next. The interval counts from the last action that
 * performed it, or from the schedule's start when it hasn't been performed yet. With both a
 * distance and time interval, whichever comes first applies.
 */
export function scheduleDue(
  schedule: ScheduleForDue,
  { today, latestOdo, kmPerDay = null }: { today: string; latestOdo: number | null; kmPerDay?: number | null },
): ScheduleDue {
  const base = schedule.lastAction ?? { date: schedule.startDate, odo: schedule.startOdo };
  const warnKm = schedule.warnKm ?? DEFAULT_WARN_KM;
  const warnDays = schedule.warnDays ?? DEFAULT_WARN_DAYS;

  const dueDate = schedule.intervalMonths !== null ? addMonths(base.date, schedule.intervalMonths) : null;
  const dueOdo = schedule.intervalKm !== null && base.odo !== null ? base.odo + schedule.intervalKm : null;
  const daysLeft = dueDate !== null ? daysBetween(today, dueDate) : null;
  // Before the first reading after the start, the car is assumed to be at its start odo.
  const currentOdo = latestOdo !== null && base.odo !== null ? Math.max(latestOdo, base.odo) : (latestOdo ?? base.odo);
  const kmLeft = dueOdo !== null && currentOdo !== null ? dueOdo - currentOdo : null;
  const estimatedOdoDate =
    kmLeft !== null && kmPerDay !== null && kmPerDay > 0 ? addDays(today, Math.max(0, Math.round(kmLeft / kmPerDay))) : null;

  const overdue = (daysLeft !== null && daysLeft < 0) || (kmLeft !== null && kmLeft < 0);
  const urgentDate = daysLeft !== null && daysLeft <= warnDays;
  const urgentKm = kmLeft !== null && kmLeft <= warnKm;

  return {
    dueDate,
    dueOdo,
    daysLeft,
    kmLeft,
    estimatedOdoDate,
    status: overdue ? "overdue" : urgentDate || urgentKm ? "dueSoon" : "ok",
    urgentDate,
    urgentKm,
  };
}
