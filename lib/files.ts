import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { HttpError } from "@/lib/http";
import { MAX_UPLOAD_BYTES } from "@/lib/tracks";

const ALLOWED: Record<string, string> = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export function uploadDir() {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR || "data/uploads");
}

export function safeStoredName(storedName: string) {
  if (!/^[a-zA-Z0-9._-]+$/.test(storedName)) throw new HttpError(400, "Invalid file reference.");
  const full = path.resolve(uploadDir(), storedName);
  if (!full.startsWith(uploadDir() + path.sep) && full !== uploadDir()) {
    throw new HttpError(400, "Invalid file reference.");
  }
  return full;
}

export async function saveUpload(file: File) {
  if (file.size <= 0) throw new HttpError(400, "That file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(400, "Files must be 15 MB or smaller.");
  const originalName = path.basename(file.name || "upload").slice(0, 180);
  const ext = originalName.includes(".") ? originalName.split(".").pop()!.toLowerCase() : "";
  if (!ext || !ALLOWED[ext]) {
    throw new HttpError(400, "Upload a PDF, PPT, PPTX, ZIP, or image (PNG, JPG, WEBP, GIF).");
  }
  const mime = (file.type || "").toLowerCase();
  const expected = ALLOWED[ext];
  const loose =
    !mime ||
    mime === expected ||
    mime === "application/octet-stream" ||
    mime === "application/x-zip-compressed" ||
    (ext === "jpg" && mime === "image/jpg");
  if (!loose) throw new HttpError(400, "That file type does not match its extension.");
  await fs.mkdir(uploadDir(), { recursive: true });
  const storedName = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(safeStoredName(storedName), bytes);
  return { originalName, storedName, mimeType: expected, sizeBytes: bytes.length };
}

export async function readUpload(storedName: string) {
  const full = safeStoredName(storedName);
  try {
    return await fs.readFile(full);
  } catch {
    throw new HttpError(404, "File not found.");
  }
}

export function attachmentName(name: string) {
  return name.replace(/[\r\n"]/g, "").slice(0, 180) || "download";
}
