import type { ErrorRequestHandler } from "express";
import { z } from "zod";
import { Prisma } from "./generated/prisma/client.js";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = () => new HttpError(404, "Not found");

export function parseId(value: string | string[] | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw notFound();
  }
  return id;
}

/** Converts an ISO `YYYY-MM-DD` string to a Date for a `@db.Date` column. */
export function toDate(value: string): Date;
export function toDate(value: string | null): Date | null;
export function toDate(value: string | null): Date | null {
  return value === null ? null : new Date(`${value}T00:00:00.000Z`);
}

export function fromDate(value: Date): string;
export function fromDate(value: Date | null): string | null;
export function fromDate(value: Date | null): string | null {
  return value === null ? null : value.toISOString().slice(0, 10);
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: "Validation failed", issues: error.issues });
  } else if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({ error: "A record with this value already exists" });
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    res.status(404).json({ error: "Not found" });
  } else {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
