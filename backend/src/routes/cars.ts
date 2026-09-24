import { carInput, carSpecsInput } from "@car/shared";
import { Router } from "express";
import { prisma } from "../db.js";
import { notFound, parseId, toDate } from "../http.js";
import { serializeCar, serializeCarSummary } from "../serialize.js";

export const carsRouter = Router();

const withSpecs = { specs: { orderBy: { sortOrder: "asc" } } } as const;

function carData(body: unknown) {
  const input = carInput.parse(body);
  return {
    ...input,
    firstRegistration: toDate(input.firstRegistration),
    ownedSince: toDate(input.ownedSince),
    apkDueDate: toDate(input.apkDueDate),
  };
}

carsRouter.get("/", async (_req, res) => {
  const cars = await prisma.car.findMany({ orderBy: { name: "asc" } });
  res.json(cars.map(serializeCarSummary));
});

carsRouter.post("/", async (req, res) => {
  const car = await prisma.car.create({ data: carData(req.body), include: withSpecs });
  res.status(201).json(serializeCar(car));
});

carsRouter.get("/:carId", async (req, res) => {
  const car = await prisma.car.findUnique({
    where: { id: parseId(req.params.carId) },
    include: withSpecs,
  });
  if (!car) {
    throw notFound();
  }
  res.json(serializeCar(car));
});

carsRouter.put("/:carId", async (req, res) => {
  const car = await prisma.car.update({
    where: { id: parseId(req.params.carId) },
    data: carData(req.body),
    include: withSpecs,
  });
  res.json(serializeCar(car));
});

carsRouter.put("/:carId/specs", async (req, res) => {
  const carId = parseId(req.params.carId);
  const specs = carSpecsInput.parse(req.body);
  const car = await prisma.car.update({
    where: { id: carId },
    data: {
      specs: {
        deleteMany: {},
        create: specs.map((spec, index) => ({ ...spec, sortOrder: index })),
      },
    },
    include: withSpecs,
  });
  res.json(serializeCar(car));
});

carsRouter.delete("/:carId", async (req, res) => {
  await prisma.car.delete({ where: { id: parseId(req.params.carId) } });
  res.status(204).end();
});
