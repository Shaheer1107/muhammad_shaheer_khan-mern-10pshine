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

const app = express();

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (one level above src)
// dotenv.config({ path: path.join(__dirname, "../.env") });

// ✅ Enable CORS for frontend (React Vite default: http://localhost:5173)
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
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

app.use(
  "/uploads/note_images",
  express.static(path.join(backendRoot, "uploads", "note_images"))
);

app.use(
  "/uploads/profile_pics",
  express.static(path.join(backendRoot, "uploads", "profile_pics"))
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
