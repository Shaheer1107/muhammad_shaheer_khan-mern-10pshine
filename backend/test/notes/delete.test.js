// test/notes/delete.test.js
import { expect } from "chai";
import request from "supertest";
import User from "../../src/models/User.js";
import Note from "../../src/models/Note.js";
import app from "../../src/app.js";
import { registerAndLogin } from "./helpers.js";

describe("DELETE /api/notes/:id — delete", function () {
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
      .send({ heading: "To delete", contentHtml: "<p>x</p>" });

    noteId = create.body.note._id;
  });

  after(async () => {
    await Note.deleteMany({});
    await User.deleteMany({ email });
  });

  it("soft-deletes the note by default", async () => {
    const res = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(res.body.message).to.match(/deleted/i);
  });
});
