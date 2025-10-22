// test/notes/list.test.js
import { expect } from "chai";
import request from "supertest";
import User from "../../src/models/User.js";
import Note from "../../src/models/Note.js";
import app from "../../src/app.js";
import { registerAndLogin } from "./helpers.js";

describe("GET /api/notes — list", function () {
  this.timeout(10000);
  let token;
  let email;
  let createdIds = [];

  before(async () => {
    await Note.deleteMany({});
    await User.deleteMany({});

    const auth = await registerAndLogin();
    token = auth.accessToken;
    email = auth.email;

    // create some notes via service/model (faster) so controller will list them
    const notes = [
      { heading: "Shopping list", contentHtml: "<p>Buy milk</p>" },
      { heading: "Work", contentHtml: "<p>Finish report</p>" },
      { heading: "Personal", contentHtml: "<p>Call mom</p>" },
    ];

    for (const n of notes) {
      const res = await request(app)
        .post("/api/notes")
        .set("Authorization", `Bearer ${token}`)
        .send(n);
      createdIds.push(res.body.note._id);
    }
  });

  after(async () => {
    await Note.deleteMany({});
    await User.deleteMany({ email });
  });

  it("returns a list of notes and supports q search", async () => {
    const res = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .query({ limit: 10 });

    expect(res.status).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(res.body.count).to.be.at.least(3);
    expect(res.body.notes).to.be.an("array");

    // search for 'milk'
    const search = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .query({ q: "milk" });

    expect(search.status).to.equal(200);
    expect(search.body.count).to.be.at.least(1);
    expect(search.body.notes[0].heading).to.include("Shopping");
  });
});
