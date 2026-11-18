export async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(url, {
    method,
    headers: isForm ? undefined : body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!res.ok) throw new Error(data.error || "That did not work.");
  return data;
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export async function uploadSquadFile(milestoneId: string, file: File) {
  const signed = await send<{ fileId: string; uploadUrl: string; headers: Record<string, string> }>(
    `/api/team/milestones/${milestoneId}/uploads`,
    "POST",
    { fileName: file.name, contentType: file.type || "application/octet-stream", size: file.size },
  );
  const put = await fetch(signed.uploadUrl, { method: "PUT", headers: signed.headers, body: file });
  if (!put.ok) {
    const text = await put.text();
    throw new Error(text.includes("error") ? "The file store rejected the upload." : "The file store rejected the upload.");
  }
  return send<{ file: { id: string; name: string; size: number } }>(
    `/api/team/milestones/${milestoneId}/uploads/${signed.fileId}/complete`,
    "POST",
    {},
  );
}
