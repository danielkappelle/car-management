import { createHash, timingSafeEqual } from "node:crypto";
import { loginInput } from "@car/shared";
import bcrypt from "bcryptjs";
import { type RequestHandler, type Response, Router } from "express";
import { rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { HttpError } from "./http.js";

const COOKIE_NAME = "session";
const SESSION_DAYS = 90;
/** Sessions older than this are reissued, so an active user is never logged out. */
const RENEW_AFTER_SECONDS = 24 * 60 * 60;

function setSessionCookie(res: Response, username: string) {
  const token = jwt.sign({ sub: username }, config.SESSION_SECRET, {
    expiresIn: `${SESSION_DAYS}d`,
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: "lax",
    path: "/api",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

function safeEqual(a: string, b: string): boolean {
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(a), hash(b));
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token: unknown = req.cookies?.[COOKIE_NAME];
  if (typeof token !== "string") {
    throw new HttpError(401, "Not logged in");
  }

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.SESSION_SECRET) as jwt.JwtPayload;
  } catch {
    throw new HttpError(401, "Session expired");
  }
  if (payload.sub !== config.AUTH_USERNAME) {
    throw new HttpError(401, "Not logged in");
  }

  if (payload.iat !== undefined && Date.now() / 1000 - payload.iat > RENEW_AFTER_SECONDS) {
    setSessionCookie(res, payload.sub);
  }
  res.locals.username = payload.sub;
  next();
};

export const authRouter = Router();

authRouter.post(
  "/login",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }),
  async (req, res) => {
    const { username, password } = loginInput.parse(req.body);
    // Always run bcrypt, so a wrong username takes as long as a wrong password.
    const passwordOk = await bcrypt.compare(password, config.AUTH_PASSWORD_HASH);
    if (!safeEqual(username, config.AUTH_USERNAME) || !passwordOk) {
      throw new HttpError(401, "Invalid username or password");
    }
    setSessionCookie(res, config.AUTH_USERNAME);
    res.json({ username: config.AUTH_USERNAME });
  },
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/api" });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json({ username: res.locals.username });
});
