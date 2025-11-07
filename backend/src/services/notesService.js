// src/services/notesService.js
import Note from "../models/Note.js";
import { convert } from "html-to-text";

/**
 * Helper: Escape special regex characters to prevent NoSQL injection
 * Escapes characters that have special meaning in regex
 */
function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Helper: Sanitize and validate MongoDB ObjectId
 * Prevents NoSQL injection through ID parameters
 */
function sanitizeObjectId(id) {
  if (!id) return null;
  // Remove any characters that aren't valid in MongoDB ObjectIds
  const sanitized = String(id).replace(/[^a-fA-F0-9]/g, '');
  // MongoDB ObjectIds are exactly 24 hex characters
  if (sanitized.length !== 24) return null;
  return sanitized;
}

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

  // --- 🔍 TEXT SEARCH (in heading + plainText) - FIXED: Escape regex special characters ---
  if (q && q.trim()) {
    const search = escapeRegex(q.trim());
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

    // 🗓️ Apply date filter dynamically based on sortBy field
    if (start && end) {
      // FIXED: Validate sortBy to prevent NoSQL injection
      const validSortFields = ["updatedAt", "createdAt"];
      const dateField = validSortFields.includes(sortBy) ? sortBy : "updatedAt";
      filter[dateField] = { $gte: start, $lte: end };
    }
  }

  // --- 🧭 SORTING - FIXED: Whitelist allowed sort fields ---
  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const allowedSortFields = ["createdAt", "updatedAt", "heading"];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "updatedAt";

  // --- 🚀 Execute query ---
  // FIXED: Validate and sanitize pagination parameters
  const sanitizedSkip = Math.max(0, parseInt(skip, 10) || 0);
  const sanitizedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 100), 1000); // max 1000

  const query = Note.find(filter)
    .sort({ [sortField]: sortDirection })
    .skip(sanitizedSkip)
    .limit(sanitizedLimit);

  const notes = await query.exec();
  return notes;
}


/**
 * Get a single note by id, ensuring it belongs to user and is not deleted
 * FIXED: Validate noteId to prevent NoSQL injection
 */
export async function getNoteById(userId, noteId, { includeDeleted = false } = {}) {
  const sanitizedNoteId = sanitizeObjectId(noteId);
  if (!sanitizedNoteId) {
    return null; // Invalid ID format
  }

  const filter = { _id: sanitizedNoteId, user: userId };
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
 * FIXED: Validate noteId to prevent NoSQL injection
 */
export async function updateNote(userId, noteId, payload = {}) {
  const sanitizedNoteId = sanitizeObjectId(noteId);
  if (!sanitizedNoteId) {
    return null; // Invalid ID format
  }

  // Fetch note first to check ownership and to push version history
  const note = await Note.findOne({ _id: sanitizedNoteId, user: userId, isDeleted: false });
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
 * FIXED: Validate noteId to prevent NoSQL injection
 */
export async function deleteNote(userId, noteId, { soft = true } = {}) {
  const sanitizedNoteId = sanitizeObjectId(noteId);
  if (!sanitizedNoteId) {
    return null; // Invalid ID format
  }

  if (soft) {
    const updated = await Note.findOneAndUpdate(
      { _id: sanitizedNoteId, user: userId, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
    return updated;
  } else {
    const removed = await Note.findOneAndDelete({ _id: sanitizedNoteId, user: userId });
    return removed;
  }
}