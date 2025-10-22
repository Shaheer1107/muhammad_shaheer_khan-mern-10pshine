// test/notes/update.test.js
import { expect } from "chai";
import request from "supertest";
import User from "../../src/models/User.js";
import Note from "../../src/models/Note.js";
import app from "../../src/app.js";
import { registerAndLogin } from "./helpers.js";

describe("PUT /api/notes/:id — update", function () {
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
      .send({ heading: "To update", contentHtml: "<p>old</p>" });

    noteId = create.body.note._id;
  });

  after(async () => {
    await Note.deleteMany({});
    await User.deleteMany({ email });
  });

  it("updates the note and returns new data", async () => {
    const res = await request(app)
      .put(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ heading: "Updated heading", attachments: JSON.stringify([]) });

    expect(res.status).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(res.body.note.heading).to.equal("Updated heading");
  });
});
