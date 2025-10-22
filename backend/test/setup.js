// test/setup.js
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../src/models/User.js";
import RefreshToken from "../src/models/RefreshToken.js";
import PasswordResetToken from "../src/models/PasswordResetToken.js";

import sinon from "sinon";
import nodemailer from "nodemailer";

/**
 * GLOBAL fake transporter for tests that use email.
 * We create it once here so multiple test files won't try to stub createTransport.
 * Tests can inspect call history via global.__FAKE_TRANSPORT.
 */
const fakeTransport = {
  sendMail: sinon.stub().resolves({ messageId: "test-msg" }),
  verify: sinon.stub().resolves(true),
};

// Only stub createTransport if it hasn't already been stubbed by Sinon
if (typeof nodemailer.createTransport.restore !== "function") {
  sinon.stub(nodemailer, "createTransport").returns(fakeTransport);
}

// Expose to tests for assertions
global.__FAKE_TRANSPORT = fakeTransport;
global.__NODemailer_CREATE_TRANSPORT_STUB = nodemailer.createTransport;

let mongoServer;

/**
 * Shared Mocha hooks that run before/after the whole test suite.
 * This file is loaded with --file test/setup.js (so hooks apply globally).
 */
before(async function () {
  this.timeout(20000);
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

after(async () => {
  // Attempt to restore the nodemailer stub so it doesn't leak outside tests
  try {
    if (nodemailer.createTransport && typeof nodemailer.createTransport.restore === "function") {
      nodemailer.createTransport.restore();
    }
  } catch (err) {
    // ignore restore errors
  }

  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  // clear collections used by auth tests before each test
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
  await PasswordResetToken.deleteMany({});

  // reset fake transport call history so each test starts clean
  if (global.__FAKE_TRANSPORT) {
    if (typeof global.__FAKE_TRANSPORT.sendMail.resetHistory === "function") {
      global.__FAKE_TRANSPORT.sendMail.resetHistory();
    }
    if (typeof global.__FAKE_TRANSPORT.verify.resetHistory === "function") {
      global.__FAKE_TRANSPORT.verify.resetHistory();
    }
  }
});
