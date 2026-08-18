import bcrypt from "bcryptjs";

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
