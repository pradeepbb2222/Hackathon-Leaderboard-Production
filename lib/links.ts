import { HttpError } from "@/lib/http";

export function cleanUrl(value: string | undefined, label: string) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new HttpError(400, `${label} needs a full http or https link.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HttpError(400, `${label} needs a full http or https link.`);
  }
  return url.toString().slice(0, 300);
}
