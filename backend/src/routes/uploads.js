// src/routes/uploads.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import logger from "../logger.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// ✅ Resolve absolute paths properly regardless of where server starts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ backendRoot → two levels up from src/routes (always backend/)
const backendRoot = path.resolve(__dirname, "../../");

// ✅ Correct uploads folder: backend/uploads
const uploadsDir = path.join(backendRoot, "uploads");
const noteImagesPath = path.join(uploadsDir, "note_images");
const profilePicsPath = path.join(uploadsDir, "profile_pics");

// ✅ Ensure upload directories exist
if (!fs.existsSync(noteImagesPath)) fs.mkdirSync(noteImagesPath, { recursive: true });
if (!fs.existsSync(profilePicsPath)) fs.mkdirSync(profilePicsPath, { recursive: true });

// ✅ Multer storage configuration
const createStorage = (uploadPath) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  });

// ✅ Multer instances
const uploadNote = multer({
  storage: createStorage(noteImagesPath),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/"))
      return cb(new Error("Only image uploads allowed"), false);
    cb(null, true);
  },
});

const uploadProfile = multer({
  storage: createStorage(profilePicsPath),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/"))
      return cb(new Error("Only image uploads allowed"), false);
    cb(null, true);
  },
});

// ✅ Routes
/**
 * POST /api/uploads/note
 */
router.post("/note", authMiddleware, uploadNote.single("image"), (req, res) => {
  const log = req.log || logger.child({ module: "uploads" });
  if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

  const url = `${req.protocol}://${req.get("host")}/uploads/note_images/${req.file.filename}`;
  log.info({ file: req.file.filename, action: "note_image_uploaded" }, "Note image uploaded");

  return res.json({ url });
});

/**
 * POST /api/uploads/profile
 */
router.post("/profile", authMiddleware, uploadProfile.single("image"), (req, res) => {
  const log = req.log || logger.child({ module: "uploads" });
  if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

  const url = `${req.protocol}://${req.get("host")}/uploads/profile_pics/${req.file.filename}`;
  log.info({ file: req.file.filename, action: "profile_image_uploaded" }, "Profile picture uploaded");

  return res.json({ url });
});

export default router;
export { uploadNote, uploadProfile };
