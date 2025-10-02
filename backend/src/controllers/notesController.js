import * as noteService from "../services/notesService.js";
import logger from "../logger.js";

function getLog(req) {
  return (req && req.log) ? req.log : logger;
}

export async function createNoteHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user.id;
    const { title, content } = req.body;
    log.info({ userId, action: "create_note", title: title ? title.slice(0, 120) : null }, "Creating note");
    const note = await noteService.createNote(userId, { title, content });
    log.info({ userId, noteId: note._id, action: "create_note_success" }, "Note created");
    return res.status(201).json({ success: true, note });
  } catch (err) {
    getLog(req).error({ err }, "Error creating note");
    next(err);
  }
}

export async function listNotesHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user.id;
    const { q, limit = 100, skip = 0 } = req.query;
    log.info({ userId, action: "list_notes", q, limit, skip }, "Listing notes");
    const notes = await noteService.getNotesForUser(userId, { q, limit, skip });
    return res.json({ success: true, notes });
  } catch (err) {
    log.error({ err }, "Error listing notes");
    next(err);
  }
}

export async function getNoteHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user.id;
    const { id } = req.params;
    log.info({ userId, noteId: id, action: "get_note" }, "Fetching note");
    const note = await noteService.getNoteById(userId, id);
    if (!note) {
      log.warn({ userId, noteId: id, action: "get_note_not_found" }, "Note not found");
      return res.status(404).json({ success: false, message: "Note not found" });
    }
    return res.json({ success: true, note });
  } catch (err) {
    log.error({ err }, "Error getting note");
    next(err);
  }
}

export async function updateNoteHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, content } = req.body;
    log.info({ userId, noteId: id, action: "update_note" }, "Updating note");
    const updated = await noteService.updateNote(userId, id, { title, content });
    if (!updated) {
      log.warn({ userId, noteId: id, action: "update_note_not_found" }, "Note not found or not editable");
      return res.status(404).json({ success: false, message: "Note not found or not editable" });
    }
    log.info({ userId, noteId: id, action: "update_note_success" }, "Note updated");
    return res.json({ success: true, note: updated });
  } catch (err) {
    log.error({ err }, "Error updating note");
    next(err);
  }
}

export async function deleteNoteHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { hard } = req.query;
    log.info({ userId, noteId: id, hard: hard === "true", action: "delete_note" }, "Deleting note");
    const result = await noteService.deleteNote(userId, id, { soft: hard !== "true" ? true : false });
    if (!result) {
      log.warn({ userId, noteId: id, action: "delete_note_not_found" }, "Note not found");
      return res.status(404).json({ success: false, message: "Note not found" });
    }
    log.info({ userId, noteId: id, hard: hard === "true", action: "delete_note_success" }, "Note deleted");
    return res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    log.error({ err }, "Error deleting note");
    next(err);
  }
}
