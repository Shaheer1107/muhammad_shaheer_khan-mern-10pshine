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
 * Helper to parse attachments field which may arrive as:
 *  - an array (client sends JSON via application/json)
 *  - a JSON string (client sends form-data with attachments as stringified JSON)
 * Returns an array or undefined (if not provided)
 */
function parseAttachmentsField(raw) {
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s === "") return undefined;
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Create note
 */
export async function createNoteHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user?.id ?? req.user?._id;
    const heading = (req.body.heading ?? req.body.title ?? "").trim();

    let contentJson = req.body.contentJson ?? null;
    if (typeof contentJson === "string" && contentJson.trim()) {
      try { contentJson = JSON.parse(contentJson); } catch { contentJson = null; }
    }

    const rawContentHtml = req.body.contentHtml ?? req.body.content ?? "";

    log.info(
      { userId, action: "create_note_attempt", heading: heading ? heading.slice(0, 120) : null },
      "Creating note"
    );

    const { clean: contentHtml, plainText } = sanitizeAndExtract(rawContentHtml);

    const attachmentsFromBody = parseAttachmentsField(req.body.attachments);

    // UPDATED: point URLs to /uploads/note_images/
    const uploadedAttachments = (req.files || []).map((f) => ({
      filename: f.filename,
      url: `${req.protocol}://${req.get("host")}/uploads/note_images/${f.filename}`,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      uploadedAt: new Date(),
      uploadedBy: userId,
    }));

    let attachments;
    if (attachmentsFromBody !== undefined) {
      attachments = attachmentsFromBody.map((a) =>
        (typeof a === "string") ? { url: a } : a
      ).concat(uploadedAttachments);
    } else if (uploadedAttachments.length > 0) {
      attachments = uploadedAttachments;
    } else {
      attachments = [];
    }

    const payload = {
      title: heading,
      heading,
      content: contentHtml,
      contentHtml,
      contentJson,
      plainText,
      attachments,
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
 */
export async function listNotesHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user?.id ?? req.user?._id;

    // --- Extract query params ---
    const {
      q,
      includeDeleted,
      filterType,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = req.query;

    const limit = Math.max(1, parseInt(req.query.limit, 10) || 100);
    const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);

    log.info(
      {
        userId,
        action: "list_notes",
        q,
        includeDeleted,
        filterType,
        startDate,
        endDate,
        sortBy,
        sortOrder,
        limit,
        skip,
      },
      "Listing notes"
    );

    // --- Fetch notes from service ---
    const notes = await noteService.getNotesForUser(userId, {
      includeDeleted: includeDeleted === "true",
      q,
      filterType,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      limit,
      skip,
    });

    return res.json({
      success: true,
      count: notes.length,
      notes,
    });
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
 */
export async function updateNoteHandler(req, res, next) {
  const log = getLog(req);
  try {
    const userId = req.user?.id ?? req.user?._id;
    const { id } = req.params;
    const heading = (req.body.heading ?? req.body.title ?? "").trim();

    let contentJson = req.body.contentJson ?? null;
    if (typeof contentJson === "string" && contentJson.trim()) {
      try { contentJson = JSON.parse(contentJson); } catch { contentJson = null; }
    }

    const rawContentHtml = req.body.contentHtml ?? req.body.content ?? "";

    log.info({ userId, noteId: id, action: "update_note_attempt" }, "Updating note");

    const { clean: contentHtml, plainText } = sanitizeAndExtract(rawContentHtml);

    const attachmentsFromBody = parseAttachmentsField(req.body.attachments);

    // UPDATED: point URLs to /uploads/note_images/
    const uploadedAttachments = (req.files || []).map((f) => ({
      filename: f.filename,
      url: `${req.protocol}://${req.get("host")}/uploads/note_images/${f.filename}`,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      uploadedAt: new Date(),
      uploadedBy: userId,
    }));

    let finalAttachments;
    if (attachmentsFromBody !== undefined) {
      finalAttachments = attachmentsFromBody.map((a) =>
        (typeof a === "string") ? { url: a } : a
      ).concat(uploadedAttachments);
    } else if (uploadedAttachments.length > 0) {
      finalAttachments = uploadedAttachments;
    } else {
      finalAttachments = undefined;
    }

    const payload = {
      title: heading,
      heading,
      content: contentHtml,
      contentHtml,
      contentJson,
      plainText,
    };

    if (finalAttachments !== undefined) {
      payload.attachments = finalAttachments;
    }

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
