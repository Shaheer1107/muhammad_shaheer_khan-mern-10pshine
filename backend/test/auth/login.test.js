// test/auth/login.test.js
import { expect } from "chai";
import request from "supertest";
import app from "../../src/app.js";
import User from "../../src/models/User.js";

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash("password123", 10);
    await User.create({
      name: "Test User",
      email: "test@example.com",
      passwordHash,
    });
  });

  it("✅ should log in successfully and return an access token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "password123",
      });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("accessToken");
    expect(res.headers["set-cookie"]).to.satisfy(
      (cookies) => cookies && cookies.some((c) => c.includes("_refresh_token"))
    );
  });

  it("❌ should reject login with invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "wrongpassword",
      });

    expect(res.status).to.equal(400);
    expect(res.body.error.message).to.equal("Invalid credentials");
  });
});
