import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { config } from "./config.js";
import { PrismaClient } from "./generated/prisma/client.js";

export const prisma = new PrismaClient({ adapter: new PrismaMariaDb(config.DATABASE_URL) });
