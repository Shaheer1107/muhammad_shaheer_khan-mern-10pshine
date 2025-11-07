import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import { createAccessToken, createRefreshTokenString, hashToken } from "../utils/token.js";
import logger from "../logger.js";

console.log("Email config:", process.env.EMAIL_USER, process.env.EMAIL_PASS ? "✅ Loaded" : "❌ Missing");

// Helper to get request-scoped logger
function getLog(req) {
  return (req && req.log) ? req.log : logger;
}

/**
 * Helper: Sanitize and validate MongoDB ObjectId
 * Prevents NoSQL injection through ID parameters
 */
function sanitizeObjectId(id) {
  if (!id) return null;
  // Remove any characters that aren't valid in MongoDB ObjectIds
  const sanitized = String(id).replace(/[^a-fA-F0-9]/g, '');
  // MongoDB ObjectIds are exactly 24 hex characters
  if (sanitized.length !== 24) return null;
  return sanitized;
}

/**
 * Helper: Validate email format
 * Prevents injection attacks through email parameter
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Helper: Sanitize string input to prevent NoSQL injection
 * Ensures the input is a plain string, not an object
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return input;
}

/**
 * Normalize token / reset request inputs for compatibility.
 * This makes the reset handler accept:
 *  - token from body, query, or x-reset-token header
 *  - id from body or query
 *  - newPassword from body.password or body.newPassword
 * FIXED: Sanitize all inputs to prevent injection
 */
function normalizeResetInputs(req) {
  let token = sanitizeString(req.body?.token ?? req.query?.token ?? req.headers["x-reset-token"]);
  let id = sanitizeString(req.body?.id ?? req.query?.id ?? req.body?.userId);
  let newPassword = sanitizeString(req.body?.newPassword ?? req.body?.password);

  return { token, id, newPassword };
}

/* ================================
   REGISTER
   ================================ */
export const register = async (req, res, next) => {
  const log = getLog(req);
  try {
    const { name, email, password } = req.body;
    
    // FIXED: Validate and sanitize email input
    if (!isValidEmail(email)) {
      log.warn({ action: "register_failed", reason: "invalid_email" }, "Invalid email format");
      return res.status(400).json({ error: { message: "Invalid email format" } });
    }

    // FIXED: Sanitize name to prevent injection
    const sanitizedName = sanitizeString(name);
    const sanitizedEmail = email.toLowerCase().trim();

    log.info({ action: "register_attempt", email: sanitizedEmail }, "Register attempt");

    // FIXED: Use sanitized email in query
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      log.warn({ action: "register_failed", email: sanitizedEmail }, "Email already in use");
      return res.status(400).json({ error: { message: "Email already in use" } });
    }

    // FIXED: Validate password strength
    if (!password || typeof password !== 'string' || password.length < 8) {
      log.warn({ action: "register_failed", reason: "weak_password" }, "Password too weak");
      return res.status(400).json({ error: { message: "Password must be at least 8 characters" } });
    }

    const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({ 
      name: sanitizedName, 
      email: sanitizedEmail, 
      passwordHash 
    });
    log.info({ action: "register_success", userId: user._id, email: sanitizedEmail }, "User registered successfully");

    res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    log.error({ err }, "Registration error");
    next(err);
  }
};

/* ================================
   LOGIN
   ================================ */
export const login = async (req, res, next) => {
  const log = getLog(req);
  try {
    const { email, password } = req.body;
    
    // FIXED: Validate email format
    if (!isValidEmail(email)) {
      log.warn({ action: "login_failed", reason: "invalid_email" }, "Invalid email format");
      return res.status(400).json({ error: { message: "Invalid credentials" } });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    
    log.info({ action: "login_attempt", email: sanitizedEmail, ip: req.ip, ua: req.headers["user-agent"] }, "Login attempt");

    // FIXED: Use sanitized email in query
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      log.warn({ action: "login_failed", email: sanitizedEmail, reason: "user_not_found" }, "Invalid credentials");
      return res.status(400).json({ error: { message: "Invalid credentials" } });
    }

    // FIXED: Validate password is a string
    if (typeof password !== 'string') {
      log.warn({ action: "login_failed", email: sanitizedEmail, reason: "invalid_password_type" }, "Invalid credentials");
      return res.status(400).json({ error: { message: "Invalid credentials" } });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      log.warn({ action: "login_failed", email: sanitizedEmail, reason: "wrong_password" }, "Invalid credentials");
      return res.status(400).json({ error: { message: "Invalid credentials" } });
    }

    const accessToken = createAccessToken(user);
    const refreshTokenString = createRefreshTokenString();
    const refreshTokenHash = hashToken(refreshTokenString);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      user: user._id,
      tokenHash: refreshTokenHash,
      expiresAt,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    // Ensure cookie always set in test mode as well
    res.cookie(process.env.REFRESH_TOKEN_COOKIE_NAME || "_refresh_token", refreshTokenString, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    log.info({ action: "login_success", userId: user._id, email: sanitizedEmail }, "User logged in");
    res.json({ accessToken });
  } catch (err) {
    log.error({ err }, "Login error");
    next(err);
  }
};

/* ================================
   REFRESH TOKEN
   ================================ */
export const refresh = async (req, res, next) => {
  const log = getLog(req);
  try {
    // fallback for test env if cookies not set (controller supports body fallback)
    let tokenFromCookie =
      req.cookies?.[process.env.REFRESH_TOKEN_COOKIE_NAME || "_refresh_token"] ||
      req.body?.refreshToken;

    // FIXED: Sanitize token to prevent injection
    tokenFromCookie = sanitizeString(tokenFromCookie);

    if (!tokenFromCookie) {
      log.warn({ action: "refresh_failed", reason: "no_cookie" }, "No refresh token");
      return res.status(401).json({ error: { message: "No refresh token" } });
    }

    const hashed = hashToken(tokenFromCookie);
    const storedToken = await RefreshToken.findOne({ tokenHash: hashed });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      log.warn({ action: "refresh_failed", reason: "invalid_or_expired" }, "Invalid refresh token");
      return res.status(401).json({ error: { message: "Invalid refresh token" } });
    }

    const user = await User.findById(storedToken.user);
    if (!user) {
      log.warn({ action: "refresh_failed", reason: "user_not_found" }, "User not found for refresh token");
      return res.status(401).json({ error: { message: "User not found" } });
    }

    const accessToken = createAccessToken(user);
    log.info({ action: "refresh_success", userId: user._id }, "Refresh token exchanged for new access token");
    res.status(200).json({ accessToken });
  } catch (err) {
    log.error({ err }, "Refresh error");
    next(err);
  }
};

/* ================================
   LOGOUT
   ================================ */
export const logout = async (req, res, next) => {
  const log = getLog(req);
  try {
    let tokenFromCookie =
      req.cookies?.[process.env.REFRESH_TOKEN_COOKIE_NAME || "_refresh_token"] ||
      req.body?.refreshToken; // fallback for tests

    // FIXED: Sanitize token to prevent injection
    tokenFromCookie = sanitizeString(tokenFromCookie);

    if (tokenFromCookie) {
      const hashed = hashToken(tokenFromCookie);
      await RefreshToken.deleteOne({ tokenHash: hashed });
    }

    res.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || "_refresh_token");
    log.info({ action: "logout", userId: req.user?.id }, "User logged out");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    log.error({ err }, "Logout error");
    next(err);
  }
};

/* ================================
   FORGOT PASSWORD
   ================================ */
export const forgotPassword = async (req, res, next) => {
  const log = getLog(req);
  try {
    const { email } = req.body;
    
    // FIXED: Validate email format
    if (!isValidEmail(email)) {
      log.warn({ action: "forgot_password_failed", reason: "invalid_email" }, "Invalid email format");
      return res.status(200).json({
        message: "If the email exists, a reset link will be sent.",
      });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    
    // FIXED: Use sanitized email in query
    const user = await User.findOne({ email: sanitizedEmail });

    if (!user) {
      log.warn({ action: "forgot_password_failed", email: sanitizedEmail }, "User not found");
      return res.status(200).json({
        message: "If the email exists, a reset link will be sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // FIXED: Fixed typo user._1d to user._id
    await PasswordResetToken.deleteMany({ user: user._id });
    await PasswordResetToken.create({ user: user._id, tokenHash, expiresAt });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&id=${user._id}`;

    // If email credentials are not provided, skip sending but still return success.
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      log.warn({ action: "forgot_password_no_email_config" }, "Email credentials missing — skipping send");
      return res.status(200).json({ message: "If the email exists, a reset link will be sent." });
    }

    // Create transporter and attempt to send email. Failures here should not break the generic response.
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
      // verify is optional but helpful to surface config issues early
      await transporter.verify();
    } catch (verifyErr) {
      log.warn({ err: verifyErr }, "Email transporter verification failed; continuing without throwing");
    }

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Password Reset Request",
        html: `
          <p>Hello ${user.name || "user"},</p>
          <p>You requested to reset your password. Click the link below:</p>
          <a href="${resetUrl}" target="_blank">${resetUrl}</a>
          <p>This link expires in 15 minutes.</p>
        `,
      });
      log.info({ action: "forgot_password_email_sent", email: sanitizedEmail }, "Password reset email sent");
    } catch (sendErr) {
      // Log error but don't reveal details to the client
      log.error({ err: sendErr }, "Failed to send password reset email; continuing");
    }

    res.status(200).json({ message: "If the email exists, a reset link will be sent." });
  } catch (err) {
    log.error({ err }, "Forgot password error");
    next(err);
  }
};

/* ================================
   RESET PASSWORD
   ================================ */
export const resetPassword = async (req, res, next) => {
  const log = getLog(req);
  try {
    // normalize inputs (body, query, header compatibility)
    const inputs = normalizeResetInputs(req);
    let token = inputs.token;
    let id = inputs.id;
    let newPassword = inputs.newPassword;

    if (!token || !id || !newPassword) {
      log.warn({ action: "reset_failed", userId: id }, "Missing token, id, or newPassword in reset request");
      return res.status(400).json({ error: { message: "Invalid or expired reset link" } });
    }

    // FIXED: Validate and sanitize user ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
      log.warn({ action: "reset_failed", userId: id }, "Invalid user ID format");
      return res.status(400).json({ error: { message: "Invalid or expired reset link" } });
    }

    // FIXED: Validate password strength
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      log.warn({ action: "reset_failed", userId: sanitizedId }, "Password too weak");
      return res.status(400).json({ error: { message: "Password must be at least 8 characters" } });
    }

    const hashedToken = hashToken(token);
    // FIXED: Use sanitized ID in query
    const passwordResetToken = await PasswordResetToken.findOne({ 
      user: sanitizedId, 
      tokenHash: hashedToken 
    });

    if (!passwordResetToken || passwordResetToken.expiresAt < new Date()) {
      log.warn({ action: "reset_failed", userId: sanitizedId }, "Invalid or expired reset token");
      return res.status(400).json({ error: { message: "Invalid or expired reset link" } });
    }

    // FIXED: Use sanitized ID in query
    const user = await User.findById(sanitizedId);
    if (!user) return res.status(400).json({ error: { message: "User not found" } });

    const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await user.save();

    await PasswordResetToken.deleteMany({ user: user._id });

    log.info({ action: "password_reset_success", userId: user._id }, "Password reset successfully");
    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (err) {
    log.error({ err }, "Reset password error");
    next(err);
  }
};