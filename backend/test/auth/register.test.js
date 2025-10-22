// test/auth/register.test.js
import { expect } from "chai";
import request from "supertest";
import app from "../../src/app.js";
import User from "../../src/models/User.js";

describe("POST /api/auth/register", () => {
  it("✅ should register a new user successfully", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      });

    expect(res.status).to.equal(201);
    expect(res.body).to.have.property("message").that.includes("registered");

    const user = await User.findOne({ email: "john@example.com" });
    expect(user).to.exist;
    expect(user.passwordHash).to.not.equal("password123");
  });

  it("❌ should reject duplicate email registration", async () => {
    await User.create({
      name: "Jane",
      email: "jane@example.com",
      passwordHash: "hashed",
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Jane",
        email: "jane@example.com",
        password: "password123",
      });

    expect(res.status).to.equal(400);
    expect(res.body.error.message).to.equal("Email already in use");
  });
});