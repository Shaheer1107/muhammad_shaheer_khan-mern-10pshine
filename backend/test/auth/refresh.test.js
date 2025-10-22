// test/auth/refresh.test.js
import { expect } from "chai";
import request from "supertest";
import app from "../../src/app.js";
import User from "../../src/models/User.js";
import { createValidRefreshToken } from "../../test/helpers.js";

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
