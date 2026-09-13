import { db } from "./db";
import { Client, Platform, Provider } from "./types";
import { credential } from "./credentials";
import { api } from "./http";
export type Connection = {
  clientId: string;
  provider: "typefully" | "zernio";
  platform: Platform;
  accountId: string;
  label: string;
};
export const ZERNIO = "https://zernio.com/api/v1";
export const TYPEFULLY = "https://api.typefully.com/v2";
export function connections(c: Client) {
  return db
    .prepare("SELECT * FROM connections WHERE clientId=?")
    .all(c.id) as Connection[];
}
export async function discover(c: Client, provider: "typefully" | "zernio") {
  const key = credential(c, provider);
  if (!key) throw new Error(`Add a ${provider} API key first`);
  const data = await api(
    provider === "typefully"
      ? `${TYPEFULLY}/social-sets`
      : `${ZERNIO}/accounts`,
    key,
  );
  if (provider === "typefully")
    return (
      data.results ||
      data.social_sets ||
      (Array.isArray(data) ? data : [])
    ).map((s: { id: string | number; name?: string; username?: string }) => ({
      accountId: String(s.id),
      label: s.name || s.username || `Social set ${s.id}`,
    }));
  return (data.accounts || []).map(
    (s: {
      _id: string;
      platform: string;
      username?: string;
      isActive?: boolean;
    }) => ({
      accountId: s._id,
      platform: s.platform,
      label: s.username || s._id,
      active: s.isActive,
    }),
  );
}
export async function bind(
  c: Client,
  provider: "typefully" | "zernio",
  platform: Platform,
  accountId: string,
) {
  if (!c.channels.includes(platform)) throw new Error("Channel is not enabled");
  if (["instagram", "facebook"].includes(platform) !== (provider === "zernio"))
    throw new Error(
      "Choose the configured publishing provider for this channel",
    );
  const available = (await discover(c, provider)) as {
    accountId: string;
    platform?: string;
    label: string;
    active?: boolean;
  }[];
  const account = available.find(
    (a) =>
      a.accountId === accountId && (!a.platform || a.platform === platform),
  );
  if (!account || account.active === false)
    throw new Error("Account is not available for this channel");
  db.transaction(() => {
    const owner = db
      .prepare(
        "SELECT clientId FROM publishing_accounts WHERE provider=? AND accountId=?",
      )
      .get(provider, accountId) as { clientId: string } | undefined;
    if (owner && owner.clientId !== c.id)
      throw new Error(
        "This publishing account is already assigned to another client",
      );
    db.prepare("INSERT OR IGNORE INTO publishing_accounts VALUES(?,?,?)").run(
      provider,
      accountId,
      c.id,
    );
    db.prepare("INSERT OR REPLACE INTO connections VALUES(?,?,?,?,?)").run(
      c.id,
      provider,
      platform,
      accountId,
      account.label,
    );
  })();
}
export async function testConnection(c: Client, provider: Provider) {
  const key = credential(c, provider);
  if (!key) throw new Error("No API key configured");
  if (provider === "typefully" || provider === "zernio")
    return { ok: true, accounts: await discover(c, provider) };
  let data;
  if (provider === "anthropic")
    data = await api("https://api.anthropic.com/v1/models", key, {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
  if (provider === "openai")
    data = await api("https://api.openai.com/v1/models", key);
  if (provider === "apify") await api("https://api.apify.com/v2/users/me", key);
  if (provider === "rapidapi")
    await api(
      "https://twitter-api45.p.rapidapi.com/screenname.php?screenname=demos_network",
      key,
      {
        headers: {
          "x-rapidapi-key": key,
          "x-rapidapi-host": "twitter-api45.p.rapidapi.com",
        },
      },
    );
  return { ok: true, models: data?.data?.map((m: { id: string }) => m.id) };
}
export async function connectURL(
  c: Client,
  platform: "instagram" | "facebook",
) {
  if (!c.channels.includes(platform)) throw new Error("Channel is not enabled");
  const key = credential(c, "zernio");
  if (!key) throw new Error("Add a Zernio API key first");
  let profile = db
    .prepare("SELECT value FROM metadata WHERE key=?")
    .get(`zernio-profile:${c.id}`) as { value: string } | undefined;
  if (!profile) {
    const result = await api(`${ZERNIO}/profiles`, key, {
      method: "POST",
      body: JSON.stringify({ name: c.name }),
    });
    profile = { value: result.profile._id };
    db.prepare("INSERT INTO metadata VALUES(?,?)").run(
      `zernio-profile:${c.id}`,
      profile.value,
    );
  }
  const data = await api(
    `${ZERNIO}/connect/${platform}?profileId=${encodeURIComponent(profile.value)}`,
    key,
  );
  return { url: data.authUrl };
}
