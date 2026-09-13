import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { Client, Asset } from "./types";
import { forClient, sha } from "./repository";
import { mediaPath } from "./paths";
import { reserve, settle, failUsage } from "./usage";
import { publicFetch } from "./http";

const execute = promisify(execFile);
export async function higgs(args: string[], timeout = 60000) {
  const bin =
    process.env.HIGGSFIELD_BIN ||
    path.join(os.homedir(), ".local/bin/higgsfield");
  try {
    const { stdout } = await execute(bin, [...args, "--json", "--no-color"], {
      timeout,
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, HIGGSFIELD_NO_UPDATE_CHECK: "1" },
    });
    return JSON.parse(stdout);
  } catch {
    throw new Error(
      "Higgsfield command failed. Check login, credits, and the job in Higgsfield before retrying.",
    );
  }
}
export async function higgsStatus() {
  const s = await higgs(["account", "status"]);
  return {
    connected: true,
    credits: s.credits,
    plan: s.subscription_plan_type,
  };
}
export async function generateMedia(
  c: Client,
  prompt: string,
  mode: "image" | "video",
  sourceId?: string,
) {
  if (prompt.length < 5 || prompt.length > 4000)
    throw new Error("Write a media brief between 5 and 4000 characters");
  const repo = forClient(c),
    source = sourceId ? repo.asset(sourceId) : undefined;
  if (mode === "video" && (!source || !source.mime.startsWith("image/")))
    throw new Error("Choose a reference photo for the video");
  if (
    c.industry === "restaurant" &&
    (!source || source.ai || source.alcohol || !source.consent)
  )
    throw new Error(
      "Restaurant media requires a real, cleared reference photo without alcohol",
    );
  const model = mode === "video" ? "kling3_0_turbo" : "gpt_image_2";
  const fullPrompt = `Client: ${c.name}. ${c.voice}. ${prompt}. ${c.industry === "restaurant" ? "Preserve the real food, people and premises exactly. Do not add food, drinks, or change portions." : ""} No logos or written text.`;
  const params = [
    "--prompt",
    fullPrompt,
    "--aspect_ratio",
    mode === "video" ? "9:16" : "4:5",
    "--resolution",
    mode === "video" ? "1080p" : "1k",
  ];
  if (mode === "video") params.push("--duration", "5");
  else params.push("--quality", "low");
  if (source)
    params.push(mode === "video" ? "--start-image" : "--image", source.path);
  const quote = await higgs(["generate", "cost", model, ...params]);
  if (!Number.isFinite(quote.credits) || quote.credits < 0)
    throw new Error("Higgsfield did not return a valid credit estimate");
  const reservation = reserve(c, "higgsfield", model, 0, quote.credits);
  try {
    const result = await higgs(
      [
        "generate",
        "create",
        model,
        ...params,
        "--wait",
        "--wait-timeout",
        "20m",
      ],
      21 * 60000,
    );
    const job = Array.isArray(result) ? result[0] : result;
    const url = job?.result_url;
    if (typeof url !== "string")
      throw new Error(
        "No completed media URL was returned. Check the Higgsfield job.",
      );
    const response = await publicFetch(url);
    if (!response.ok) throw new Error("Generated media download failed");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 100 * 1024 * 1024)
      throw new Error("Generated media exceeds 100 MB");
    const mime =
      mode === "video"
        ? "video/mp4"
        : `image/${(await sharp(bytes).metadata()).format}`;
    const id = randomUUID(),
      out = mediaPath(
        c.id,
        `${id}.${mode === "video" ? "mp4" : mime === "image/jpeg" ? "jpg" : "png"}`,
      );
    fs.writeFileSync(out, bytes, { mode: 0o600 });
    const a: Asset = {
      id,
      clientId: c.id,
      name: prompt.slice(0, 100),
      path: out,
      mime,
      sha: sha(bytes),
      kind: mode === "video" ? "video" : "graphic",
      ai: true,
      alcohol: false,
      consent: source?.consent ?? true,
      sourceId: source?.id || null,
      createdAt: new Date().toISOString(),
    };
    settle(c, reservation, 0, 0, 0, quote.credits);
    return repo.addAsset(a);
  } catch (e) {
    failUsage(c, reservation, true);
    throw e;
  }
}
