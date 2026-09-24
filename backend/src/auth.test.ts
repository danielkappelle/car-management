import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

const app = createApp();

describe("auth", () => {
  it("serves the health check without login", async () => {
    await request(app).get("/api/health").expect(200, { ok: true });
  });

  it("rejects API calls without a session", async () => {
    await request(app).get("/api/cars").expect(401);
  });

  it("rejects wrong credentials", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "wrong" })
      .expect(401);
    await request(app)
      .post("/api/auth/login")
      .send({ username: "other", password: "secret" })
      .expect(401);
  });

  it("rejects a malformed login body", async () => {
    await request(app).post("/api/auth/login").send({ username: "admin" }).expect(400);
  });

  it("logs in with a session cookie", async () => {
    const agent = request.agent(app);
    const login = await agent
      .post("/api/auth/login")
      .send({ username: "admin", password: "secret" })
      .expect(200);

    const cookie = login.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toMatch(/^session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);

    await agent.get("/api/auth/me").expect(200, { username: "admin" });
    await agent.post("/api/auth/logout").expect(204);
    await agent.get("/api/auth/me").expect(401);
  });

  it("rejects a tampered session cookie", async () => {
    await request(app).get("/api/auth/me").set("Cookie", "session=not-a-jwt").expect(401);
  });
});
