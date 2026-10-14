"use client";
import { useState } from "react";
import type { Overview } from "./Workspace";
import { send, read } from "./api";
export function MediaLibrary({
  data,
  base,
  reload,
}: {
  data: Overview;
  base: string;
  reload: () => Promise<void>;
}) {
  const [file, setFile] = useState<File>(),
    [consent, setConsent] = useState(false),
    [alcohol, setAlcohol] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [source, setSource] = useState(""),
    [draftId, setDraftId] = useState(""),
    [prompt, setPrompt] = useState(""),
    [mode, setMode] = useState("graphic"),
    [status, setStatus] = useState("");
  async function add() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("consent", String(consent));
      form.set("alcohol", String(alcohol));
      const response = await fetch(`${base}/upload`, {
        method: "POST",
        body: form,
      });
      const r = await response.json();
      if (!response.ok) throw new Error(r.error);
      await reload();
      setFile(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function make() {
    setBusy(true);
    setError("");
    try {
      if (mode === "graphic" || mode === "story")
        await send(`${base}/graphic`, {
          sourceId: source,
          headline: prompt,
          story: mode === "story",
        });
      else
        await send(`${base}/media`, {
          mode,
          prompt,
          ...(source ? { sourceId: source } : {}),
          ...(draftId ? { draftId } : {}),
        });
      setStatus(
        mode === "graphic" || mode === "story"
          ? "Graphic added to your library."
          : "Generation queued. Follow its progress in Activity.",
      );
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="two-panels">
        <section className="panel">
          <h2>Bring the real thing.</h2>
          <p className="muted">
            Photos and brand assets for {data.client.name}. JPEG, PNG or WebP,
            up to 20 MB.
          </p>
          <label className="field">
            Choose a photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0])}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I have permission to use this photo and any people shown
          </label>
          {data.client.industry === "restaurant" && (
            <label className="check">
              <input
                type="checkbox"
                checked={alcohol}
                onChange={(e) => setAlcohol(e.target.checked)}
              />
              Alcohol or drink branding is visible
            </label>
          )}
          <button disabled={busy || !file || !consent} onClick={add}>
            Upload to library
          </button>
        </section>
        <section className="panel">
          <div className="section-title">
            <h2>Create media</h2>
            <button
              onClick={async () => {
                try {
                  const s = await read<{ credits: number }>(
                    `${base}/higgsfield`,
                  );
                  setStatus(
                    `Higgsfield connected · ${s.credits} credits available`,
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Check Higgsfield
            </button>
          </div>
          <label className="field">
            Format
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="graphic">Photo + headline · feed</option>
              <option value="story">Photo + headline · story</option>
              <option value="image">Higgsfield graphic</option>
              <option value="video">Higgsfield video · 5 seconds</option>
            </select>
          </label>
          <label className="field">
            Attach to draft (optional)
            <select value={draftId} onChange={(e) => setDraftId(e.target.value)}>
              <option value="">Keep in media library only</option>
              {data.items
                .filter((d) => ["draft", "needs_review", "changes_requested"].includes(d.status))
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
            </select>
          </label>
          <label className="field">
            Reference photo
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">Select a reference</option>
              {data.assets
                .filter((a) => a.mime.startsWith("image/"))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            {["graphic", "story"].includes(mode)
              ? "Headline"
              : "Creative direction"}
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <button
            className="primary"
            disabled={
              busy ||
              !prompt.trim() ||
              (["graphic", "story", "video"].includes(mode) && !source)
            }
            onClick={make}
          >
            Create {mode === "video" ? "video" : "graphic"} ↗
          </button>
          <p className="muted">
            Higgsfield checks the estimated credits against this client’s
            monthly allowance before submitting.
          </p>
        </section>
      </div>
      {status && <p className="notice">{status}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="section-title">
        <h2>
          Media library <span className="muted">{data.assets.length}</span>
        </h2>
      </div>
      <div className="media-grid">
        {data.assets.map((a) => (
          <article className="content-card" key={a.id}>
            {a.kind === "video" ? (
              <video
                controls
                preload="metadata"
                src={`${base}/assets/${a.id}`}
              />
            ) : (
              <img src={`${base}/assets/${a.id}`} alt={a.name} loading="lazy" />
            )}
            <div className="card-body">
              <h3>{a.name}</h3>
              <div className="card-tags">
                <span>{a.kind}</span>
                <span>{a.ai ? "AI generated" : "Original photo"}</span>
              </div>
              <a href={`${base}/assets/${a.id}`} download={a.name}>
                Download ↗
              </a>
            </div>
          </article>
        ))}
      </div>
      {!data.assets.length && (
        <div className="empty">Your client’s media library starts here.</div>
      )}
    </>
  );
}
