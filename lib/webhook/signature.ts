export const createWebhookSignature = async (secret: string, body: any) => {
  if (!secret) {
    throw new Error("A secret must be provided to create a webhook signature.");
  }

  const keyData = new TextEncoder().encode(secret);
  const messageData = new TextEncoder().encode(JSON.stringify(body));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  const hexSignature = signatureArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hexSignature;
};

export const verifyWebhookSignature = (
  secret: string,
  body: any,
  signature: string,
): boolean => {
  if (!secret || !signature) return false;

  const expected = createWebhookSignatureSync(secret, body);
  // Validate hex encoding and equal length before timing-safe comparison
  if (
    !/^[0-9a-fA-F]+$/.test(expected) ||
    !/^[0-9a-fA-F]+$/.test(signature) ||
    expected.length !== signature.length
  ) {
    return false;
  }
  const crypto = require("crypto");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return crypto.timingSafeEqual(a, b);
};

const createWebhookSignatureSync = (secret: string, body: any): string => {
  const crypto = require("crypto");
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(body))
    .digest("hex");
};
