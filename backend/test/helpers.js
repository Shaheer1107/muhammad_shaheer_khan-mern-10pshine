// test/helpers.js
import crypto from "crypto";
import RefreshToken from "../src/models/RefreshToken.js";
import PasswordResetToken from "../src/models/PasswordResetToken.js";

/**
 * Create and persist a refresh token document, return the raw token
 */
export async function createValidRefreshToken(userId) {
  const rawToken = crypto.randomBytes(40).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await RefreshToken.create({ user: userId, tokenHash, expiresAt });
  return rawToken;
}

/**
 * Create and persist a password reset token doc, return the raw token
 */
export async function createPasswordResetToken(userId) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  await PasswordResetToken.create({ user: userId, tokenHash, expiresAt });
  return rawToken;
}
