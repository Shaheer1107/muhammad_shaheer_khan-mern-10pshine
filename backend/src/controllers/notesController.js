import * as noteService from "../services/notesService.js";
import logger from "../logger.js";

export async function createNoteHandler(req, res, next) {
  try {
    const userId = req.user.id;
    const { title, content } = req.body;
    const note = await noteService.createNote(userId, { title, content });
    logger.info({ userId, noteId: note._id }, "Note created");
    return res.status(201).json({ success: true, note });
  } catch (err) {
    next(err);
  }
}

export async function listNotesHandler(req, res, next) {
  try {
    const userId = req.user.id;
    const { q, limit = 100, skip = 0 } = req.query;
    const notes = await noteService.getNotesForUser(userId, { q, limit, skip });
    return res.json({ success: true, notes });
  } catch (err) {
    next(err);
  }
}

export async function getNoteHandler(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const note = await noteService.getNoteById(userId, id);
    if (!note) return res.status(404).json({ success: false, message: "Note not found" });
    return res.json({ success: true, note });
  } catch (err) {
    next(err);
  }
}

export async function updateNoteHandler(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, content } = req.body;
    const updated = await noteService.updateNote(userId, id, { title, content });
    if (!updated) return res.status(404).json({ success: false, message: "Note not found or not editable" });
    logger.info({ userId, noteId: id }, "Note updated");
    return res.json({ success: true, note: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteNoteHandler(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { hard } = req.query;
    const result = await noteService.deleteNote(userId, id, { soft: hard !== "true" ? true : false });
    if (!result) return res.status(404).json({ success: false, message: "Note not found" });
    logger.info({ userId, noteId: id, hard: hard === "true" }, "Note deleted");
    return res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    next(err);
  }
}
