"use client";
import { useState } from "react";
import { Draft, DraftInput } from "../../engine/types";
import { send } from "./api";
import type { Overview } from "./Workspace";
type Item = Overview["items"][number];
export function Board({
  data,
  base,
  reload,
}: {
  data: Overview;
  base: string;
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<(DraftInput & { id?: string }) | null>(
      null,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [link, setLink] = useState<{ url: string; localOnly: boolean } | null>(
      null,
    ),
    [when, setWhen] = useState("");
  const run = async (op: string, body: unknown) => {
    setBusy(true);
    setError("");
    try {
      const r = await send(`${base}/${op}`, body);
      await reload();
      return r;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };
  const closeEditor = () => {
    setEditing(null);
    setError("");
  };
  const columns = [
    {
      name: "Needs review",
      states: ["draft", "needs_review", "changes_requested"],
    },
    { name: "Approved", states: ["approved"] },
    {
      name: "Handed off",
      states: [
        "dispatching",
        "handed_off",
        "scheduled",
        "published",
        "delivery_unknown",
      ],
    },
  ];
  const open = (d: Draft) =>
    setEditing({
      id: d.id,
      title: d.title,
      variants: d.variants.map((v) => ({ ...v })),
      assetIds: [...d.assetIds],
      notes: d.notes,
    });
  function card(d: Item) {
    const a = data.assets.find((a) => a.id === d.assetIds[0]);
    return (
      <article className="content-card" key={d.id}>
        {a &&
          (a.kind === "video" ? (
            <video src={`${base}/assets/${a.id}`} controls preload="metadata" />
          ) : (
            <img src={`${base}/assets/${a.id}`} alt={a.name} loading="lazy" />
          ))}
        <div className="card-body">
          <div className="card-tags">
            {d.variants.map((v) => (
              <span key={v.platform}>{v.platform}</span>
            ))}
            <span>{d.status.replace(/_/g, " ")}</span>
          </div>
          <h3>{d.title}</h3>
          <p className="caption">{d.variants[0]?.text}</p>
          <details>
            <summary>All captions & brief</summary>
            {d.variants.map((v) => (
              <div key={v.platform}>
                <b>{v.platform}</b>
                <p className="caption">{v.text}</p>
              </div>
            ))}
            <p className="muted">{d.notes}</p>
          </details>
          {d.gate.length > 0 && (
            <details className="gate">
              <summary>{d.gate.length} checks to resolve</summary>
              <ul>
                {d.gate.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="approval-status">
            {data.roles.map((r) => (
              <span key={r}>
                {d.approvals.includes(r) ? "✓" : "○"} {r}
              </span>
            ))}
          </div>
          <div className="actions">
            {[
              "draft",
              "needs_review",
              "approved",
              "changes_requested",
            ].includes(d.status) && (
              <button disabled={busy} onClick={() => open(d)}>
                Edit
              </button>
            )}
            {["draft", "needs_review", "changes_requested"].includes(
              d.status,
            ) &&
              !d.assetIds.length && (
                <button
                  disabled={busy}
                  onClick={() =>
                    run("media", {
                      mode: "image",
                      prompt: d.notes || d.title,
                      draftId: d.id,
                    })
                  }
                >
                  Generate Higgsfield image
                </button>
              )}
            {["draft", "needs_review"].includes(d.status) && (
              <button
                disabled={busy || !!d.gate.length}
                className="primary"
                onClick={() => run("approve", { id: d.id, hash: d.hash })}
              >
                Approve
              </button>
            )}
            {["needs_review", "approved"].includes(d.status) &&
              data.client.industry === "restaurant" && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    const r = await run("review-link", { id: d.id });
                    if (r) setLink(r as { url: string; localOnly: boolean });
                  }}
                >
                  Owner review link
                </button>
              )}
            {d.status === "approved" && (
              <button
                className="primary"
                disabled={busy}
                onClick={() => {
                  open(d);
                  setWhen("");
                }}
              >
                Hand off →
              </button>
            )}
            {["draft", "needs_review"].includes(d.status) && (
              <button
                disabled={busy}
                onClick={() => run("reject", { id: d.id })}
              >
                Reject
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }
  const original = editing?.id
    ? data.items.find((d) => d.id === editing.id)
    : undefined;
  return (
    <>
      <div className="section-title">
        <h2>
          Content board <span className="muted">{data.items.length}</span>
        </h2>
        <button
          onClick={() =>
            setEditing({
              title: "",
              variants: data.client.channels.map((platform) => ({
                platform,
                text: "",
              })),
              assetIds: [],
              notes: "",
            })
          }
        >
          + Write a draft
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="board">
        {columns.map((col) => (
          <section className="column" key={col.name}>
            <div className="column-heading">
              <span>{col.name}</span>
              <b>
                {data.items.filter((d) => col.states.includes(d.status)).length}
              </b>
            </div>
            {data.items.filter((d) => col.states.includes(d.status)).map(card)}
            {!data.items.some((d) => col.states.includes(d.status)) && (
              <div className="empty">
                {col.name === "Needs review"
                  ? "Start with a brief or write a draft."
                  : "Content will appear here as it moves through review."}
              </div>
            )}
          </section>
        ))}
      </div>
      {data.items.some((d) => ["failed", "rejected"].includes(d.status)) && (
        <details className="panel">
          <summary>Rejected / failed items</summary>
          {data.items
            .filter((d) => ["failed", "rejected"].includes(d.status))
            .map(card)}
        </details>
      )}
      {link && (
        <div className="notice">
          <p>
            Owner review link created.{" "}
            {link.localOnly
              ? "This link is local to this Mac. Set a public review URL before sharing it with the owner."
              : "Ready to share with the owner."}
          </p>
          <a href={link.url} target="_blank" rel="noreferrer">
            Open review page ↗
          </a>
          <button onClick={() => navigator.clipboard.writeText(link.url)}>
            Copy link
          </button>
          <button onClick={() => setLink(null)}>Close</button>
        </div>
      )}
      {editing && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditor();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Edit draft"
            className="modal"
          >
            <div className="section-title">
              <h2>
                {original?.status === "approved"
                  ? "Review & hand off"
                  : "Draft editor"}
              </h2>
              <button onClick={closeEditor}>Close ×</button>
            </div>
            <label className="field">
              Title
              <input
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
            </label>
            {editing.variants.map((v, i) => (
              <label className="field" key={v.platform}>
                {v.platform} · {[...v.text].length} characters
                <textarea
                  rows={4}
                  value={v.text}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      variants: editing.variants.map((x, j) =>
                        j === i ? { ...x, text: e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
            ))}
            <label className="field">
              Creative brief / evidence
              <textarea
                rows={2}
                value={editing.notes}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
              />
            </label>
            <fieldset>
              <legend>Media from {data.client.name}</legend>
              <div className="asset-picker">
                {data.assets.map((a) => (
                  <label key={a.id}>
                    <input
                      type="checkbox"
                      checked={editing.assetIds.includes(a.id)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          assetIds: e.target.checked
                            ? [...editing.assetIds, a.id]
                            : editing.assetIds.filter((id) => id !== a.id),
                        })
                      }
                    />
                    {a.name}
                  </label>
                ))}
              </div>
            </fieldset>
            {original?.status === "approved" && (
              <div className="notice">
                <p>
                  Hand off the approved version. Save any edits first; saving
                  requires a new review.
                </p>
                {original.variants.some((v) =>
                  ["instagram", "facebook"].includes(v.platform),
                ) ? (
                  <label className="field">
                    Publish time (your browser’s local time)
                    <input
                      type="datetime-local"
                      value={when}
                      onChange={(e) => setWhen(e.target.value)}
                    />
                  </label>
                ) : (
                  <p>This content is sent as an unscheduled Typefully draft.</p>
                )}
                <button
                  className="primary"
                  disabled={
                    busy ||
                    JSON.stringify({
                      title: editing.title,
                      variants: editing.variants,
                      assetIds: editing.assetIds,
                      notes: editing.notes,
                    }) !==
                      JSON.stringify({
                        title: original.title,
                        variants: original.variants,
                        assetIds: original.assetIds,
                        notes: original.notes,
                      })
                  }
                  onClick={async () => {
                    const r = await run("publish", {
                      id: original.id,
                      hash: original.hash,
                      ...(when ? { when: new Date(when).toISOString() } : {}),
                    });
                    if (r) setEditing(null);
                  }}
                >
                  Hand off approved version
                </button>
              </div>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  const { id, ...body } = editing;
                  const r = await run(`content${id ? `/${id}` : ""}`, body);
                  if (r) setEditing(null);
                }}
              >
                Save for review
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
