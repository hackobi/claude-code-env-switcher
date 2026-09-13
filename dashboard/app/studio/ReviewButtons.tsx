"use client";
import { useState } from "react";
import { send } from "./api";
export function ReviewButtons({
  token,
  blocked,
}: {
  token: string;
  blocked: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  async function act(decision: string) {
    setBusy(true);
    try {
      await send(`/r/${token}/decision`, { decision });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return done ? (
    <div className="notice">Takk! Svaret ditt er lagret.</div>
  ) : (
    <>
      <div className="actions">
        <button
          disabled={busy || blocked}
          className="primary"
          onClick={() => act("approve")}
        >
          Godkjenn
        </button>
        <button disabled={busy} onClick={() => act("changes")}>
          Be om endringer
        </button>
        <button disabled={busy} onClick={() => act("reject")}>
          Avvis
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
