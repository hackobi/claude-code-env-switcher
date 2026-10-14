"use client";
import { useState } from "react";
import { Profile, Platform } from "../../engine/types";
import type { Overview } from "./Workspace";
import { ProfileFields } from "./ProfileFields";
import { send } from "./api";
export function Settings({
  data,
  base,
  reload,
}: {
  data: Overview;
  base: string;
  reload: () => Promise<void>;
}) {
  const { id, createdAt, ...initial } = data.client;
  const [p, setP] = useState<Profile>(initial),
    [step, setStep] = useState(0),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [provider, setProvider] = useState("anthropic"),
    [key, setKey] = useState(""),
    [rail, setRail] = useState<"typefully" | "zernio">(
      data.client.industry === "technology" ? "typefully" : "zernio",
    ),
    [available, setAvailable] = useState<
      { accountId: string; label: string; platform?: string }[]
    >([]),
    [account, setAccount] = useState(""),
    [platform, setPlatform] = useState<Platform>(data.client.channels[0]);
  const channelOptions: Platform[] =
    rail === "zernio" ? ["instagram", "facebook"] : p.channels;
  async function action(op: string, body: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
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
  }
  async function save() {
    const clean = {
      ...p,
      keywords: p.keywords.filter(Boolean),
      avoid: p.avoid.filter(Boolean),
      peers: p.peers.filter(Boolean),
      hashtags: p.hashtags.filter(Boolean),
    };
    if (await action("profile", clean))
      setMessage(
        "Client settings saved. Pending approvals were cleared because the client settings changed.",
      );
  }
  return (
    <>
      <section className="panel">
        <h2>Client profile</h2>
        <nav className="tabs compact">
          {["Business", "Brand", "Channels", "Approval"].map((t, i) => (
            <button
              key={t}
              className={step === i ? "active" : ""}
              onClick={() => setStep(i)}
            >
              {t}
            </button>
          ))}
        </nav>
        <ProfileFields value={p} onChange={setP} step={step} />
        <button disabled={busy} className="primary" onClick={save}>
          Save client profile
        </button>
      </section>
      <div className="two-panels">
        <section className="panel">
          <h2>AI provider & accounting</h2>
          <p className="muted">
            Use the shared provider key by default, or add a dedicated key for
            this client. Every call is attributed to {p.name}.
          </p>
          <div className="form-grid">
            <label className="field">
              Text provider
              <select
                value={p.llm.provider}
                onChange={(e) =>
                  setP({
                    ...p,
                    llm: {
                      ...p.llm,
                      provider: e.target.value as "anthropic" | "openai",
                      model:
                        e.target.value === "anthropic"
                          ? "claude-sonnet-4-6"
                          : "gpt-4.1-mini",
                      inputRate: e.target.value === "anthropic" ? 3 : 0.4,
                      outputRate: e.target.value === "anthropic" ? 15 : 1.6,
                    },
                  })
                }
              >
                <option value="anthropic">Anthropic (default)</option>
                <option value="openai">OpenAI</option>
              </select>
            </label>
            <label className="field">
              Model ID
              <input
                value={p.llm.model}
                onChange={(e) =>
                  setP({ ...p, llm: { ...p.llm, model: e.target.value } })
                }
              />
            </label>
            <label className="field">
              Input · USD / million tokens
              <input
                type="number"
                min="0"
                step=".01"
                value={p.llm.inputRate}
                onChange={(e) =>
                  setP({
                    ...p,
                    llm: { ...p.llm, inputRate: Number(e.target.value) },
                  })
                }
              />
            </label>
            <label className="field">
              Output · USD / million tokens
              <input
                type="number"
                min="0"
                step=".01"
                value={p.llm.outputRate}
                onChange={(e) =>
                  setP({
                    ...p,
                    llm: { ...p.llm, outputRate: Number(e.target.value) },
                  })
                }
              />
            </label>
            <label className="field">
              Monthly USD budget · USD
              <input
                type="number"
                min="1"
                value={p.llm.monthlyBudget}
                onChange={(e) =>
                  setP({
                    ...p,
                    llm: { ...p.llm, monthlyBudget: Number(e.target.value) },
                  })
                }
              />
            </label>
            <label className="field">
              Monthly Higgsfield allowance
              <input
                type="number"
                min="0"
                value={p.mediaCredits}
                onChange={(e) =>
                  setP({ ...p, mediaCredits: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <p className="muted">
            Rates are editable billing estimates. Check the provider’s current
            rates when choosing a different model.
          </p>
          <button disabled={busy} onClick={save}>
            Save billing settings
          </button>
        </section>
        <section className="panel">
          <h2>API keys</h2>
          <div className="connection-list">
            {data.credentials.map((s) => (
              <div key={s.provider}>
                <span>{s.provider}</span>
                <small>
                  {s.configured ? `Configured · ${s.source}` : "Not configured"}
                </small>
              </div>
            ))}
          </div>
          <label className="field">
            Provider
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setKey("");
              }}
            >
              {data.credentials.map((s) => (
                <option key={s.provider}>{s.provider}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Dedicated key for {p.name}
            <input
              type="password"
              autoComplete="new-password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste a key to add or replace it"
            />
          </label>
          <div className="actions">
            <button
              disabled={busy || !key}
              onClick={async () => {
                if (await action("credential", { provider, key })) {
                  setKey("");
                  setMessage("Client key saved.");
                }
              }}
            >
              Save key
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                const r = await action("test", { provider });
                if (r)
                  setMessage(
                    "Connection check passed. This verifies authentication; generation and publishing are separate checks.",
                  );
              }}
            >
              Test connection
            </button>
          </div>
          <p className="muted">
            Keys are stored encrypted on this Mac and are never sent back to the
            browser.
          </p>
        </section>
      </div>
      <section className="panel">
        <h2>Publishing accounts</h2>
        <p className="muted">
          Assign the exact account for each channel. Accounts already assigned
          to another client cannot be selected.
        </p>
        {data.connections.map((a) => (
          <div className="list-row" key={a.platform}>
            <b>{a.platform}</b>
            <span>{a.label}</span>
            <span className="pill connected">{a.provider}</span>
          </div>
        ))}
        <div className="form-grid">
          <label className="field">
            Publishing service
            <select
              value={rail}
              onChange={(e) => {
                const nextRail = e.target.value as typeof rail;
                setRail(nextRail);
                setPlatform(nextRail === "zernio" ? "instagram" : "x");
                setAvailable([]);
                setAccount("");
              }}
            >
              <option value="typefully">
                Typefully · X, Threads, LinkedIn, Bluesky
              </option>
              <option value="zernio">Zernio · Instagram, Facebook</option>
            </select>
          </label>
          <label className="field">
            Channel
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
            >
              {channelOptions.map((ch) => (
                <option key={ch}>{ch}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Account
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">Choose an account</option>
              {available
                .filter((a) => !a.platform || a.platform === platform)
                .map((a) => (
                  <option key={a.accountId} value={a.accountId}>
                    {a.label}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="actions">
          <button
            disabled={busy}
            onClick={async () => {
              const r = await action("accounts", { provider: rail });
              if (r) setAvailable(r as typeof available);
            }}
          >
            Load available accounts
          </button>
          <button
            className="primary"
            disabled={busy || !account}
            onClick={async () => {
              if (
                await action("bind", {
                  provider: rail,
                  platform,
                  accountId: account,
                })
              )
                setMessage("Account assigned to this client.");
            }}
          >
            Assign selected account
          </button>
          {rail === "zernio" &&
            ["instagram", "facebook"].includes(platform) && (
              <button
                disabled={busy}
                onClick={async () => {
                  const r = (await action("connect", { platform })) as {
                    url: string;
                  } | null;
                  if (r) window.location.assign(r.url);
                }}
              >
                Connect a new {platform} account ↗
              </button>
            )}
        </div>
      </section>
      <section className="panel">
        <h2>A repeatable weekly routine</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={p.automation.enabled}
            onChange={(e) =>
              setP({
                ...p,
                automation: { ...p.automation, enabled: e.target.checked },
              })
            }
          />
          Automatically prepare drafts for this client
        </label>
        <div className="form-grid">
          <label className="field">
            Frequency
            <select
              value={p.automation.intervalHours}
              onChange={(e) =>
                setP({
                  ...p,
                  automation: {
                    ...p.automation,
                    intervalHours: Number(e.target.value),
                  },
                })
              }
            >
              <option value={168}>Weekly</option>
              <option value={72}>Every 3 days</option>
              <option value={24}>Daily</option>
            </select>
          </label>
          <label className="field wide">
            Standing brief
            <textarea
              rows={3}
              value={p.automation.brief}
              onChange={(e) =>
                setP({
                  ...p,
                  automation: { ...p.automation, brief: e.target.value },
                })
              }
            />
          </label>
        </div>
        <p className="muted">
          The worker gathers sources and prepares drafts within this client’s
          allowance. Posts follow the configured approval policy before handoff.
        </p>
        <button disabled={busy} onClick={save}>
          Save routine
        </button>
      </section>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
