import bcrypt from "bcryptjs";
import User from "../models/User.js";
import logger from "../logger.js";

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
 * @desc Upload profile picture
 * @route POST /api/user/me/upload
 * @access Private
 */
export const uploadProfilePicture = async (req, res) => {
  const log = (req && req.log) ? req.log : logger.child({ module: "userController" });
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

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
