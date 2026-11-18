import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type ObjectStat = { size: number };

function uploadRoot() {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR || "data/uploads");
}

function driver() {
  return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
}

function safeKey(key: string) {
  if (!/^[a-zA-Z0-9._/-]+$/.test(key) || key.includes("..")) {
    throw new Error("Invalid storage key.");
  }
  return key;
}

function localPath(key: string) {
  const root = uploadRoot();
  const full = path.resolve(root, safeKey(key));
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error("Invalid storage key.");
  return full;
}

function s3Config(endpoint: string | undefined) {
  const force =
    process.env.S3_FORCE_PATH_STYLE === "true" ||
    (process.env.S3_FORCE_PATH_STYLE !== "false" && Boolean(endpoint));
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: endpoint || undefined,
    forcePathStyle: force,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
}

function internalClient() {
  return s3Config(process.env.S3_ENDPOINT || undefined);
}

function publicClient() {
  return s3Config(process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || undefined);
}

function bucket() {
  const name = process.env.S3_BUCKET;
  if (!name) throw new Error("S3_BUCKET is missing.");
  return name;
}

export async function storagePut(key: string, body: Buffer, contentType: string) {
  if (driver() === "local") {
    const full = localPath(key);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, body);
    return;
  }
  await internalClient().send(
    new PutObjectCommand({ Bucket: bucket(), Key: safeKey(key), Body: body, ContentType: contentType }),
  );
}

export async function storageHead(key: string): Promise<ObjectStat | null> {
  if (driver() === "local") {
    try {
      const stat = await fsp.stat(localPath(key));
      return { size: stat.size };
    } catch {
      return null;
    }
  }
  try {
    const result = await internalClient().send(new HeadObjectCommand({ Bucket: bucket(), Key: safeKey(key) }));
    return { size: Number(result.ContentLength || 0) };
  } catch {
    return null;
  }
}

export async function storageDelete(key: string) {
  if (driver() === "local") {
    await fsp.rm(localPath(key), { force: true });
    return;
  }
  await internalClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: safeKey(key) })).catch(() => undefined);
}

export function storageReadStream(key: string): Readable {
  if (driver() === "local") return fs.createReadStream(localPath(key));
  throw new Error("Use storageOpen for S3 streams.");
}

export async function storageOpen(key: string): Promise<Readable> {
  if (driver() === "local") return fs.createReadStream(localPath(key));
  const result = await internalClient().send(new GetObjectCommand({ Bucket: bucket(), Key: safeKey(key) }));
  const body = result.Body;
  if (!body) throw new Error("Empty object.");
  return body as Readable;
}

export async function storagePresignPut(key: string, contentType: string) {
  if (driver() !== "s3") return null;
  const url = await getSignedUrl(
    publicClient(),
    new PutObjectCommand({ Bucket: bucket(), Key: safeKey(key), ContentType: contentType }),
    { expiresIn: 15 * 60 },
  );
  return { url, headers: { "Content-Type": contentType } as Record<string, string> };
}

export async function storagePresignGet(key: string, fileName: string, contentType: string) {
  if (driver() !== "s3") return null;
  const disposition = `attachment; filename="${fileName.replace(/[\r\n"]/g, "")}"`;
  return getSignedUrl(
    publicClient(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: safeKey(key),
      ResponseContentDisposition: disposition,
      ResponseContentType: contentType,
    }),
    { expiresIn: 5 * 60 },
  );
}

export async function storagePing() {
  if (driver() === "local") {
    await fsp.mkdir(uploadRoot(), { recursive: true });
    return "local";
  }
  await internalClient().send(new HeadBucketCommand({ Bucket: bucket() }));
  return "s3";
}

export function storageMode() {
  return driver();
}
