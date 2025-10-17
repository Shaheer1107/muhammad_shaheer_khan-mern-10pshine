// src/routes/notesRoutes.js
import express from "express";
import multer from "multer";
import path from "path";

import {
  createNoteHandler,
  listNotesHandler,
  getNoteHandler,
  updateNoteHandler,
  deleteNoteHandler,
} from "../controllers/notesController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Resolve project-root uploads directory
const uploadsDir = path.join(process.cwd(), "uploads");
const noteImagesDir = path.join(uploadsDir, "note_images");

// Ensure noteImagesDir exists
import fs from "fs";
if (!fs.existsSync(noteImagesDir)) fs.mkdirSync(noteImagesDir, { recursive: true });

// Multer storage for multiple images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, noteImagesDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only images allowed"), false);
    cb(null, true);
  },
});

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Create a note (with optional multiple image uploads)
router.post("/", upload.array("images", 10), createNoteHandler);

// Update note (with optional multiple image uploads)
router.put("/:id", upload.array("images", 10), updateNoteHandler);

// Other CRUD routes
router.get("/", listNotesHandler);
router.get("/:id", getNoteHandler);
router.delete("/:id", deleteNoteHandler);

export default router;
