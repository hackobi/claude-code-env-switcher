"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Client, Draft, Asset, Signal, Job } from "../../engine/types";
import type { Usage } from "../../engine/usage";
import type { Connection } from "../../engine/connections";
import { read, send } from "./api";
import { Board } from "./Board";
import { MediaLibrary } from "./MediaLibrary";
import { Settings } from "./Settings";
export type Overview = {
  client: Client;
  items: (Draft & { gate: string[] })[];
  assets: Asset[];
  signals: Signal[];
  jobs: Job[];
  usage: Usage[];
  connections: Connection[];
  credentials: { provider: string; configured: boolean; source: string }[];
  missing: string[];
  roles: string[];
  workerHealthy: boolean;
};
export function Workspace({ slug }: { slug: string }) {
  const router = useRouter(),
    [all, setAll] = useState<Client[]>([]),
    [data, setData] = useState<Overview>(),
    [tab, setTab] = useState("Content"),
    [error, setError] = useState(""),
    [brief, setBrief] = useState(""),
    [busy, setBusy] = useState(false);
  const base = `/api/c/${encodeURIComponent(slug)}`;
  const reload = useCallback(async () => {
    try {
      const [d, a] = await Promise.all([
        read<Overview>(`${base}/overview`),
        read<{ clients: Client[] }>("/api/clients"),
      ]);
      setData(d);
      setAll(a.clients);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [base]);
  useEffect(() => {
    reload();
    const timer = setInterval(reload, 8000);
    return () => clearInterval(timer);
  }, [reload]);
  async function run() {
    setBusy(true);
    setError("");
    try {
      await send(`${base}/generate`, { brief });
      setBrief("");
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main className="onboarding">
        <h1>Social Engine</h1>
        <p>{error || "Opening workspace…"}</p>
        <Link href="/onboarding">Add a client</Link>
      </main>
    );
  const c = data.client,
    activeJob = data.jobs.find((j) => ["queued", "running"].includes(j.status)),
    month = new Date().toISOString().slice(0, 7);
  const monthly = data.usage.filter(
    (u) => u.createdAt.startsWith(month) && u.status !== "failed",
  );
  const cost = monthly.reduce((n, u) => n + u.estimatedUsd, 0),
    credits = monthly.reduce((n, u) => n + u.credits, 0);
  return (
    <div
      className="studio"
      style={{ "--accent": c.color } as React.CSSProperties}
    >
      <header className="topbar">
        <Link className="wordmark" href="/">
          ◒ &nbsp; SOCIAL ENGINE
        </Link>
        <div className="client-switch">
          <span className="muted">WORKSPACE</span>
          <select
            aria-label="Choose client"
            value={slug}
            onChange={(e) => router.push(`/c/${e.target.value}`)}
          >
            {all.map((x) => (
              <option key={x.id} value={x.slug}>
                {x.name}
              </option>
            ))}
          </select>
          <Link className="button" href="/onboarding">
            + Add client
          </Link>
        </div>
      </header>
      <main className="workspace">
        <div className="workspace-heading">
          <div>
            <span className="eyebrow">
              {c.industry} / {c.language}
            </span>
            <h1>{c.name}</h1>
            <p className="muted">
              Your content, from first idea to final post.
            </p>
          </div>
          <div className="channel-pills">
            {c.channels.map((ch) => (
              <span
                key={ch}
                className={
                  data.connections.some((a) => a.platform === ch)
                    ? "pill connected"
                    : "pill"
                }
              >
                {ch}
                <i />
              </span>
            ))}
          </div>
        </div>
        <div className="metrics">
          <div>
            <span>AWAITING REVIEW</span>
            <strong>
              {
                data.items.filter((i) =>
                  ["needs_review", "draft"].includes(i.status),
                ).length
              }
            </strong>
          </div>
          <div>
            <span>READY TO HAND OFF</span>
            <strong>
              {data.items.filter((i) => i.status === "approved").length}
            </strong>
          </div>
          <div>
            <span>THIS MONTH · EST. USD</span>
            <strong>
              ${cost.toFixed(2)}
              <small> / {c.llm.monthlyBudget}</small>
            </strong>
          </div>
          <div>
            <span>HIGGSFIELD CREDITS</span>
            <strong>
              {credits}
              <small> / {c.mediaCredits}</small>
            </strong>
          </div>
        </div>
        <nav className="tabs">
          {[
            "Content",
            "Calendar",
            "Media",
            "Sources",
            "Activity",
            "Settings",
          ].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
          <span className="worker-status">
            {data.workerHealthy ? "● Worker online" : "○ Worker offline"}
          </span>
        </nav>
        {error && (
          <div className="error" role="alert">
            {error}
            <button onClick={() => setError("")}>Dismiss</button>
          </div>
        )}
        {data.missing.length > 0 && (
          <div className="notice">
            Finish setup: {data.missing.join(", ")}.{" "}
            <button onClick={() => setTab("Settings")}>
              Complete profile →
            </button>
          </div>
        )}
        {tab === "Content" && (
          <>
            <section className="brief-bar">
              <div>
                <h2>What’s happening this week?</h2>
                <p className="muted">
                  Add confirmed news, offers or a direction for {c.name}.
                </p>
              </div>
              <textarea
                aria-label="Weekly brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={
                  c.industry === "restaurant"
                    ? "Seasonal dishes, events, quieter evenings to fill…"
                    : "A product update, a useful insight, a story worth telling…"
                }
              />
              <button
                className="primary"
                disabled={
                  busy ||
                  !!activeJob ||
                  data.missing.length > 0 ||
                  brief.trim().length < 5
                }
                onClick={run}
              >
                {activeJob ? activeJob.progress : "Generate drafts ↗"}
              </button>
            </section>
            <Board data={data} base={base} reload={reload} />
          </>
        )}
        {tab === "Calendar" && (
          <section className="panel">
            <h2>Scheduled & handed off</h2>
            <p className="muted">
              Times are displayed in {c.timezone}. Typefully drafts keep their
              final approval in Typefully.
            </p>
            {data.items
              .filter((i) =>
                ["handed_off", "scheduled", "published"].includes(i.status),
              )
              .map((i) => (
                <div className="list-row" key={i.id}>
                  <b>{i.title}</b>
                  <span>
                    {i.scheduledFor
                      ? new Date(i.scheduledFor).toLocaleString("en-GB", {
                          timeZone: c.timezone,
                        })
                      : "Awaiting vendor schedule"}
                  </span>
                  <span className="pill">{i.status}</span>
                </div>
              ))}
            <button
              onClick={async () => {
                try {
                  await send(`${base}/sync`, {});
                  reload();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Refresh publishing status
            </button>
          </section>
        )}
        {tab === "Media" && (
          <MediaLibrary data={data} base={base} reload={reload} />
        )}
        {tab === "Sources" && (
          <section className="panel">
            <h2>Research for {c.name}</h2>
            <p className="muted">
              Only this client’s sources inform its drafts. National trends are
              ranked against its topics.
            </p>
            {data.signals.length === 0 ? (
              <p className="empty">
                Your first pipeline run will collect sources here.
              </p>
            ) : (
              data.signals.map((s) => (
                <div className="list-row" key={s.id}>
                  <span className="pill">{s.source}</span>
                  <div>
                    <b>{s.title}</b>
                    <p className="muted">{s.text.slice(0, 280)}</p>
                  </div>
                  {s.url.startsWith("https://") && (
                    <a href={s.url} target="_blank" rel="noreferrer">
                      Source ↗
                    </a>
                  )}
                </div>
              ))
            )}
          </section>
        )}
        {tab === "Activity" && (
          <section className="panel">
            <h2>Pipeline activity</h2>
            {data.jobs.map((j) => (
              <div key={j.id} className="list-row">
                <span className="pill">{j.status}</span>
                <div>
                  <b>{j.progress}</b>
                  <p className="muted">
                    {j.error ||
                      (j.result
                        ? JSON.parse(j.result)?.draftIds
                          ? `${JSON.parse(j.result).draftIds.length} drafts prepared. ${(JSON.parse(j.result).sourceWarnings || []).join("; ")}`
                          : "Media added to the library."
                        : j.type)}
                  </p>
                </div>
                <time>{new Date(j.createdAt).toLocaleString()}</time>
              </div>
            ))}
            <h2>Usage ledger</h2>
            <p className="muted">
              USD amounts are estimates using the model rates in Settings.
              Provider invoices remain the billing source of truth.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Provider / model</th>
                    <th>Input tokens</th>
                    <th>Output tokens</th>
                    <th>Est. USD</th>
                    <th>Credits</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.usage.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.provider}
                        <br />
                        <small>{u.model}</small>
                      </td>
                      <td>{u.inputTokens}</td>
                      <td>{u.outputTokens}</td>
                      <td>${u.estimatedUsd.toFixed(4)}</td>
                      <td>{u.credits}</td>
                      <td>{u.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {tab === "Settings" && (
          <Settings data={data} base={base} reload={reload} />
        )}
      </main>
      <footer className="footer">
        {c.name} workspace <span>Social Engine · Create with context.</span>
      </footer>
    </div>
  );
}
