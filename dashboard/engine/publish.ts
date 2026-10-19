import fs from "node:fs";
import path from "node:path";
import { Client, Draft, platformSchema } from "./types";
import { db } from "./db";
import { forClient } from "./repository";
import { credential } from "./credentials";
import { connections, ZERNIO, TYPEFULLY } from "./connections";
import { gate, roles } from "./policy";
import { api, publicFetch } from "./http";
import { verifyAsset } from "./media";

export function publicationCheck(c: Client, d: Draft, when?: string) {
  if (
    d.status !== "approved" ||
    !roles(c).every((r) => d.approvals.includes(r))
  )
    throw new Error("All required approvals must match this version");
  const issues = gate(c, d);
  if (issues.length) throw new Error(issues.join("; "));
  const conns = connections(c);
  const selected = d.variants.map((v) => {
    const account = conns.find((a) => a.platform === v.platform);
    if (!account) throw new Error(`Connect ${v.platform} for ${c.name}`);
    return account;
  });
  if (new Set(selected.map((a) => a.provider)).size !== 1)
    throw new Error(
      "Create separate packages for Typefully and Zernio channels",
    );
  if (
    selected[0].provider === "typefully" &&
    new Set(selected.map((a) => a.accountId)).size !== 1
  )
    throw new Error("Typefully variants must use the same social set");
  if (
    selected[0].provider === "zernio" &&
    (!when ||
      !Number.isFinite(Date.parse(when)) ||
      Date.parse(when) < Date.now() + 3 * 3600000)
  )
    throw new Error("Choose a publish time at least three hours ahead");
  const assets = d.assetIds.map((id) => forClient(c).asset(id));
  assets.forEach(verifyAsset);
  if (
    assets.some(
      (a) =>
        a.mime.startsWith("image/") &&
        fs.statSync(a.path).size > 4 * 1024 * 1024,
    )
  )
    throw new Error("Use images under 4 MB for publishing");
  if (!credential(c, selected[0].provider))
    throw new Error("Publishing API key is missing");
  return { selected, assets, provider: selected[0].provider };
}
// Typefully keeps a draft unscheduled unless the request sets publish_at. Allow only plain draft
// fields so no schedule or publish instruction can be added unnoticed.
export function assertUnscheduledDraft(body: unknown) {
  const only = (value: unknown, keys: readonly string[]) =>
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).every((k) => keys.includes(k));
  const platforms = (body as { platforms?: Record<string, unknown> })
    ?.platforms;
  if (
    !only(body, ["platforms"]) ||
    !only(platforms, platformSchema.options) ||
    !Object.values(platforms!).every((p) => {
      const posts = (p as { posts?: unknown })?.posts;
      return (
        only(p, ["enabled", "posts"]) &&
        Array.isArray(posts) &&
        posts.every((post) => only(post, ["text", "media_ids"]))
      );
    })
  )
    throw new Error(
      "Refusing to send a Typefully request that is not a plain unscheduled draft",
    );
}
export async function publish(
  c: Client,
  id: string,
  hash: string,
  when?: string,
) {
  const repo = forClient(c),
    d = repo.get(id);
  if (hash !== d.hash) throw new Error("Content changed; review it again");
  const { selected, assets, provider } = publicationCheck(c, d, when);
  const claimed = db
    .prepare(
      "UPDATE content SET status='dispatching' WHERE clientId=? AND id=? AND hash=? AND status='approved'",
    )
    .run(c.id, id, hash);
  if (!claimed.changes)
    throw new Error("This item is already being handed off");
  db.prepare("INSERT OR REPLACE INTO delivery_accounts VALUES(?,?,?,?)").run(
    c.id,
    id,
    provider,
    selected[0].accountId,
  );
  const key = credential(c, provider);
  let submitted = false;
  try {
    let result;
    if (provider === "zernio") {
      const mediaItems = [];
      for (const a of assets) {
        const bytes = fs.readFileSync(a.path);
        const upload = await api(`${ZERNIO}/media/presign`, key, {
          method: "POST",
          body: JSON.stringify({
            filename: path.basename(a.path),
            contentType: a.mime,
            size: bytes.length,
          }),
        });
        const response = await publicFetch(upload.uploadUrl, {
          method: "PUT",
          body: new Uint8Array(bytes),
          headers: { "Content-Type": a.mime },
        });
        if (!response.ok) throw new Error("Media upload failed");
        mediaItems.push({
          type: a.kind === "video" ? "video" : "image",
          url: upload.publicUrl,
        });
      }
      // Recheck the lead time after potentially slow media uploads. Past dates publish immediately at this provider.
      if (!when || Date.parse(when) < Date.now() + 3 * 3600000)
        throw new Error(
          "The chosen publish time is now too close. Choose a later slot.",
        );
      submitted = true;
      const response = await api(`${ZERNIO}/posts`, key, {
        method: "POST",
        headers: { "x-request-id": id },
        body: JSON.stringify({
          title: d.title,
          content: d.variants[0].text,
          scheduledFor: when,
          timezone: c.timezone,
          mediaItems,
          platforms: selected.map((a) => ({
            platform: a.platform,
            accountId: a.accountId,
            customContent: d.variants.find((v) => v.platform === a.platform)!
              .text,
            ...(assets.some((x) => x.kind === "video")
              ? { platformSpecificData: { contentType: "reel" } }
              : {}),
          })),
        }),
      });
      result = response.post || response.existingPost;
      if (!result?._id)
        throw new Error(
          "Provider accepted request without a post ID; reconcile before retry",
        );
    } else {
      const setId = selected[0].accountId,
        mediaIds: string[] = [];
      for (const a of assets) {
        const upload = await api(
          `${TYPEFULLY}/social-sets/${encodeURIComponent(setId)}/media/upload`,
          key,
          {
            method: "POST",
            body: JSON.stringify({ file_name: path.basename(a.path) }),
          },
        );
        const response = await publicFetch(upload.upload_url, {
          method: "PUT",
          body: new Uint8Array(fs.readFileSync(a.path)),
          headers: {
            "x-amz-meta-upload-source": "api",
            "x-amz-meta-file-id": upload.media_id,
            "x-amz-meta-high-quality-uploads": "true",
          },
        });
        if (!response.ok) throw new Error("Typefully media upload failed");
        let ready = false;
        for (let attempt = 0; attempt < 30; attempt++) {
          const status = await api(
            `${TYPEFULLY}/social-sets/${encodeURIComponent(setId)}/media/${encodeURIComponent(upload.media_id)}`,
            key,
          );
          if (status.status === "ready") {
            ready = true;
            break;
          }
          if (status.status === "failed")
            throw new Error("Typefully media processing failed");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (!ready)
          throw new Error("Typefully media is not ready; retry handoff later");
        mediaIds.push(upload.media_id);
      }
      const draft = {
        platforms: Object.fromEntries(
          d.variants.map((v) => [
            v.platform,
            {
              enabled: true,
              posts: [
                {
                  text: v.text,
                  ...(mediaIds.length ? { media_ids: mediaIds } : {}),
                },
              ],
            },
          ]),
        ),
      };
      assertUnscheduledDraft(draft);
      submitted = true;
      result = await api(
        `${TYPEFULLY}/social-sets/${encodeURIComponent(setId)}/drafts`,
        key,
        { method: "POST", body: JSON.stringify(draft) },
      );
      if (!result?.id)
        throw new Error(
          "Provider accepted request without a draft ID; reconcile before retry",
        );
      if (
        result.status !== "draft" ||
        result.scheduled_date ||
        result.published_at
      )
        throw new Error(
          "Typefully did not confirm an unscheduled draft; check it there before retrying",
        );
    }
    db.prepare(
      "UPDATE content SET status=?,externalId=?,externalProvider=?,scheduledFor=? WHERE clientId=? AND id=?",
    ).run(
      provider === "zernio" ? "scheduled" : "handed_off",
      String(result._id || result.id),
      provider,
      provider === "zernio" ? when : null,
      c.id,
      id,
    );
    return repo.get(id);
  } catch (e) {
    db.prepare("UPDATE content SET status=? WHERE clientId=? AND id=?").run(
      submitted ? "delivery_unknown" : "approved",
      c.id,
      id,
    );
    throw e;
  }
}
export async function sync(c: Client) {
  for (const d of forClient(c)
    .list()
    .filter(
      (d) => d.externalId && ["handed_off", "scheduled"].includes(d.status),
    )) {
    const provider = d.externalProvider as "zernio" | "typefully",
      key = credential(c, provider);
    const conn = db
      .prepare(
        "SELECT accountId FROM delivery_accounts WHERE clientId=? AND contentId=?",
      )
      .get(c.id, d.id) as { accountId: string } | undefined;
    if (provider === "typefully" && !conn) continue;
    const data = await api(
      provider === "zernio"
        ? `${ZERNIO}/posts/${encodeURIComponent(d.externalId!)}`
        : `${TYPEFULLY}/social-sets/${encodeURIComponent(conn!.accountId)}/drafts/${encodeURIComponent(d.externalId!)}`,
      key,
    );
    const post = data.post || data;
    const status =
      post.status === "published"
        ? "published"
        : post.status === "scheduled"
          ? "scheduled"
          : ["failed", "partial"].includes(post.status)
            ? "failed"
            : null;
    if (status)
      db.prepare(
        "UPDATE content SET status=?,scheduledFor=coalesce(?,scheduledFor) WHERE clientId=? AND id=?",
      ).run(
        status,
        post.scheduled_date || post.scheduledFor || null,
        c.id,
        d.id,
      );
  }
}
