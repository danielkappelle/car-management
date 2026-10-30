import type { Car, CarSummary, Defect, FuelUplift, MaintenanceAction, MaintenanceSchedule } from "@car/shared";
import type * as db from "./generated/prisma/client.js";
import { fromDate } from "./http.js";

export function serializeCarSummary(car: db.Car): CarSummary {
  return {
    id: car.id,
    name: car.name,
    make: car.make,
    model: car.model,
    licensePlate: car.licensePlate,
  };
}

export function serializeCar(car: db.Car & { specs: db.CarSpec[] }): Car {
  return {
    ...serializeCarSummary(car),
    vin: car.vin,
    firstRegistration: fromDate(car.firstRegistration),
    ownedSince: fromDate(car.ownedSince),
    apkDueDate: fromDate(car.apkDueDate),
    notes: car.notes,
    specs: car.specs.map(({ key, value }) => ({ key, value })),
  };
}

export function serializeFuelUplift(uplift: db.FuelUplift): FuelUplift {
  return {
    id: uplift.id,
    carId: uplift.carId,
    date: fromDate(uplift.date),
    odo: uplift.odo,
    volume: uplift.volume.toNumber(),
    totalPrice: uplift.totalPrice.toNumber(),
    fullTank: uplift.fullTank,
    missedPrevious: uplift.missedPrevious,
    notes: uplift.notes,
  };
}

export function serializeDefect(defect: db.Defect): Defect {
  return {
    id: defect.id,
    carId: defect.carId,
    title: defect.title,
    description: defect.description,
    startDate: fromDate(defect.startDate),
    startOdo: defect.startOdo,
    fixedDate: fromDate(defect.fixedDate),
    fixedOdo: defect.fixedOdo,
    fixedActionId: defect.fixedActionId,
  };
}

export function serializeMaintenanceAction(
  action: db.MaintenanceAction & {
    fixedDefects: Pick<db.Defect, "id" | "title">[];
    schedules: Pick<db.MaintenanceSchedule, "id" | "name">[];
  },
): MaintenanceAction {
  return {
    id: action.id,
    carId: action.carId,
    type: action.type,
    title: action.title,
    date: fromDate(action.date),
    odo: action.odo,
    garage: action.garage,
    notes: action.notes,
    cost: action.cost.toNumber(),
    fixedDefects: action.fixedDefects.map(({ id, title }) => ({ id, title })),
    schedules: action.schedules.map(({ id, name }) => ({ id, name })),
  };
}

export function serializeSchedule(
  schedule: db.MaintenanceSchedule & { actions: Pick<db.MaintenanceAction, "id" | "date" | "odo">[] },
): MaintenanceSchedule {
  const lastAction = schedule.actions[0];
  return {
    id: schedule.id,
    carId: schedule.carId,
    name: schedule.name,
    description: schedule.description,
    type: schedule.type,
    intervalKm: schedule.intervalKm,
    intervalMonths: schedule.intervalMonths,
    warnKm: schedule.warnKm,
    warnDays: schedule.warnDays,
    startDate: fromDate(schedule.startDate),
    startOdo: schedule.startOdo,
    active: schedule.active,
    lastAction: lastAction ? { id: lastAction.id, date: fromDate(lastAction.date), odo: lastAction.odo } : null,
  };
}
