import { HttpError } from "@/lib/http";
import { sha256 } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { storagePut } from "@/lib/storage";
import { fileLimitBytes } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const file = await prisma.submissionFile.findFirst({
      where: { tokenHash: sha256(token), confirmed: false, tokenExpiresAt: { gt: new Date() } },
    });
    if (!file) return Response.json({ error: "This upload link has expired." }, { status: 404 });
    const chunks: Buffer[] = [];
    const reader = req.body?.getReader();
    if (!reader) return Response.json({ error: "Empty upload." }, { status: 400 });
    let total = 0;
    const limit = fileLimitBytes();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) return Response.json({ error: "File is larger than the limit." }, { status: 400 });
      chunks.push(Buffer.from(value));
    }
    const body = Buffer.concat(chunks);
    if (body.length !== file.sizeBytes) {
      return Response.json({ error: "Uploaded size does not match the file you chose." }, { status: 400 });
    }
    await storagePut(file.storedName, body, file.mimeType);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
    console.error(error);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
