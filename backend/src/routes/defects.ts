import { defectInput } from "@car/shared";
import { Router } from "express";
import { prisma } from "../db.js";
import { HttpError, parseId, toDate } from "../http.js";
import { serializeDefect } from "../serialize.js";
import { findCar } from "./util.js";

export const defectsRouter = Router({ mergeParams: true });

async function defectData(body: unknown, carId: number) {
  const input = defectInput.parse(body);
  let fixedDate = toDate(input.fixedDate);
  let fixedOdo = input.fixedOdo;

  // A defect fixed by a maintenance action takes its fix date and odo from that action.
  if (input.fixedActionId !== null) {
    const action = await prisma.maintenanceAction.findUnique({
      where: { id: input.fixedActionId, carId },
    });
    if (!action) {
      throw new HttpError(400, "Maintenance action not found for this car");
    }
    fixedDate = action.date;
    fixedOdo = action.odo;
  }

  return {
    ...input,
    startDate: toDate(input.startDate),
    fixedDate,
    fixedOdo,
  };
}

defectsRouter.get("/", async (req, res) => {
  const car = await findCar(req.params);
  const defects = await prisma.defect.findMany({
    where: { carId: car.id },
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
  });
  res.json(defects.map(serializeDefect));
});

defectsRouter.post("/", async (req, res) => {
  const car = await findCar(req.params);
  const defect = await prisma.defect.create({
    data: { ...(await defectData(req.body, car.id)), carId: car.id },
  });
  res.status(201).json(serializeDefect(defect));
});

defectsRouter.put("/:id", async (req, res) => {
  const car = await findCar(req.params);
  const defect = await prisma.defect.update({
    where: { id: parseId(req.params.id), carId: car.id },
    data: await defectData(req.body, car.id),
  });
  res.json(serializeDefect(defect));
});

defectsRouter.delete("/:id", async (req, res) => {
  const car = await findCar(req.params);
  await prisma.defect.delete({ where: { id: parseId(req.params.id), carId: car.id } });
  res.status(204).end();
});
