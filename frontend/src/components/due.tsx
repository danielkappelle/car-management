import type { DueStatus, MaintenanceSchedule, ScheduleDue } from "@car/shared";
import { Link } from "react-router";
import { daysUntil, formatDate, formatKm, formatMonth, formatNumber } from "../format";
import { maintenancePath } from "../maintenanceTab";
import { useCar, useScheduleDues } from "../queries";

/** Warn this many days before the APK is due. */
const APK_WARN_DAYS = 60;
/** Up to this many days, a due date is shown as a countdown instead of a date. */
const COUNTDOWN_DAYS = 60;

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function apkStatus(apkDueDate: string | null): DueStatus {
  if (apkDueDate === null) return "ok";
  const days = daysUntil(apkDueDate);
  return days < 0 ? "overdue" : days <= APK_WARN_DAYS ? "dueSoon" : "ok";
}

export function ApkBadge({ date }: { date: string }) {
  const status = apkStatus(date);
  if (status === "overdue") return <span className="badge badge-danger">Overdue</span>;
  if (status === "dueSoon") return <span className="badge badge-warning">In {daysUntil(date)} days</span>;
  return null;
}

export function DueBadge({ status }: { status: DueStatus }) {
  if (status === "overdue") return <span className="badge badge-danger">Overdue</span>;
  if (status === "dueSoon") return <span className="badge badge-warning">Due soon</span>;
  return null;
}

export function formatInterval(schedule: Pick<MaintenanceSchedule, "intervalKm" | "intervalMonths">): string {
  const parts = [];
  if (schedule.intervalKm !== null) parts.push(formatKm(schedule.intervalKm));
  if (schedule.intervalMonths !== null) {
    const { intervalMonths: months } = schedule;
    parts.push(
      months % 12 === 0
        ? `${formatNumber(months / 12)} ${months === 12 ? "year" : "years"}`
        : `${formatNumber(months)} ${months === 1 ? "month" : "months"}`,
    );
  }
  return `Every ${parts.join(" or ")}`;
}

function dateText(due: ScheduleDue): string | null {
  if (due.dueDate === null || due.daysLeft === null) return null;
  if (due.daysLeft < 0) return `overdue since ${formatDate(due.dueDate)}`;
  if (due.daysLeft === 0) return "due today";
  if (due.daysLeft <= COUNTDOWN_DAYS) return `due in ${due.daysLeft} ${due.daysLeft === 1 ? "day" : "days"}`;
  return `due ${formatDate(due.dueDate)}`;
}

function kmText(due: ScheduleDue): string | null {
  if (due.kmLeft === null) return null;
  if (due.kmLeft < 0) return `${formatKm(-due.kmLeft)} overdue`;
  const estimate = due.estimatedOdoDate !== null ? ` (≈ ${formatMonth(due.estimatedOdoDate)})` : "";
  return `due in ${formatKm(due.kmLeft)}${estimate}`;
}

/** Describes when maintenance is due, optionally only the intervals that need attention. */
export function describeDue(due: ScheduleDue, onlyUrgent = false): string {
  const texts = [
    !onlyUrgent || due.urgentKm ? kmText(due) : null,
    !onlyUrgent || due.urgentDate ? dateText(due) : null,
  ].filter((text) => text !== null);
  return texts.join(" · ");
}

/** Warns about recurring maintenance and the APK that are due soon or overdue. */
export function DueBanner({ carId }: { carId: number }) {
  const car = useCar(carId);
  const dues = useScheduleDues(carId);

  const items: { key: string; name: string; text: string; status: DueStatus }[] = [];
  const apkDueDate = car.data?.apkDueDate ?? null;
  const apk = apkStatus(apkDueDate);
  if (apkDueDate !== null && apk !== "ok") {
    const days = daysUntil(apkDueDate);
    items.push({
      key: "apk",
      name: "APK",
      text: days < 0 ? `overdue since ${formatDate(apkDueDate)}` : `due in ${days} ${days === 1 ? "day" : "days"}`,
      status: apk,
    });
  }
  for (const { schedule, due } of dues ?? []) {
    if (schedule.active && due.status !== "ok") {
      items.push({ key: `schedule-${schedule.id}`, name: schedule.name, text: describeDue(due, true), status: due.status });
    }
  }
  if (items.length === 0) return null;

  items.sort((a, b) => Number(b.status === "overdue") - Number(a.status === "overdue"));
  const overdue = items.some((item) => item.status === "overdue");

  return (
    <Link to={maintenancePath("recurring")} className={`due-banner${overdue ? " due-banner-overdue" : ""}`}>
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            <DueBadge status={item.status} /> <strong>{item.name}</strong>{" "}
            <span className="muted">{item.text}</span>
          </li>
        ))}
      </ul>
    </Link>
  );
}
