import { maintenanceScheduleInput } from "@car/shared";
import { Router } from "express";
import { prisma } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { parseId, toDate } from "../http.js";
import { serializeSchedule } from "../serialize.js";
import { findCar } from "./util.js";

export const schedulesRouter = Router({ mergeParams: true });

// The interval counts from the most recent action that performed the maintenance.
const withLastAction = {
  actions: {
    select: { id: true, date: true, odo: true },
    orderBy: [{ date: "desc" }, { odo: "desc" }],
    take: 1,
  },
} satisfies Prisma.MaintenanceScheduleInclude;

function scheduleData(body: unknown) {
  const input = maintenanceScheduleInput.parse(body);
  return { ...input, startDate: toDate(input.startDate) };
}

schedulesRouter.get("/", async (req, res) => {
  const car = await findCar(req.params);
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: { carId: car.id },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    include: withLastAction,
  });
  res.json(schedules.map(serializeSchedule));
});

schedulesRouter.post("/", async (req, res) => {
  const car = await findCar(req.params);
  const schedule = await prisma.maintenanceSchedule.create({
    data: { ...scheduleData(req.body), carId: car.id },
    include: withLastAction,
  });
  res.status(201).json(serializeSchedule(schedule));
});

schedulesRouter.put("/:id", async (req, res) => {
  const car = await findCar(req.params);
  const schedule = await prisma.maintenanceSchedule.update({
    where: { id: parseId(req.params.id), carId: car.id },
    data: scheduleData(req.body),
    include: withLastAction,
  });
  res.json(serializeSchedule(schedule));
});

schedulesRouter.delete("/:id", async (req, res) => {
  const car = await findCar(req.params);
  // Linked actions are kept, only their link to the schedule is removed.
  await prisma.maintenanceSchedule.delete({ where: { id: parseId(req.params.id), carId: car.id } });
  res.status(204).end();
});
