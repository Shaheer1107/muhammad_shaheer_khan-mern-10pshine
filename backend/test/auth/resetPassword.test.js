// test/auth/resetPassword.test.js
import sinon from "sinon";
import { expect } from "chai";
import request from "supertest";
import User from "../../src/models/User.js";
import { createPasswordResetToken } from "../../test/helpers.js";

// ✅ Import app normally (mailer stub is already handled globally in setup.js)
import app from "../../src/app.js";

describe("POST /api/auth/reset-password", () => {
  let user, rawToken;
  let consoleLogStub;

  beforeEach(async () => {
    // Silence console logs for cleaner test output
    consoleLogStub = sinon.stub(console, "log").callsFake(() => {});

    // Create test user and password reset token
    user = await User.create({
      name: "Reset User",
      email: "reset@example.com",
      passwordHash: "oldhash",
    });

    rawToken = await createPasswordResetToken(user._id);

    // Reset fake mailer history if exists (for test isolation)
    if (global.__FAKE_TRANSPORT) {
      if (typeof global.__FAKE_TRANSPORT.sendMail.resetHistory === "function") {
        global.__FAKE_TRANSPORT.sendMail.resetHistory();
      }
      if (typeof global.__FAKE_TRANSPORT.verify.resetHistory === "function") {
        global.__FAKE_TRANSPORT.verify.resetHistory();
      }
    }
  });

  afterEach(() => {
    consoleLogStub.restore();
  });

  it("✅ should reset password for valid token", async function () {
    this.timeout(10000);

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({
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
