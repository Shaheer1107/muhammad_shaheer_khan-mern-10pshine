// src/controllers/userController.js
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import logger from "../logger.js";

/* Helper to resolve backend root and profile pics folder reliably */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// __dirname is src/controllers, so two levels up -> backend root
const backendRoot = path.resolve(__dirname, "../../");
const profilePicsDir = path.join(backendRoot, "uploads", "profile_pics");

/**
 * Remove a file safely (if exists) given an absolute path.
 */
const safeUnlink = (filePath, log) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log?.info({ filePath }, "Deleted file from disk");
    }
  } catch (err) {
    log?.warn({ err, filePath }, "Failed to delete file from disk");
  }
};

/**
 * @desc Get logged-in user's profile
 * @route GET /api/user/me
 * @access Private
 */
export const getUserProfile = async (req, res) => {
  const log = (req && req.log) ? req.log : logger.child({ module: "userController" });
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("-passwordHash"); // exclude password

    if (!user) {
      log.warn({ userId }, "User not found during profile fetch");
      return res.status(404).json({ msg: "User not found" });
    }

    log.info({ userId, action: "profile_fetched" }, "User profile fetched successfully");
    return res.status(200).json(user);
  } catch (err) {
    log.error({ err, userId: req.user?._id }, "Error fetching user profile");
    return res.status(500).json({ msg: "Server error" });
  }
};

/**
 * @desc Update user profile (name, bio, phone, dateOfBirth)
 * @route PUT /api/user/me
 * @access Private
 */
export const updateUserProfile = async (req, res) => {
  const log = (req && req.log) ? req.log : logger.child({ module: "userController" });
  try {
    const userId = req.user._id;
    const { name, bio, phone, dateOfBirth } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      log.warn({ userId }, "User not found during profile update");
      return res.status(404).json({ msg: "User not found" });
    }

    if (name) user.name = name;
    if (bio) user.bio = bio;
    if (phone) user.phone = phone;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;

    await user.save();
    log.info({ userId, action: "profile_updated" }, "User profile updated successfully");

    return res.status(200).json({
      msg: "Profile updated successfully",
      user: {
        name: user.name,
        email: user.email,
        bio: user.bio,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    log.error({ err, userId: req.user?._id }, "Error updating profile");
    return res.status(500).json({ msg: "Server error" });
  }
};

/**
 * @desc Upload or replace profile picture
 * @route POST /api/user/me/upload
 * @access Private
 *
 * Behavior:
 * - Expects multer to populate req.file (route uses shared uploadProfile middleware).
 * - If the user already has a profileImage, delete the old file from disk.
 * - Save new profileImage URL in DB and return updated user.
 */
export const uploadProfilePicture = async (req, res) => {
  const log = (req && req.log) ? req.log : logger.child({ module: "userController" });
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // If user had an existing profileImage, attempt to delete old file
    if (user.profileImage) {
      try {
        const oldFilename = path.basename(new URL(user.profileImage).pathname);
        const oldFilePath = path.join(profilePicsDir, oldFilename);
        safeUnlink(oldFilePath, log);
      } catch (err) {
        // If URL parsing fails, just warn and continue
        log.warn({ err, userId }, "Failed to parse/delete old profile image");
      }
    }

    const profileUrl = `${req.protocol}://${req.get("host")}/uploads/profile_pics/${req.file.filename}`;
    user.profileImage = profileUrl;
    await user.save();

    log.info({ userId, file: req.file.filename }, "Profile picture uploaded");
    return res.status(200).json({ msg: "Profile picture updated", user });
  } catch (err) {
    log.error({ err, userId: req.user?._id }, "Error uploading profile picture");
    return res.status(500).json({ msg: "Server error" });
  }
};

/**
 * @desc Delete user's profile picture (remove file + clear DB field)
 * @route DELETE /api/user/me/upload
 * @access Private
 *
 * Behavior:
 * - If user has profileImage, deletes the file from disk (if exists) and clears profileImage field.
 */
export const deleteProfilePicture = async (req, res) => {
  const log = (req && req.log) ? req.log : logger.child({ module: "userController" });
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (!user.profileImage) {
      return res.status(400).json({ msg: "No profile picture to delete" });
    }

    // Attempt to delete the file from disk
    try {
      const filename = path.basename(new URL(user.profileImage).pathname);
      const filePath = path.join(profilePicsDir, filename);
      safeUnlink(filePath, log);
    } catch (err) {
      log.warn({ err, userId }, "Failed to parse/delete profile image file path");
    }

    // Clear DB field
    user.profileImage = undefined;
    await user.save();

    log.info({ userId, action: "profile_image_deleted" }, "Profile image deleted");
    return res.status(200).json({ msg: "Profile picture deleted", user });
  } catch (err) {
    log.error({ err, userId: req.user?._id }, "Error deleting profile picture");
    return res.status(500).json({ msg: "Server error" });
  }
};

/**
 * @desc Change user password
 * @route PUT /api/user/me/change-password
 * @access Private
 */
export const changePassword = async (req, res) => {
  const log = (req && req.log) ? req.log : logger.child({ module: "userController" });
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: "Both current and new password are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // ✅ Use passwordHash instead of password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(400).json({ msg: "Incorrect current password" });

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    log.info({ userId, action: "password_changed" }, "User password changed successfully");
    return res.status(200).json({ msg: "Password changed successfully" });
  } catch (err) {
    log.error({ err, userId: req.user?._id }, "Error changing password");
    return res.status(500).json({ msg: "Server error" });
  }
};
