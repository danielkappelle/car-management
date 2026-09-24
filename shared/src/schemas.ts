import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

const requiredText = (max: number) => z.string().trim().min(1, "Required").max(max);

const optionalDate = z.iso
  .date()
  .nullish()
  .transform((value) => value ?? null);

const odo = z.number().int().min(0).max(9_999_999);

/** A positive amount with at most two decimals, matching Decimal(x,2) columns. */
const amount = (max: number) =>
  z
    .number()
    .positive()
    .max(max)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, "At most 2 decimals");

export const loginInput = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginInput>;

export const carInput = z.object({
  name: requiredText(100),
  make: requiredText(100),
  model: requiredText(100),
  licensePlate: requiredText(20).transform((value) => value.toUpperCase()),
  vin: optionalText(17),
  firstRegistration: optionalDate,
  ownedSince: optionalDate,
  apkDueDate: optionalDate,
  notes: optionalText(10_000),
});
export type CarInput = z.input<typeof carInput>;

export const carSpecsInput = z
  .array(
    z.object({
      key: requiredText(100),
      value: requiredText(500),
    }),
  )
  .max(100)
  .refine(
    (specs) => new Set(specs.map((spec) => spec.key.toLowerCase())).size === specs.length,
    "Spec names must be unique",
  );
export type CarSpecsInput = z.input<typeof carSpecsInput>;

export const fuelUpliftInput = z.object({
  date: z.iso.date(),
  odo,
  volume: amount(9_999),
  totalPrice: amount(999_999),
  fullTank: z.boolean().default(true),
  missedPrevious: z.boolean().default(false),
  notes: optionalText(10_000),
});
export type FuelUpliftInput = z.input<typeof fuelUpliftInput>;

export const defectInput = z.object({
  title: requiredText(200),
  description: optionalText(10_000),
  startDate: z.iso.date(),
  startOdo: odo.nullish().transform((value) => value ?? null),
  fixedDate: optionalDate,
  fixedOdo: odo.nullish().transform((value) => value ?? null),
  fixedActionId: z
    .number()
    .int()
    .positive()
    .nullish()
    .transform((value) => value ?? null),
});
export type DefectInput = z.input<typeof defectInput>;

export const maintenanceTypes = ["APK", "SERVICE", "REPAIR", "TIRES", "OTHER"] as const;
export type MaintenanceType = (typeof maintenanceTypes)[number];

export const maintenanceTypeLabels: Record<MaintenanceType, string> = {
  APK: "APK",
  SERVICE: "Service",
  REPAIR: "Repair",
  TIRES: "Tires",
  OTHER: "Other",
};

export const maintenanceActionInput = z.object({
  type: z.enum(maintenanceTypes),
  title: requiredText(200),
  date: z.iso.date(),
  odo,
  garage: optionalText(200),
  notes: optionalText(10_000),
  cost: z.number().min(0).max(999_999),
  /** Defects fixed by this action. Replaces the current set of linked defects. */
  fixedDefectIds: z.array(z.number().int().positive()).default([]),
});
export type MaintenanceActionInput = z.input<typeof maintenanceActionInput>;
