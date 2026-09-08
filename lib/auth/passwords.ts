import bcrypt from "bcryptjs";
// --- Document (link) password helpers ---
// Kept here (not lib/utils.ts) so bcryptjs never enters client/worker bundles.
import crypto from "crypto";

// Server-only password helpers (bcryptjs). Kept out of lib/utils.ts so the
// ~C++ bcrypt dependency doesn't ship to the client bundle.

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

export async function checkPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  const match = await bcrypt.compare(password, hashedPassword);
  return match;
}

export async function generateEncrpytedPassword(
  password: string,
): Promise<string> {
  // If the password is empty, return an empty string
  if (!password) return "";
  // If the password is already encrypted, return it
  const textParts: string[] = password.split(":");
  if (textParts.length === 2) {
    return password;
  }
  // Use bcrypt for new passwords (irreversible hash)
  const hashedPassword = await bcrypt.hash(password, 10);
  return hashedPassword;
}

export async function decryptEncrpytedPassword(
  password: string,
  storedPassword: string,
): Promise<boolean> {
  if (!password || !storedPassword) return false;

  // Check if stored password is a bcrypt hash
  if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$")) {
    return bcrypt.compare(password, storedPassword);
  }

  // Legacy: decrypt AES-256-CTR encrypted password
  const encryptedKey: string = crypto
    .createHash("sha256")
    .update(String(process.env.NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY))
    .digest("base64")
    .substring(0, 32);
  const textParts: string[] = storedPassword.split(":");
  if (!textParts || textParts.length !== 2) {
    return false;
  }
  const IV: Buffer = Buffer.from(textParts[0], "hex");
  const encryptedText: string = textParts[1];
  const decipher = crypto.createDecipheriv("aes-256-ctr", encryptedKey, IV);
  let decrypted: string = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return password === decrypted;
}
