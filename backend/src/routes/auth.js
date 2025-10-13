import express from "express";
import { body } from "express-validator";
import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import validateRequest from "../middlewares/validateRequest.js";

console.log("✅ auth routes file loaded");

const router = express.Router();

// 🧾 Register
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password min length 6"),
  ],
  validateRequest,
  register
);

// 🔑 Login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validateRequest,
  login
);

// ♻️ Refresh Token
router.post("/refresh", refresh);

// 🚪 Logout
router.post("/logout", logout);

// 🔐 Forgot Password
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email required")],
  validateRequest,
  forgotPassword
);

// 🔄 Reset Password
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Token required"),
    body("id").notEmpty().withMessage("User ID required"),
    body("newPassword").isLength({ min: 6 }).withMessage("Password min length 6"),
  ],
  validateRequest,
  resetPassword
);

// 🧠 Test route
router.get("/test", (req, res) => {
  res.json({ message: "Auth routes working" });
});

export default router;
