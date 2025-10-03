import Note from "../models/Note.js";

export async function createNote(userId, { title = "", content = "" } = {}) {
  const note = new Note({ userId, title, content });
  await note.save();
  return note;
}

export async function getNotesForUser(userId, { includeDeleted = false, q, limit = 100, skip = 0 } = {}) {
  const filter = { userId };
  if (!includeDeleted) filter.isDeleted = false;
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { content: { $regex: q, $options: "i" } },
    ];
  }
  const notes = await Note.find(filter).sort({ updatedAt: -1 }).skip(+skip).limit(+limit);
  return notes;
}

export async function getNoteById(userId, noteId) {
  const note = await Note.findOne({ _id: noteId, userId, isDeleted: false });
  return note;
}

export async function updateNote(userId, noteId, { title, content } = {}) {
  const updated = await Note.findOneAndUpdate(
    { _id: noteId, userId, isDeleted: false },
    { ...(title !== undefined ? { title } : {}), ...(content !== undefined ? { content } : {}) },
    { new: true }
  );
  return updated;
}

export async function deleteNote(userId, noteId, { soft = true } = {}) {
  if (soft) {
    const updated = await Note.findOneAndUpdate({ _id: noteId, userId, isDeleted: false }, { isDeleted: true }, { new: true });
    return updated;
  } else {
    const removed = await Note.findOneAndDelete({ _id: noteId, userId });
    return removed;
  }
}
