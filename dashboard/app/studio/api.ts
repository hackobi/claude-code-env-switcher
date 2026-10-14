export async function send<T = unknown>(
  url: string,
  body: unknown,
): Promise<T> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let result: { error?: string } & T;
    try {
      result = JSON.parse(text) as { error?: string } & T;
    } catch {
      throw new Error(
        response.ok
          ? "The server returned an invalid response"
          : `Request failed (${response.status})`,
      );
    }
    if (!response.ok) throw new Error(result.error || "Request failed");
    return result;
  } catch (e) {
    if (e instanceof TypeError)
      throw new Error(
        "The local Social Engine server is unavailable. Refresh the page and try again.",
      );
    throw e;
  }
}
export async function read<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}
