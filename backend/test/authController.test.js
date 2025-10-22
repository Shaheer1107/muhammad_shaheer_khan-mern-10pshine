import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as chai from "chai";
import request from "supertest";
import sinon from "sinon";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import app from "../src/app.js";
import User from "../src/models/User.js";
import RefreshToken from "../src/models/RefreshToken.js";
import PasswordResetToken from "../src/models/PasswordResetToken.js";

const { expect } = chai;
let mongoServer;

/**
 * 🧩 Helper function to create a valid refresh token document
 *
 * Store only tokenHash (secure). Return rawToken so tests can send it.
 */
async function createValidRefreshToken(user) {
  const rawToken = crypto.randomBytes(40).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({ user, tokenHash, expiresAt });
  return rawToken;
}

/**
 * 🧩 Helper function to create a valid password reset token document
 *
 * Store only tokenHash (secure). Return rawToken so tests can send it.
 */
async function createPasswordResetToken(user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  await PasswordResetToken.create({
    user,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

/**
 * 🧪 AUTH CONTROLLER INTEGRATION TESTS
 */
describe("🔐 Auth Controller Integration Tests", function () {
  this.timeout(10000);

  // ---------------- SETUP & TEARDOWN ----------------
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
    await PasswordResetToken.deleteMany({});
  });

  // ---------------- REGISTER TESTS ----------------
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

  // ---------------- LOGIN TESTS ----------------
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

  // ---------------- REFRESH TOKEN TESTS ----------------
  describe("POST /api/auth/refresh", () => {
    let user, validRefreshToken;

    beforeEach(async () => {
      user = await User.create({
        name: "Refresh User",
        email: "refresh@example.com",
        passwordHash: "hashedpassword",
      });
      validRefreshToken = await createValidRefreshToken(user._id);
    });

    it("✅ should return a new access token for valid refresh token", async () => {
      // send token both as cookie (normal) and in body (controller has fallback)
      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", [`_refresh_token=${validRefreshToken}`])
        .send({ refreshToken: validRefreshToken });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("accessToken");
    });

    it("❌ should reject invalid or missing refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", [`_refresh_token=invalidtoken`])
        .send({ refreshToken: "invalidtoken" });

      expect(res.status).to.be.oneOf([400, 401]);
    });
  });

  // ---------------- LOGOUT TESTS ----------------
  describe("POST /api/auth/logout", () => {
    it("✅ should clear refresh token and cookie", async () => {
      const user = await User.create({
        name: "Logout User",
        email: "logout@example.com",
        passwordHash: "hashedpassword",
      });
      const refreshTokenValue = await createValidRefreshToken(user._id);

      // send token both as cookie and in body so controller finds it reliably
      const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", [`_refresh_token=${refreshTokenValue}`])
        .send({ refreshToken: refreshTokenValue });

      expect(res.status).to.equal(200);
      expect(res.body.message).to.match(/logged out/i);

      const tokenHash = crypto
        .createHash("sha256")
        .update(refreshTokenValue)
        .digest("hex");
      const token = await RefreshToken.findOne({ tokenHash });
      expect(token).to.be.null;
    });
  });

  // ---------------- FORGOT PASSWORD TESTS ----------------
  describe("POST /api/auth/forgot-password", () => {
    let emailStub;

    beforeEach(() => {
      emailStub = sinon.stub(console, "log").callsFake(() => {});
    });

    afterEach(() => {
      emailStub.restore();
    });

    it("✅ should simulate sending reset email if user exists", async () => {
      await User.create({
        name: "Forgot User",
        email: "forgot@example.com",
        passwordHash: "hashed",
      });

      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "forgot@example.com" });

      expect(res.status).to.be.oneOf([200, 201]);
    });

    it("✅ should still return success message for non-existent email", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "notfound@example.com" });

      expect(res.status).to.be.oneOf([200, 201]);
    });
  });

  // ---------------- RESET PASSWORD TESTS ----------------
  describe("POST /api/auth/reset-password", () => {
    let user, rawToken;

    beforeEach(async () => {
      user = await User.create({
        name: "Reset User",
        email: "reset@example.com",
        passwordHash: "oldhash",
      });
      rawToken = await createPasswordResetToken(user._id);
    });

    it("✅ should reset password for valid token", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          // controller expects token + id + newPassword in body
          token: rawToken,
          id: user._id.toString(),
          newPassword: "newpassword123",
        });

      expect(res.status).to.be.oneOf([200, 201]);

      const updated = await User.findById(user._id);
      expect(updated.passwordHash).to.not.equal("oldhash");
    });

    it("❌ should reject expired or invalid token", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          token: "invalidtoken",
          id: user._id.toString(),
          newPassword: "newpassword",
        });

      expect(res.status).to.be.oneOf([400, 401]);
    });
  });
});
