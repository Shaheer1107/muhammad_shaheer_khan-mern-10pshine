// src/routes/uploads.js
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../logger.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store uploads in ./uploads (relative to project root)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});

// Multer config: allow only images up to 10MB
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads allowed"), false);
    }
    cb(null, true);
  }
});

const router = express.Router();

// POST /api/uploads/image
router.post("/image", authMiddleware, upload.single("image"), (req, res) => {
  const log = (req && req.log) ? req.log : logger.child({ module: "uploads" });
  try {
    if (!req.file) {
      log.warn({ userId: req.user?._id }, "Upload attempted without file");
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    log.info({ userId: req.user._id, file: req.file.filename, action: "image_uploaded" }, "Image uploaded");

    return res.json({ url });
  } catch (err) {
    log.error({ err }, "Error in image upload");
    return res.status(500).json({ msg: "Server error" });
  }
});

export default router;
