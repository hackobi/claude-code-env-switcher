import { lookup } from "node:dns/promises";
import net from "node:net";

export async function api(url: string, key: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(45000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok)
    throw new Error(`Provider returned HTTP ${response.status}`);
  return response.json();
}
export async function publicURL(value: string) {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password || u.port)
    throw new Error("Use a public HTTPS URL");
  const addresses = await lookup(u.hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => {
      if (net.isIPv6(address)) return !/^[23][0-9a-f]{3}:/i.test(address);
      const [a, b] = address.split(".").map(Number);
      return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        a >= 224 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127) ||
        a === 198
      );
    })
  )
    throw new Error("Private network URLs are not accepted");
  return u;
}
export async function publicFetch(value: string, init: RequestInit = {}) {
  await publicURL(value);
  return fetch(value, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(45000),
  });
}
