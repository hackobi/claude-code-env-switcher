import { XMLParser } from "fast-xml-parser";
import { Client } from "./types";
import { credential } from "./credentials";
import { forClient } from "./repository";
import { api } from "./http";
import { reserve, failUsage } from "./usage";

const strip = (x: unknown) =>
  String(x || "")
    .replace(/<[^>]*>/g, "")
    .slice(0, 2000);
export async function ingest(c: Client, brief: string) {
  const repo = forClient(c),
    notes: string[] = [];
  if (brief.trim())
    repo.addSignal({
      source: "brief",
      title: `Brief ${new Date().toISOString().slice(0, 10)}`,
      text: brief.slice(0, 10000),
      url: "",
    });
  for (const source of c.sources) {
    if (source === "brief") continue;
    try {
      if (["google-trends", "oslo-news"].includes(source)) {
        const url =
          source === "google-trends"
            ? "https://trends.google.com/trending/rss?geo=NO"
            : "https://www.nrk.no/stor-oslo/toppsaker.rss";
        const response = await fetch(url, {
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const parsed = new XMLParser().parse(await response.text());
        let items = parsed.rss?.channel?.item || [];
        if (!Array.isArray(items)) items = [items];
        for (const i of items.slice(0, 20))
          repo.addSignal({
            source,
            title: strip(i.title),
            text: strip(i.title),
            url: typeof i.link === "string" ? i.link : "",
          });
      }
      if (source === "norway-calendar") {
        const data = await api(
          `https://date.nager.at/api/v3/PublicHolidays/${new Date().getFullYear()}/NO`,
          "",
        );
        const today = new Date().toISOString().slice(0, 10);
        for (const h of data
          .filter((h: { date: string }) => h.date >= today)
          .slice(0, 8))
          repo.addSignal({
            source,
            title: h.localName,
            text: `${h.date}: ${h.localName}`,
            url: `https://date.nager.at/Calendar/${new Date().getFullYear()}/NO`,
          });
      }
      if (source === "oslo-weather") {
        const data = await api(
          "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.91&lon=10.75",
          "",
          {
            headers: {
              "User-Agent": `SocialEngine/1.0 ${c.website || "local content planning"}`,
            },
          },
        );
        const point = data.properties.timeseries[0];
        repo.addSignal({
          source,
          title: `Oslo weather ${point.time}`,
          text: `Forecast temperature: ${point.data.instant.details.air_temperature}°C. Source: MET Norway, CC BY 4.0.`,
          url: "https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/1-72837/Norge/Oslo/Oslo/Oslo",
        });
      }
      if (source === "rapidapi") {
        const key = credential(c, "rapidapi");
        if (!key) throw new Error("API key not configured");
        const handle = (
          c.peers[0] || (c.slug === "demos" ? "demos_network" : "")
        ).replace(/^@/, "");
        if (!/^[a-zA-Z0-9_]{1,30}$/.test(handle))
          throw new Error("Add an X handle in peer accounts");
        const data = await api(
          `https://twitter-api45.p.rapidapi.com/timeline.php?screenname=${handle}&count=10`,
          key,
          {
            headers: {
              "x-rapidapi-key": key,
              "x-rapidapi-host": "twitter-api45.p.rapidapi.com",
            },
          },
        );
        for (const t of (data.timeline || []).slice(0, 10))
          repo.addSignal({
            source,
            title: strip(t.text).slice(0, 100),
            text: strip(t.text),
            url: `https://x.com/${handle}/status/${t.tweet_id}`,
          });
      }
      if (source === "apify-x") {
        const key = credential(c, "apify");
        if (!key) throw new Error("API key not configured");
        const handle = (
          c.peers[0] || (c.slug === "demos" ? "demos_network" : "")
        ).replace(/^@/, "");
        if (!/^[a-zA-Z0-9_]{1,30}$/.test(handle))
          throw new Error("Add an X handle in peer accounts");
        // This endpoint omits the final run charge: retain the cap as a conservative estimate.
        const charge = reserve(
          c,
          "apify",
          "twitter-scraper-lite (maximum charge)",
          0.05,
        );
        let data;
        try {
          data = await api(
            "https://api.apify.com/v2/acts/apidojo~twitter-scraper-lite/run-sync-get-dataset-items?maxTotalChargeUsd=0.05&timeout=60",
            key,
            {
              method: "POST",
              body: JSON.stringify({
                searchTerms: [`from:${handle}`],
                maxItems: 10,
                sort: "Latest",
              }),
            },
          );
        } finally {
          failUsage(c, charge, true);
        }
        for (const t of data.slice(0, 10))
          repo.addSignal({
            source,
            title: strip(t.text).slice(0, 100),
            text: strip(t.text),
            url: typeof t.url === "string" ? t.url : "",
          });
      }
    } catch (e) {
      notes.push(`${source}: ${(e as Error).message}`);
    }
  }
  return notes;
}
