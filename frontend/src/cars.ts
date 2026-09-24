import type { Car, CarInput } from "@car/shared";

export function carToInput(car: Car): CarInput {
  return {
    name: car.name,
    make: car.make,
    model: car.model,
    licensePlate: car.licensePlate,
    vin: car.vin,
    firstRegistration: car.firstRegistration,
    ownedSince: car.ownedSince,
    apkDueDate: car.apkDueDate,
    notes: car.notes,
  };
}
