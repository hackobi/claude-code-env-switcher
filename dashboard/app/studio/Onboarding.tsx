"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { profileSchema, Profile, Client } from "../../engine/types";
import { ProfileFields } from "./ProfileFields";
import { send } from "./api";
export function Onboarding() {
  const router = useRouter(),
    [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile>(() => ({
    ...profileSchema.parse({
      name: "New client",
      slug: "new-client",
      industry: "other",
      channels: ["instagram", "facebook"],
    }),
    name: "",
    slug: "",
  }));
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("social-engine-onboarding") || "null",
      );
      if (saved) {
        setProfile(saved.profile);
        setStep(Math.min(3, Math.max(0, saved.step || 0)));
      }
    } catch {
      /* Ignore an expired or malformed browser draft. */
    }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (restored)
      sessionStorage.setItem(
        "social-engine-onboarding",
        JSON.stringify({ profile, step }),
      );
  }, [profile, step, restored]);
  const steps = [
    "Business",
    "Brand & audience",
    "Channels & sources",
    "Details & approval",
  ];
  async function save() {
    setBusy(true);
    setError("");
    try {
      const clean = {
        ...profile,
        keywords: profile.keywords.filter(Boolean),
        avoid: profile.avoid.filter(Boolean),
        peers: profile.peers.filter(Boolean),
        hashtags: profile.hashtags.filter(Boolean),
      };
      const result = await send<{ client: Client }>("/api/clients", clean);
      sessionStorage.removeItem("social-engine-onboarding");
      router.push(`/c/${result.client.slug}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="onboarding">
      <Link href="/" className="wordmark">
        ◒ &nbsp; SOCIAL ENGINE
      </Link>
      <div className="onboarding-head">
        <span className="eyebrow">NEW CLIENT</span>
        <h1>A workspace of their own.</h1>
        <p className="muted">
          Set up the brand once. Build a repeatable content routine around it.
        </p>
      </div>
      <nav className="steps">
        {steps.map((s, i) => (
          <button
            key={s}
            className={step === i ? "active" : ""}
            onClick={() => setStep(i)}
          >
            <b>{i + 1}</b>
            {s}
          </button>
        ))}
      </nav>
      <section className="panel">
        <h2>{steps[step]}</h2>
        <ProfileFields
          value={profile}
          creating
          step={step}
          onChange={(p) => {
            if (
              p.name !== profile.name &&
              (!profile.slug ||
                profile.slug ===
                  profile.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .slice(0, 32)
                    .replace(/-$/, ""))
            )
              p.slug = p.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .slice(0, 32)
                .replace(/-$/, "");
            setProfile(p);
          }}
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions spaced">
          <button
            disabled={step === 0 || busy}
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
          {step < 3 ? (
            <button className="primary" onClick={() => setStep(step + 1)}>
              Continue →
            </button>
          ) : (
            <button className="primary" disabled={busy} onClick={save}>
              {busy ? "Creating…" : "Create workspace →"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
