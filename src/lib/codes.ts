import { createHash, randomBytes, randomInt } from "crypto";

// No 0/O/1/I so codes read cleanly off a screen or over the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomString(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export const ticketCode = (eventCode: string) => `${eventCode}-${randomString(6)}`;

// Lenco references allow letters, digits, - . _ and must be unique. The reference is also the
// private link to the guest's tickets (/t/<reference>), so it carries 12 random characters.
export const orderReference = () => `PHW-${randomString(12)}`;

export const otp = () => String(randomInt(100000, 1000000));

export const hashCode = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}`).digest("hex");

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export const shortSuffix = () => randomString(4).toLowerCase();
