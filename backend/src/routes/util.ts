import { prisma } from "../db.js";
import { notFound, parseId } from "../http.js";

/** Loads the car from the `:carId` route param, or throws a 404. */
export async function findCar(params: Record<string, string | undefined>) {
  const car = await prisma.car.findUnique({ where: { id: parseId(params.carId) } });
  if (!car) {
    throw notFound();
  }
  return car;
}
