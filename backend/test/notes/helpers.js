// test/notes/helpers.js
import request from "supertest";
import { expect } from "chai";
import app from "../../src/app.js";

/**
 * Register and login a fresh user, returning { accessToken, email, password }
 * Keeps username unique using Date.now()
 */
export async function registerAndLogin(overrides = {}) {
  const random = Date.now() + Math.floor(Math.random() * 1000);
  const email = overrides.email ?? `notes_user_${random}@example.com`;
  const password = overrides.password ?? "password123";

  // register
  const reg = await request(app)
    .post("/api/auth/register")
    .send({ name: "Notes Tester", email, password });

  // accept either 200 or 201 (some controllers use 201)
  expect(reg.status).to.be.oneOf([200, 201]);

  // login
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  expect(loginRes.status).to.equal(200);
  const accessToken = loginRes.body?.accessToken;
  expect(accessToken).to.exist;

  return { accessToken, email, password };
}
