// src/routes/user.js
import express from "express";
import { body } from "express-validator";

import authMiddleware from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  deleteProfilePicture,
  changePassword,
} from "../controllers/userController.js";

// ✅ Reuse centralized multer instance for profile uploads
import { uploadProfile } from "./uploads.js";

const router = express.Router();

/* ===============================
   Routes
   =============================== */

// 1️⃣ Get logged-in user profile
router.get("/me", authMiddleware, getUserProfile);

// 2️⃣ Update user profile
router.put(
  "/me",
  authMiddleware,
  [
    body("name").optional().isLength({ min: 2 }).withMessage("Name too short"),
    body("bio").optional().isLength({ max: 500 }).withMessage("Bio too long"),
    body("phone")
      .optional()
      .matches(/^[0-9+\-\s]{7,15}$/)
      .withMessage("Invalid phone format"),
    body("dateOfBirth").optional().isISO8601().toDate(),
  ],
  validateRequest,
  updateUserProfile
);

// 3️⃣ Upload / Replace profile picture
// Use shared `uploadProfile` multer instance so files land in the centralized uploads folder.
router.post("/me/upload", authMiddleware, uploadProfile.single("profileImage"), uploadProfilePicture);

// 3.1️⃣ Delete profile picture
router.delete("/me/upload", authMiddleware, deleteProfilePicture);

// 4️⃣ Change password
router.put(
  "/me/change-password",
  authMiddleware,
  [
    body("currentPassword").notEmpty().withMessage("Current password required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long"),
  ],
  validateRequest,
  changePassword
);

export default router;
