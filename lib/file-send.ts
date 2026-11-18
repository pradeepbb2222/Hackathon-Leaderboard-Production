import { Readable } from "node:stream";
import { HttpError } from "@/lib/http";
import { storageOpen, storagePresignGet } from "@/lib/storage";

export async function sendStoredFile(file: {
  confirmed: boolean;
  storedName: string;
  originalName: string;
  mimeType: string;
}) {
  if (!file.confirmed) throw new HttpError(404, "File not found.");
  const name = file.originalName.replace(/[\r\n"]/g, "") || "download";
  const signed = await storagePresignGet(file.storedName, name, file.mimeType);
  if (signed) {
    return Response.redirect(signed, 302);
  }
  const nodeStream = await storageOpen(file.storedName);
  const web = Readable.toWeb(nodeStream) as ReadableStream;
  return new Response(web, {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
