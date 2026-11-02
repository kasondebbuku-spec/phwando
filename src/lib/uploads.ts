import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

// Photos attached to messages. Stored on local disk (UPLOAD_DIR, default ./uploads), outside /public,
// and served through /api/uploads/<file> so private messages' photos stay private.
// On hosts without a persistent disk (e.g. Vercel), swap these two functions for S3/R2/Supabase Storage.

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "uploads");
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const TYPES: { ext: string; mime: string; magic: (b: Buffer) => boolean }[] = [
  { ext: "jpg", mime: "image/jpeg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "webp", mime: "image/webp", magic: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
];

export async function savePhoto(file: File): Promise<string> {
  if (file.size > MAX_PHOTO_BYTES) throw new Error("The photo is larger than 5 MB. Choose a smaller one.");
  const buf = Buffer.from(await file.arrayBuffer());
  // Check the file's actual bytes, not just its name or declared type.
  const type = TYPES.find((t) => t.magic(buf));
  if (!type) throw new Error("Photos must be JPG, PNG or WebP.");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomBytes(16).toString("hex")}.${type.ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return name;
}

export async function readPhoto(name: string): Promise<{ data: Buffer; mime: string } | null> {
  if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(name)) return null;
  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    const mime = TYPES.find((t) => name.endsWith(t.ext))!.mime;
    return { data, mime };
  } catch {
    return null;
  }
}
