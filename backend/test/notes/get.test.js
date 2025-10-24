// test/notes/get.test.js
import { expect } from "chai";
import request from "supertest";
import User from "../../src/models/User.js";
import Note from "../../src/models/Note.js";
import app from "../../src/app.js";
import { registerAndLogin } from "./helpers.js";

describe("GET /api/notes/:id — get single", function () {
  this.timeout(10000);
  let token;
  let email;
  let noteId;

  before(async () => {
    await Note.deleteMany({});
    await User.deleteMany({});

    const auth = await registerAndLogin();
    token = auth.accessToken;
    email = auth.email;

    const create = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .send({ heading: "One note", contentHtml: "<p>abc</p>" });

    noteId = create.body.note._id;
  });

  after(async () => {
    await Note.deleteMany({});
    await User.deleteMany({ email });
  });

  it("returns 404 for unknown note", async () => {
    const res = await request(app)
      .get(`/api/notes/612345678901234567890123`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(404);
  });

  it("fetches the created note", async () => {
    const res = await request(app)
      .get(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.note).to.exist;
    expect(res.body.note._id).to.equal(noteId);
  });
});
