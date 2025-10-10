// src/controllers/notesController.js
import * as noteService from "../services/notesService.js";
import logger from "../logger.js";
import { sanitizeAndExtract } from "../utils/sanitize.js";

/**
 * Prefer request-scoped logger (req.log) if present, otherwise fallback to module logger
 */
function getLog(req) {
  return (req && req.log) ? req.log : logger;
}

/**
 * Create note
 * Accepts:
 *  - heading (preferred) or title (legacy)
 *  - contentHtml (preferred) or content (legacy)
 *  - contentJson (optional TipTap JSON)
 */
export async function createNoteHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user?.id ?? req.user?._id;
    // prefer new field names, fallback to legacy ones
    const heading = (req.body.heading ?? req.body.title ?? "").trim();
    const rawContentHtml = req.body.contentHtml ?? req.body.content ?? "";
    const contentJson = req.body.contentJson ?? null;

    log.info(
      { userId, action: "create_note_attempt", heading: heading ? heading.slice(0, 120) : null },
      "Creating note"
    );

    // sanitize HTML and extract plainText for search
    const { clean: contentHtml, plainText } = sanitizeAndExtract(rawContentHtml);

    // Pass both legacy and new fields to service so service can support both
    const payload = {
      title: heading, // keep legacy property for backward compatibility
      heading,
      content: contentHtml, // legacy 'content' receives sanitized HTML for now
      contentHtml,
      contentJson,
      plainText,
    };

    const note = await noteService.createNote(userId, payload);

    log.info({ userId, noteId: note._id, action: "create_note_success" }, "Note created");
    return res.status(201).json({ success: true, note });
  } catch (err) {
    getLog(req).error({ err }, "Error creating note");
    return next(err);
  }
}

/**
 * List notes for user
 * Query params:
 *  - q: optional text search
 *  - limit: number (default 100)
 *  - skip: number (default 0)
 */
export async function listNotesHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user?.id ?? req.user?._id;
    const { q } = req.query;
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 100);
    const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);

    log.info({ userId, action: "list_notes", q, limit, skip }, "Listing notes");

    const notes = await noteService.getNotesForUser(userId, { q, limit, skip });

    return res.json({ success: true, notes });
  } catch (err) {
    log.error({ err }, "Error listing notes");
    return next(err);
  }
}

/**
 * Get single note
 */
export async function getNoteHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user?.id ?? req.user?._id;
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
    return next(err);
  }
}

/**
 * Update note
 * Accepts same fields as create handler
 * Service should handle versioning if desired
 */
export async function updateNoteHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user?.id ?? req.user?._id;
    const { id } = req.params;

    const heading = (req.body.heading ?? req.body.title ?? "").trim();
    const rawContentHtml = req.body.contentHtml ?? req.body.content ?? "";
    const contentJson = req.body.contentJson ?? null;

    log.info({ userId, noteId: id, action: "update_note_attempt" }, "Updating note");

    // sanitize incoming HTML and extract plain text
    const { clean: contentHtml, plainText } = sanitizeAndExtract(rawContentHtml);

    const payload = {
      title: heading,
      heading,
      content: contentHtml, // legacy field gets sanitized HTML
      contentHtml,
      contentJson,
      plainText,
    };

    const updated = await noteService.updateNote(userId, id, payload);

    if (!updated) {
      log.warn({ userId, noteId: id, action: "update_note_not_found" }, "Note not found or not editable");
      return res.status(404).json({ success: false, message: "Note not found or not editable" });
    }

    log.info({ userId, noteId: id, action: "update_note_success" }, "Note updated");
    return res.json({ success: true, note: updated });
  } catch (err) {
    log.error({ err }, "Error updating note");
    return next(err);
  }
}

/**
 * Delete note
 * Query param: hard=true for permanent delete
 * noteService.deleteNote should accept `{ soft: boolean }`
 */
export async function deleteNoteHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user?.id ?? req.user?._id;
    const { id } = req.params;
    const hard = req.query.hard === "true";

    log.info({ userId, noteId: id, hard: hard === "true", action: "delete_note_attempt" }, "Deleting note");

    const result = await noteService.deleteNote(userId, id, { soft: hard !== "true" });

    if (!result) {
      log.warn({ userId, noteId: id, action: "delete_note_not_found" }, "Note not found");
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    log.info({ userId, noteId: id, hard: hard === "true", action: "delete_note_success" }, "Note deleted");
    return res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    log.error({ err }, "Error deleting note");
    return next(err);
  }
}
