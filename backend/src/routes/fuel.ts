import { fuelUpliftInput } from "@car/shared";
import { Router } from "express";
import { prisma } from "../db.js";
import { parseId, toDate } from "../http.js";
import { serializeFuelUplift } from "../serialize.js";
import { findCar } from "./util.js";

export const fuelRouter = Router({ mergeParams: true });

function upliftData(body: unknown) {
  const input = fuelUpliftInput.parse(body);
  return { ...input, date: toDate(input.date) };
}

fuelRouter.get("/", async (req, res) => {
  const car = await findCar(req.params);
  const uplifts = await prisma.fuelUplift.findMany({
    where: { carId: car.id },
    orderBy: [{ odo: "desc" }, { date: "desc" }],
  });
  res.json(uplifts.map(serializeFuelUplift));
});

fuelRouter.post("/", async (req, res) => {
  const car = await findCar(req.params);
  const uplift = await prisma.fuelUplift.create({ data: { ...upliftData(req.body), carId: car.id } });
  res.status(201).json(serializeFuelUplift(uplift));
});

fuelRouter.put("/:id", async (req, res) => {
  const car = await findCar(req.params);
  const uplift = await prisma.fuelUplift.update({
    where: { id: parseId(req.params.id), carId: car.id },
    data: upliftData(req.body),
  });
  res.json(serializeFuelUplift(uplift));
});

fuelRouter.delete("/:id", async (req, res) => {
  const car = await findCar(req.params);
  await prisma.fuelUplift.delete({ where: { id: parseId(req.params.id), carId: car.id } });
  res.status(204).end();
});
