import type { MaintenanceType } from "./schemas.js";

/** Dates are ISO `YYYY-MM-DD` strings, decimals are plain numbers. */

export interface CarSpec {
  key: string;
  value: string;
}

export interface CarSummary {
  id: number;
  name: string;
  make: string;
  model: string;
  licensePlate: string;
}

export interface Car extends CarSummary {
  vin: string | null;
  firstRegistration: string | null;
  ownedSince: string | null;
  apkDueDate: string | null;
  notes: string | null;
  specs: CarSpec[];
}

export interface FuelUplift {
  id: number;
  carId: number;
  date: string;
  odo: number;
  volume: number;
  totalPrice: number;
  fullTank: boolean;
  missedPrevious: boolean;
  notes: string | null;
}

export interface Defect {
  id: number;
  carId: number;
  title: string;
  description: string | null;
  startDate: string;
  startOdo: number | null;
  fixedDate: string | null;
  fixedOdo: number | null;
  fixedActionId: number | null;
}

export interface MaintenanceAction {
  id: number;
  carId: number;
  type: MaintenanceType;
  title: string;
  date: string;
  odo: number;
  garage: string | null;
  notes: string | null;
  cost: number;
  fixedDefects: { id: number; title: string }[];
}
