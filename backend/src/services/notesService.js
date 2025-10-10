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

  // If plainText not provided, derive from contentHtml
  if (!plainText && contentHtml) {
    try {
      plainText = convert(contentHtml, { wordwrap: false, selectors: [{ selector: "img", format: "skip" }] });
    } catch (e) {
      plainText = "";
    }
  }

  return { heading, contentHtml, contentJson, plainText };
}

/**
 * Create a new note
 * - userId: id of owner (string/ObjectId)
 * - payload: may include title/content (legacy) or heading/contentHtml/contentJson/plainText
 */
export async function createNote(userId, payload = {}) {
  const { heading, contentHtml, contentJson, plainText } = normalizePayload(payload);

  // Use 'user' field in model (keeps compatibility with new schema)
  const note = new Note({
    user: userId,
    heading,
    contentHtml,
    contentJson,
    plainText,
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
export async function getNotesForUser(userId, { includeDeleted = false, q, limit = 100, skip = 0 } = {}) {
  const filter = { user: userId };
  if (!includeDeleted) filter.isDeleted = false;

  // If $text index exists (we created text index on heading + plainText), prefer text search
  if (q && q.trim()) {
    // Use text search; fall back to regex if text search not desired
    filter.$text = { $search: q.trim() };
  }

  // If text search is used, projection can include textScore; but to keep it simple we'll not require it
  const query = Note.find(filter).sort({ updatedAt: -1 }).skip(+skip).limit(+limit);

  // If not using text search (no q) or you want case-insensitive regex fallback,
  // you can combine with $or where appropriate - but here we used $text when q present.
  // For backwards compatibility, if q provided but text index isn't present or you still want regex fallback,
  // clients can call a different endpoint or we can implement a second attempt (not done here to avoid complexity).

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
 * payload can include: title/heading, content/contentHtml, contentJson, plainText
 */
export async function updateNote(userId, noteId, payload = {}) {
  // Fetch note first to check ownership and to push version history
  const note = await Note.findOne({ _id: noteId, user: userId, isDeleted: false });
  if (!note) return null;

  // Normalize incoming payload
  const { heading, contentHtml, contentJson, plainText } = normalizePayload(payload);

  // Push current state into versions (keep a shallow snapshot)
  note.versions = note.versions || [];
  note.versions.push({
    heading: note.heading,
    contentHtml: note.contentHtml,
    contentJson: note.contentJson,
    updatedAt: new Date(),
  });

  // Update fields only if provided (allow empty string updates)
  if (heading !== undefined) note.heading = heading;
  if (contentHtml !== undefined) note.contentHtml = contentHtml;
  if (contentJson !== undefined) note.contentJson = contentJson;
  if (plainText !== undefined && plainText !== "") {
    note.plainText = plainText;
  } else if (!note.plainText && contentHtml) {
    // if plainText wasn't provided but contentHtml is present, derive plainText
    try {
      note.plainText = convert(contentHtml, { wordwrap: false, selectors: [{ selector: "img", format: "skip" }] });
    } catch (e) {
      // ignore
    }
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
