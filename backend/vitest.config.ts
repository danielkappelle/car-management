import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["source"] },
  test: {
    env: {
      DATABASE_URL: "mysql://test:test@localhost:1/test",
      AUTH_USERNAME: "admin",
      // bcrypt hash of "secret"
      AUTH_PASSWORD_HASH: "$2b$04$3fX9..ItcZtW.XOEQyugW.CsuZe/7hy3XiRSdjd2wUVjl4e81yiGS",
      SESSION_SECRET: "test-secret-that-is-at-least-32-characters-long",
      COOKIE_SECURE: "false",
    },
  },
});
