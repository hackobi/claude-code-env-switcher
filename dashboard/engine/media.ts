import fs from "node:fs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { Client, Asset } from "./types";
import { forClient, sha } from "./repository";
import { mediaPath } from "./paths";

export async function upload(
  c: Client,
  file: File,
  alcohol: boolean,
  consent: boolean,
  kind: "photo" | "graphic" = "photo",
) {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Choose an image smaller than 20 MB");
  const bytes = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
  if (!["jpeg", "png", "webp"].includes(meta.format || ""))
    throw new Error("Use a JPEG, PNG or WebP image");
  const id = randomUUID(),
    name = file.name.slice(0, 150),
    out = mediaPath(
      c.id,
      `${id}.${meta.format === "jpeg" ? "jpg" : meta.format}`,
    );
  fs.writeFileSync(out, bytes, { mode: 0o600 });
  const a: Asset = {
    id,
    clientId: c.id,
    name,
    path: out,
    mime: `image/${meta.format}`,
    sha: sha(bytes),
    kind,
    ai: false,
    alcohol,
    consent,
    sourceId: null,
    createdAt: new Date().toISOString(),
  };
  return forClient(c).addAsset(a);
}
const escape = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (ch) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[ch]!,
  );
export async function graphic(
  c: Client,
  sourceId: string,
  headline: string,
  story = false,
) {
  const repo = forClient(c),
    source = repo.asset(sourceId);
  if (!source.mime.startsWith("image/")) throw new Error("Choose an image");
  if (headline.length > 80)
    throw new Error("Use a headline under 80 characters");
  const width = 1080,
    height = story ? 1920 : 1350;
  const words = headline.split(" "),
    lines: string[] = [];
  for (const word of words) {
    if (!lines.length || lines[lines.length - 1].length + word.length > 28)
      lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  const overlay = Buffer.from(
    `<svg width="${width}" height="${height}"><rect y="${height - 360}" width="1080" height="360" fill="#10141b" fill-opacity=".94"/><rect x="64" y="${height - 305}" width="48" height="5" fill="${c.color}"/><text x="64" y="${height - 245}" fill="white" font-size="24" font-family="sans-serif">${escape(c.name)}</text>${lines
      .slice(0, 3)
      .map(
        (l, i) =>
          `<text x="64" y="${height - 175 + i * 55}" fill="white" font-size="44" font-family="sans-serif">${escape(l)}</text>`,
      )
      .join("")}</svg>`,
  );
  const bytes = await sharp(source.path)
    .resize(width, height, { fit: "cover" })
    .composite([{ input: overlay }])
    .jpeg({ quality: 88 })
    .toBuffer();
  const id = randomUUID(),
    out = mediaPath(c.id, `${id}.jpg`);
  fs.writeFileSync(out, bytes, { mode: 0o600 });
  return repo.addAsset({
    ...source,
    id,
    name: headline || c.name,
    path: out,
    mime: "image/jpeg",
    sha: sha(bytes),
    kind: "graphic",
    sourceId,
    createdAt: new Date().toISOString(),
  });
}
export function verifyAsset(a: Asset) {
  if (!fs.existsSync(a.path) || sha(fs.readFileSync(a.path)) !== a.sha)
    throw new Error("Media changed since review; upload it again");
}
