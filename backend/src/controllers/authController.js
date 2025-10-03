import bcrypt from "bcryptjs";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import { createAccessToken, createRefreshTokenString, hashToken } from "../utils/token.js";
import logger from "../logger.js";

// Helper to get request-scoped logger
function getLog(req) {
  return (req && req.log) ? req.log : logger;
}

export const register = async (req, res, next) => {
  const log = getLog(req);
  try {
    const { name, email } = req.body;
    log.info({ action: "register_attempt", email }, "Register attempt");

    const { password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      log.warn({ action: "register_failed", email }, "Email already in use");
      return res.status(400).json({ error: { message: "Email already in use" } });
    }

    const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({ name, email, passwordHash });

    log.info({ action: "register_success", userId: user._id, email }, "User registered successfully");
    res.status(201).json({ message: "User registered successfully", user: { id: user._id, email: user.email } });
  } catch (err) {
    log.error({ err }, "Registration error");
    next(err);
  }
};

export const login = async (req, res, next) => {
  const log = getLog(req);
  try {
    const { email, password } = req.body;
    log.info({ action: "login_attempt", email, ip: req.ip, ua: req.headers["user-agent"] }, "Login attempt");

    const user = await User.findOne({ email });
    if (!user) {
      log.warn({ action: "login_failed", email, reason: "user_not_found", ip: req.ip }, "Invalid credentials");
      return res.status(400).json({ error: { message: "Invalid credentials" } });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      log.warn({ action: "login_failed", email, reason: "wrong_password", ip: req.ip }, "Invalid credentials");
      return res.status(400).json({ error: { message: "Invalid credentials" } });
    }

    const accessToken = createAccessToken(user);
    const refreshTokenString = createRefreshTokenString();
    const refreshTokenHash = hashToken(refreshTokenString);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
      user: user._id,
      tokenHash: refreshTokenHash,
      expiresAt,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    res.cookie(process.env.REFRESH_TOKEN_COOKIE_NAME || "_refresh_token", refreshTokenString, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    log.info({ action: "login_success", userId: user._id, email }, "User logged in");
    res.json({ accessToken });
  } catch (err) {
    const log2 = getLog(req);
    log2.error({ err }, "Login error");
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  const log = getLog(req);
  try {
    const tokenFromCookie = req.cookies[process.env.REFRESH_TOKEN_COOKIE_NAME || "_refresh_token"];
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
    res.json({ accessToken });
  } catch (err) {
    log.error({ err }, "Refresh error");
    next(err);
  }
};

export const logout = async (req, res, next) => {
  const log = getLog(req);
  try {
    const tokenFromCookie = req.cookies[process.env.REFRESH_TOKEN_COOKIE_NAME || "_refresh_token"];
    if (tokenFromCookie) {
      const hashed = hashToken(tokenFromCookie);
      await RefreshToken.deleteOne({ tokenHash: hashed });
    }

    res.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || "_refresh_token");
    log.info({ action: "logout", userId: req.user?.id }, "User logged out");
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    log.error({ err }, "Logout error");
    next(err);
  }
};
