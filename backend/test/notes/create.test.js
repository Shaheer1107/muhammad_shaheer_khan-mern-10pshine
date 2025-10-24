// test/notes/create.test.js
import { expect } from "chai";
import request from "supertest";
import User from "../../src/models/User.js";
import Note from "../../src/models/Note.js";
import app from "../../src/app.js";
import { registerAndLogin } from "./helpers.js";

describe("POST /api/notes — create", function () {
  this.timeout(10000);
  let token;
  let email;

  before(async () => {
    // clean
    await Note.deleteMany({});
    await User.deleteMany({});
    const auth = await registerAndLogin();
    token = auth.accessToken;
    email = auth.email;
  });

  after(async () => {
    await Note.deleteMany({});
    await User.deleteMany({ email });
  });

  it("creates a note with attachments (stringified attachments accepted)", async () => {
    const payload = {
      heading: "Create test",
      contentHtml: "<p>Hello create</p>",
      attachments: JSON.stringify([{ url: "http://cdn/a.png" }]),
    };

    const res = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.status).to.equal(201);
    expect(res.body.success).to.equal(true);
    expect(res.body.note).to.exist;
    expect(res.body.note.heading).to.equal("Create test");
    expect(Array.isArray(res.body.note.attachments)).to.equal(true);
  });
});
