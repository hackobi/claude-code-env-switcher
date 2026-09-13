import { Client, Draft } from "./types";
import { forClient } from "./repository";
import { readiness } from "./clients";

export function roles(c: Client) {
  return c.industry === "restaurant" ? ["operator", "owner"] : ["operator"];
}
export function gate(c: Client, d: Draft): string[] {
  const problems = readiness(c),
    repo = forClient(c);
  const limits = {
    x: 280,
    instagram: 2200,
    facebook: 5000,
    threads: 500,
    linkedin: 3000,
    bluesky: 300,
  };
  for (const v of d.variants) {
    if (!c.channels.includes(v.platform))
      problems.push(`${v.platform} is not enabled for this client`);
    if ([...v.text].length > limits[v.platform])
      problems.push(`${v.platform} exceeds ${limits[v.platform]} characters`);
    for (const word of c.avoid)
      if (v.text.toLowerCase().includes(word.toLowerCase()))
        problems.push(`Contains an excluded phrase: ${word}`);
    if (
      c.industry === "restaurant" &&
      c.restaurant?.alcohol &&
      /(\b(vin|øl|cocktail|akevitt|champagne|beer|wine|vodka|gin|happy hour)\b|🍷|🍺|🍸|🥂|🍾|🍹|🥃)/iu.test(
        v.text,
      )
    )
      problems.push("Alcohol-related content needs revision before review");
  }
  if (d.variants.some((v) => v.platform === "instagram") && !d.assetIds.length)
    problems.push("Instagram requires a photo or video");
  for (const id of d.assetIds) {
    const a = repo.asset(id);
    if (!a.consent) problems.push(`Confirm usage rights for ${a.name}`);
    if (c.industry === "restaurant" && a.alcohol)
      problems.push(`Remove alcohol imagery: ${a.name}`);
    if (c.industry === "restaurant" && a.ai && a.kind === "photo")
      problems.push("Use a real reference photo for food and premises");
    if (
      a.ai &&
      a.kind === "video" &&
      d.variants.some(
        (v) =>
          !v.text.includes(
            c.language.startsWith("nb") ? "KI-generert" : "AI-generated",
          ),
      )
    )
      problems.push("Add the AI video disclosure to every caption");
  }
  return [...new Set(problems)];
}
