import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { requestLogger } from "./middlewares/pinoMiddleware.js";
import requestIdMiddleware from "./middlewares/requestId.js";
import contentTypeCheck from "./middlewares/contentTypeCheck.js";
import { parsersMiddleware } from "./middlewares/parsers.js";
import errorHandler from "./middlewares/errorHandler.js";

import authRoutes from "./routes/auth.js";
import notesRoutes from "./routes/notesRoutes.js";
import userRoutes from "./routes/user.js";
import uploadsRoutes from "./routes/uploads.js"; // <--- uploads route
import generateNoteRoute from "./routes/generateNote.js"

dotenv.config();

// SECURITY FIX: Validate and sanitize environment variables
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Validate FRONTEND_URL format to prevent injection
function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    // Only allow http and https protocols
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

if (!isValidUrl(FRONTEND_URL)) {
  throw new Error("Invalid FRONTEND_URL in environment configuration");
}

const app = express();

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (one level above src)
// dotenv.config({ path: path.join(__dirname, "../.env") });

// ✅ Enable CORS for frontend (React Vite default: http://localhost:5173)
// SECURITY FIX: Use validated FRONTEND_URL constant
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true, // allow cookies/auth headers if needed
  })
);

// Logging (pino-http)
app.use(requestLogger);

// Unique request ID middleware
app.use(requestIdMiddleware);

// Content-Type check middleware
app.use(contentTypeCheck);

// Body parsers & cookie parser
app.use(parsersMiddleware);

/* ------------------------------------------------------------------
   ✅ FIXED: Correctly serve uploads from the backend/uploads folder
   This ensures Express always serves files from:
   C:\Users\dell\OneDrive\Desktop\10P_Notes_App\muhammad_shaheer_khan-mern-10pshine\backend\uploads
------------------------------------------------------------------- */

// Resolve backend root (one level up from src)
const backendRoot = path.resolve(__dirname, "..");

// SECURITY FIX: Sanitize path construction to prevent directory traversal
const uploadsDir = path.join(backendRoot, "uploads");
const noteImagesPath = path.join(uploadsDir, "note_images");
const profilePicsPath = path.join(uploadsDir, "profile_pics");

// Validate that paths are within expected directory structure
function isPathSafe(targetPath, basePath) {
  const normalizedTarget = path.normalize(targetPath);
  const normalizedBase = path.normalize(basePath);
  return normalizedTarget.startsWith(normalizedBase);
}

if (!isPathSafe(noteImagesPath, backendRoot) || !isPathSafe(profilePicsPath, backendRoot)) {
  throw new Error("Security: Invalid uploads path configuration");
}

app.use(
  "/uploads/note_images",
  express.static(noteImagesPath)
);

app.use(
  "/uploads/profile_pics",
  express.static(profilePicsPath)
);

/* ------------------------------------------------------------------ */

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/user", userRoutes);
app.use("/api/ai", generateNoteRoute);

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;


