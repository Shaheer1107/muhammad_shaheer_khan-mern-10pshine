import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import notesRoutes from "./routes/notesRoutes.js"; // ✅ add this
import errorHandler from "./middlewares/errorHandler.js"; // ✅ add this

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes); // ✅ mount notes routes

// Centralized error handler (should come after all routes)
app.use(errorHandler);

export default app;
