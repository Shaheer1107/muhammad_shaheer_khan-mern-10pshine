console.log("🟢 src/app.js is running");
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

console.log("➡️ Mounting /api/auth routes");
app.use("/api/auth", authRoutes);

app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

export default app;
