import cookieParser from "cookie-parser";
import express from "express";
import { authRouter, requireAuth } from "./auth.js";
import { errorHandler, notFound } from "./http.js";
import { carsRouter } from "./routes/cars.js";
import { defectsRouter } from "./routes/defects.js";
import { fuelRouter } from "./routes/fuel.js";
import { maintenanceRouter } from "./routes/maintenance.js";

export function createApp() {
  const app = express();
  // Always runs behind a reverse proxy (nginx in production, Vite in development).
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/auth", authRouter);

  const api = express.Router();
  api.use(requireAuth);
  api.use("/cars", carsRouter);
  api.use("/cars/:carId/fuel", fuelRouter);
  api.use("/cars/:carId/defects", defectsRouter);
  api.use("/cars/:carId/maintenance", maintenanceRouter);
  app.use("/api", api);

  app.use(() => {
    throw notFound();
  });
  app.use(errorHandler);
  return app;
}
