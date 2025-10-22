// test/notes/notesService.test.js
import { expect } from "chai";
import Note from "../../src/models/Note.js";
import User from "../../src/models/User.js";
import * as noteService from "../../src/services/notesService.js";

describe("notesService (direct DB tests)", () => {
  let user;

  beforeEach(async () => {
    user = await User.create({
      name: "Notes User",
      email: `notes_user_${Date.now()}@example.com`,
      passwordHash: "hashed",
    });
    await Note.deleteMany({});
  });

  afterEach(async () => {
    await Note.deleteMany({});
    if (user) await User.deleteOne({ _id: user._id });
  });

  it("createNote: should create and persist a note with attachments", async () => {
    const payload = {
      heading: "My test note",
      contentHtml: "<p>Hello <strong>World</strong></p>",
      contentJson: { ops: [] },
      attachments: [{ url: "http://example.com/img.png", originalName: "img.png" }],
    };

    const note = await noteService.createNote(user._id, payload);
    expect(note).to.exist;
    expect(note.user.toString()).to.equal(user._id.toString());
    expect(note.heading).to.equal("My test note");
    expect(Array.isArray(note.attachments)).to.equal(true);
    expect(note.attachments[0].url).to.equal("http://example.com/img.png");
  });

  it("getNotesForUser: should return notes and support text search", async () => {
    await noteService.createNote(user._id, { heading: "Shopping list", contentHtml: "<p>Buy milk</p>" });
    await noteService.createNote(user._id, { heading: "Work", contentHtml: "<p>Finish report</p>" });

    const all = await noteService.getNotesForUser(user._id, { limit: 10, skip: 0 });
    expect(all.length).to.equal(2);

    const search = await noteService.getNotesForUser(user._id, { q: "milk" });
    expect(search.length).to.equal(1);
    expect(search[0].heading).to.include("Shopping");
  });

  it("updateNote: should update and keep versions", async () => {
    const note = await noteService.createNote(user._id, { heading: "V1", contentHtml: "<p>old</p>" });
    const updated = await noteService.updateNote(user._id, note._id.toString(), {
      heading: "V2",
      contentHtml: "<p>new</p>",
      attachments: [{ url: "http://cdn/new.png" }],
    });

    expect(updated).to.exist;
    expect(updated.heading).to.equal("V2");
    expect(updated.versions).to.be.an("array").that.is.not.empty;
    expect(updated.attachments[0].url).to.equal("http://cdn/new.png");
  });

  it("deleteNote: should soft-delete and hard-delete correctly", async () => {
    const note = await noteService.createNote(user._id, { heading: "ToDelete", contentHtml: "<p>x</p>" });

    const soft = await noteService.deleteNote(user._id, note._id.toString(), { soft: true });
    expect(soft).to.exist;
    expect(soft.isDeleted).to.equal(true);

    const note2 = await noteService.createNote(user._id, { heading: "Removable", contentHtml: "<p>y</p>" });
    const hard = await noteService.deleteNote(user._id, note2._id.toString(), { soft: false });
    expect(hard).to.exist;
    const lookup = await Note.findById(note2._id);
    expect(lookup).to.be.null;
  });
});
