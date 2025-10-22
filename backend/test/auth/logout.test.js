// test/auth/logout.test.js
import { expect } from "chai";
import request from "supertest";
import crypto from "crypto";
import app from "../../src/app.js";
import User from "../../src/models/User.js";
import RefreshToken from "../../src/models/RefreshToken.js";
import { createValidRefreshToken } from "../../test/helpers.js";

describe("POST /api/auth/logout", () => {
  it("✅ should clear refresh token and cookie", async () => {
    const user = await User.create({
      name: "Logout User",
      email: "logout@example.com",
      passwordHash: "hashedpassword",
    });
    const refreshTokenValue = await createValidRefreshToken(user._id);

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
