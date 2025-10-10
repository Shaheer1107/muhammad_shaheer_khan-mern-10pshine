// src/models/Note.js
import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Version Schema — optional historical versions of the note
 * Useful if you want to implement "note history" or "undo"
 */
const VersionSchema = new Schema(
  {
    heading: String,
    contentHtml: String, // TipTap's generated HTML output
    contentJson: Object, // TipTap's internal JSON structure (for rehydration)
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * Main Note Schema
 * Now supports both plain text and rich text (TipTap)
 */
const NoteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    heading: { type: String, default: "" },

    // TipTap's rich text data
    contentHtml: { type: String, default: "" }, // for quick rendering
    contentJson: { type: Object, default: null }, // for editor rehydration
    plainText: { type: String, default: "" }, // store stripped text for search

    // Version history (optional)
    versions: { type: [VersionSchema], default: [] },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for better text search performance
NoteSchema.index({ heading: "text", plainText: "text" });

const Note = mongoose.models.Note || mongoose.model("Note", NoteSchema);
export default Note;
