export function fileLimitBytes() {
  const mb = Number(process.env.FILE_SIZE_LIMIT_MB || 25);
  return (Number.isFinite(mb) && mb > 0 ? mb : 25) * 1024 * 1024;
}

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

export type UploadCheck = { ok: true; ext: string; contentType: string } | { ok: false; error: string };

export function checkUpload(fileName: string, contentType: string, size: number): UploadCheck {
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "That file is empty." };
  const limit = fileLimitBytes();
  if (size > limit) {
    return { ok: false, error: `Files must be ${Math.round(limit / (1024 * 1024))} MB or smaller.` };
  }
  const base = fileName.split(/[/\\]/).pop() || "upload";
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  if (!ext || !ALLOWED[ext]) {
    return { ok: false, error: "Upload a PDF, PPT, PPTX, ZIP, or image (PNG, JPG, WEBP, GIF)." };
  }
  const mime = (contentType || "").toLowerCase();
  const expected = ALLOWED[ext];
  const loose =
    !mime ||
    mime === expected ||
    mime === "application/octet-stream" ||
    mime === "application/x-zip-compressed" ||
    (ext === "jpg" && mime === "image/jpg");
  if (!loose) return { ok: false, error: "That file type does not match its extension." };
  return { ok: true, ext, contentType: expected };
}

export function safeOriginalName(fileName: string) {
  return (fileName.split(/[/\\]/).pop() || "upload").replace(/[\r\n"]/g, "").slice(0, 180);
}
