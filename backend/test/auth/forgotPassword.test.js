// test/auth/forgotPassword.test.js
import sinon from "sinon";
import request from "supertest";
import { expect } from "chai";
import User from "../../src/models/User.js";

// Import app normally — test/setup.js already stubs nodemailer.createTransport
import app from "../../src/app.js";

describe("POST /api/auth/forgot-password", () => {
  let consoleLogStub;

  beforeEach(() => {
    // silence noisy console.log calls
    consoleLogStub = sinon.stub(console, "log").callsFake(() => {});

    // reset fake transport history (setup.js already resets, but double-safety here)
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

  it("✅ should simulate sending reset email if user exists", async function () {
    // keep generous timeout if the app performs other async tasks
    this.timeout(10000);

    await User.create({
      name: "Forgot User",
      email: "forgot@example.com",
      passwordHash: "hashed",
    });

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "forgot@example.com" });

    expect(res.status).to.be.oneOf([200, 201]);

    // assert the global fake transport was used
    expect(global.__FAKE_TRANSPORT).to.exist;
    expect(global.__FAKE_TRANSPORT.sendMail.called).to.equal(true);

    const lastCallArgs = global.__FAKE_TRANSPORT.sendMail.lastCall.args[0];
    expect(lastCallArgs).to.have.property("to").that.includes("forgot@example.com");
  });

  it("✅ should still return success message for non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "notfound@example.com" });

    expect(res.status).to.be.oneOf([200, 201]);

    // ensure no mail to notfound
    if (global.__FAKE_TRANSPORT && global.__FAKE_TRANSPORT.sendMail.called) {
      const calledWithNotFound = global.__FAKE_TRANSPORT.sendMail
        .getCalls()
        .some((c) => c.args[0] && c.args[0].to && c.args[0].to.includes("notfound@example.com"));
      expect(calledWithNotFound).to.equal(false);
    }
  });
});
