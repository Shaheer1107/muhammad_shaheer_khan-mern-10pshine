// src/services/notesService.js
import Note from "../models/Note.js";
import { convert } from "html-to-text";

/**
 * Helper: normalize incoming payload so service can accept both legacy and new fields
 * - payload may contain: title, content (legacy) OR heading, contentHtml, contentJson, plainText (new)
 */
function normalizePayload(payload = {}) {
  const heading = (payload.heading ?? payload.title ?? "").trim();
  const contentHtml = payload.contentHtml ?? payload.content ?? "";
  const contentJson = payload.contentJson ?? null;
  let plainText = payload.plainText ?? "";
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : []; // renamed to attachments

  // If plainText not provided, derive from contentHtml
  if (!plainText && contentHtml) {
    try {
      plainText = convert(contentHtml, { wordwrap: false, selectors: [{ selector: "img", format: "skip" }] });
    } catch (e) {
      plainText = "";
    }
  }

  return { heading, contentHtml, contentJson, plainText, attachments }; // include attachments
}

/**
 * Create a new note
 * - userId: id of owner (string/ObjectId)
 * - payload: may include title/content (legacy) or heading/contentHtml/contentJson/plainText
 */
export async function createNote(userId, payload = {}) {
  const { heading, contentHtml, contentJson, plainText, attachments } = normalizePayload(payload);

  // Use 'user' field in model (keeps compatibility with new schema)
  const note = new Note({
    user: userId,
    heading,
    contentHtml,
    contentJson,
    plainText,
    attachments, // persist attachments
    isDeleted: false,
    versions: [],
  });

  await note.save();
  return note;
}

/**
 * Get notes for a user with optional search and pagination
 * Options:
 *  - includeDeleted: boolean
 *  - q: string (search query) — prefers text search if available
 *  - limit, skip: pagination
 */
// src/services/notesService.js

export async function getNotesForUser(
  userId,
  {
    includeDeleted = false,
    q,
    limit = 100,
    skip = 0,
    filterType,
    startDate,
    endDate,
    sortBy = "updatedAt",
    sortOrder = "desc",
  } = {}
) {
  const filter = { user: userId };
  if (!includeDeleted) filter.isDeleted = false;

  // --- 🔍 TEXT SEARCH (in heading + plainText) ---
  if (q && q.trim()) {
    const search = q.trim();
    filter.$or = [
      { heading: { $regex: search, $options: "i" } },
      { plainText: { $regex: search, $options: "i" } },
    ];
  }

  // --- 🗓️ DATE FILTERS (preset + custom) ---
  if (filterType || startDate || endDate) {
    const now = new Date();
    let start, end;

    switch (filterType) {
      case "today":
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case "yesterday":
        start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;

      case "last_week":
        start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case "last_month":
        start = new Date();
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      default:
        // Advanced: specific date or date range from frontend
        if (startDate && endDate) {
          start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        } else if (startDate) {
          start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          end = new Date(startDate);
          end.setHours(23, 59, 59, 999);
        }
        break;
    }

    if (start && end) {
      filter.createdAt = { $gte: start, $lte: end };
    }
  }

  // --- 🧭 SORTING ---
  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const sortField = ["createdAt", "updatedAt", "heading"].includes(sortBy)
    ? sortBy
    : "updatedAt";

  // --- 🚀 Execute query ---
  const query = Note.find(filter)
    .sort({ [sortField]: sortDirection })
    .skip(+skip)
    .limit(+limit);

  const notes = await query.exec();
  return notes;
}


/**
 * Get a single note by id, ensuring it belongs to user and is not deleted
 */
export async function getNoteById(userId, noteId, { includeDeleted = false } = {}) {
  const filter = { _id: noteId, user: userId };
  if (!includeDeleted) filter.isDeleted = false;
  const note = await Note.findOne(filter);
  return note;
}

/**
 * Update a note.
 * - Pushes current state into versions[] for history
 * - Returns the updated note or null if not found / not allowed
 *
 * payload can include: title/heading, content/contentHtml, contentJson, plainText, attachments
 */
export async function updateNote(userId, noteId, payload = {}) {
  // Fetch note first to check ownership and to push version history
  const note = await Note.findOne({ _id: noteId, user: userId, isDeleted: false });
  if (!note) return null;

  // Normalize incoming payload
  const { heading, contentHtml, contentJson, plainText, attachments } = normalizePayload(payload);

  // Push current state into versions (keep a shallow snapshot)
  note.versions = note.versions || [];
  note.versions.push({
    heading: note.heading,
    contentHtml: note.contentHtml,
    contentJson: note.contentJson,
    updatedAt: new Date(),
  });

  // Update fields
  if (heading !== undefined) note.heading = heading;
  if (contentHtml !== undefined) note.contentHtml = contentHtml;
  if (contentJson !== undefined) note.contentJson = contentJson;

  if (plainText !== undefined && plainText !== "") {
    note.plainText = plainText;
  } else if (!note.plainText && contentHtml) {
    try {
      note.plainText = convert(contentHtml, { wordwrap: false, selectors: [{ selector: "img", format: "skip" }] });
    } catch (e) {
      // ignore
    }
  }

  // Replace attachments if provided (including an empty array to clear); otherwise leave unchanged
  if (payload.attachments !== undefined) {
    note.attachments = attachments;
  }

  await note.save();
  return note;
}

/**
 * Delete a note. Soft delete by default.
 * - soft=true -> mark isDeleted = true (returns updated document)
 * - soft=false -> permanently remove document
 */
export async function deleteNote(userId, noteId, { soft = true } = {}) {
  if (soft) {
    const updated = await Note.findOneAndUpdate(
      { _id: noteId, user: userId, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
    return updated;
  } else {
    const removed = await Note.findOneAndDelete({ _id: noteId, user: userId });
    return removed;
  }
}
