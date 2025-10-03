import jwt from "jsonwebtoken";
import crypto from "crypto";

export function createAccessToken(user) {
  const payload = { sub: user._id.toString(), email: user.email };
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
  return jwt.sign(payload, secret, { expiresIn });
}

export function createRefreshTokenString() {
  return crypto.randomBytes(64).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
