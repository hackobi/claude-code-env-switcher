export async function send<T = unknown>(
  url: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
}
export async function read<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}
