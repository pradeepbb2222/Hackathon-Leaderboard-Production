import { NextResponse } from "next/server";
import { attachmentName } from "@/lib/files";

export function downloadResponse(bytes: Buffer, name: string, mime: string) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${attachmentName(name)}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
