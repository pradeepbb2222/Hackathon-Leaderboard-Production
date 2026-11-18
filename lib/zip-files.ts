import { createRequire } from "node:module";
import { PassThrough } from "node:stream";
import type { Archiver } from "archiver";
import { storageOpen } from "@/lib/storage";

const require = createRequire(import.meta.url);
const archiver = require("archiver") as (format: string, options: { zlib: { level: number } }) => Archiver;

async function createZip(): Promise<Archiver> {
  return archiver("zip", { zlib: { level: 6 } });
}

export function zipResponse(files: { storedName: string; nameInZip: string }[], downloadName: string) {
  const pass = new PassThrough();
  const stream = new ReadableStream({
    start(controller) {
      pass.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      pass.on("end", () => controller.close());
      pass.on("error", (error: Error) => controller.error(error));
      void (async () => {
        const archive = await createZip();
        archive.on("error", (error: Error) => controller.error(error));
        archive.pipe(pass);
        for (const file of files) {
          const source = await storageOpen(file.storedName);
          archive.append(source, { name: file.nameInZip });
        }
        await archive.finalize();
      })().catch((error: Error) => controller.error(error));
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Cache-Control": "private, no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
