import bcrypt from "bcryptjs";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import { createAccessToken, createRefreshTokenString, hashToken } from "../utils/token.js";

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: { message: "Email already in use" } });

    const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({ name, email, passwordHash });

    res.status(201).json({ message: "User registered successfully", user: { id: user._id, email: user.email } });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: { message: "Invalid credentials" } });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: { message: "Invalid credentials" } });

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

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const tokenFromCookie = req.cookies[process.env.REFRESH_TOKEN_COOKIE_NAME || "_refresh_token"];
    if (!tokenFromCookie) return res.status(401).json({ error: { message: "No refresh token" } });

    const hashed = hashToken(tokenFromCookie);
    const storedToken = await RefreshToken.findOne({ tokenHash: hashed });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: { message: "Invalid refresh token" } });
    }

    const user = await User.findById(storedToken.user);
    if (!user) return res.status(401).json({ error: { message: "User not found" } });

    const accessToken = createAccessToken(user);

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const tokenFromCookie = req.cookies[process.env.REFRESH_TOKEN_COOKIE_NAME || "_refresh_token"];
    if (tokenFromCookie) {
      const hashed = hashToken(tokenFromCookie);
      await RefreshToken.deleteOne({ tokenHash: hashed });
    }

    res.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || "_refresh_token");
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};
