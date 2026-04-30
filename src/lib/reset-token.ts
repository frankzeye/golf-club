import { createHash, randomBytes } from "crypto";

export function generatePasswordResetSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}
