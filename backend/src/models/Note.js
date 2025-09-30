import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "" },
    content: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false }, 
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, updatedAt: -1 });

const Note = mongoose.model("Note", noteSchema);
export default Note;
