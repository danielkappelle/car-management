import { maintenanceActionInput } from "@car/shared";
import { Router } from "express";
import { prisma } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { HttpError, parseId, toDate } from "../http.js";
import { serializeMaintenanceAction } from "../serialize.js";
import { findCar } from "./util.js";

export const maintenanceRouter = Router({ mergeParams: true });

const withDefects = {
  fixedDefects: { select: { id: true, title: true }, orderBy: { id: "asc" } },
} as const;

const unfixed = { fixedActionId: null, fixedDate: null, fixedOdo: null };

function parseAction(body: unknown) {
  const { fixedDefectIds, ...input } = maintenanceActionInput.parse(body);
  return { fixedDefectIds, data: { ...input, date: toDate(input.date) } };
}

async function assertDefectsBelongToCar(defectIds: number[], carId: number) {
  const count = await prisma.defect.count({ where: { id: { in: defectIds }, carId } });
  if (count !== new Set(defectIds).size) {
    throw new HttpError(400, "Defect not found for this car");
  }
}

/** Makes `defectIds` exactly the set of defects fixed by the action. */
async function linkDefects(
  tx: Prisma.TransactionClient,
  action: { id: number; date: Date; odo: number },
  defectIds: number[],
) {
  await tx.defect.updateMany({
    where: { fixedActionId: action.id, id: { notIn: defectIds } },
    data: unfixed,
  });
  await tx.defect.updateMany({
    where: { id: { in: defectIds } },
    data: { fixedActionId: action.id, fixedDate: action.date, fixedOdo: action.odo },
  });
}

maintenanceRouter.get("/", async (req, res) => {
  const car = await findCar(req.params);
  const actions = await prisma.maintenanceAction.findMany({
    where: { carId: car.id },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    include: withDefects,
  });
  res.json(actions.map(serializeMaintenanceAction));
});

maintenanceRouter.post("/", async (req, res) => {
  const car = await findCar(req.params);
  const { data, fixedDefectIds } = parseAction(req.body);
  await assertDefectsBelongToCar(fixedDefectIds, car.id);

  const action = await prisma.$transaction(async (tx) => {
    const created = await tx.maintenanceAction.create({ data: { ...data, carId: car.id } });
    await linkDefects(tx, created, fixedDefectIds);
    return tx.maintenanceAction.findUniqueOrThrow({ where: { id: created.id }, include: withDefects });
  });
  res.status(201).json(serializeMaintenanceAction(action));
});

maintenanceRouter.put("/:id", async (req, res) => {
  const car = await findCar(req.params);
  const { data, fixedDefectIds } = parseAction(req.body);
  await assertDefectsBelongToCar(fixedDefectIds, car.id);

  const action = await prisma.$transaction(async (tx) => {
    const updated = await tx.maintenanceAction.update({
      where: { id: parseId(req.params.id), carId: car.id },
      data,
    });
    await linkDefects(tx, updated, fixedDefectIds);
    return tx.maintenanceAction.findUniqueOrThrow({ where: { id: updated.id }, include: withDefects });
  });
  res.json(serializeMaintenanceAction(action));
});

maintenanceRouter.delete("/:id", async (req, res) => {
  const car = await findCar(req.params);
  const id = parseId(req.params.id);
  await prisma.$transaction([
    // The defects' fix date and odo came from this action, so they are open again.
    prisma.defect.updateMany({ where: { fixedActionId: id, carId: car.id }, data: unfixed }),
    prisma.maintenanceAction.delete({ where: { id, carId: car.id } }),
  ]);
  res.status(204).end();
});
