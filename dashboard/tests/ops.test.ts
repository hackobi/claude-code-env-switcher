import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("Olympus ops API stays local, token-gated, logged and unscheduled", async (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "social-engine-ops-"));
  // A temp root has no legacy marketing.db, so no real posts are imported. HOME keeps the token out of ~/.config.
  process.env.SOCIAL_ENGINE_ROOT = temp;
  process.env.SOCIAL_ENGINE_DATA = path.join(temp, "data");
  process.env.SOCIAL_ENGINE_TEST = "1";
  process.env.HOME = path.join(temp, "home");
  const { NextRequest } = await import("next/server");
  const { middleware } = await import("../middleware");
  const route = await import("../app/api/ops/c/[slug]/[...resource]/route");
  const { db } = await import("../engine/db");
  const { DATA } = await import("../engine/paths");
  const { migrateLegacy } = await import("../engine/migrate");
  const { client } = await import("../engine/clients");
  const { forClient } = await import("../engine/repository");
  const { saveCredential } = await import("../engine/credentials");
  const { ensureOpsToken, opsTokenFile } = await import("../engine/ops-token");
  const { ruleFile, ensureRuleFile, defaultRule } =
    await import("../engine/standing-rule");
  const { decisions, logDecision } = await import("../engine/decisions");
  const { assertUnscheduledDraft } = await import("../engine/publish");
  assert.ok(DATA.startsWith(temp) && opsTokenFile().startsWith(temp));

  const realFetch = globalThis.fetch;
  const calls: { url: string; init: RequestInit }[] = [];
  let reply: (url: string) => unknown = () => {
    throw new Error("Unexpected network call");
  };
  globalThis.fetch = (async (url: string | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(reply(String(url))), { status: 200 });
  }) as typeof fetch;

  migrateLegacy();
  const c = client("demos"),
    repo = forClient(c);
  let tick = 0;
  const post = (text: string, extra: object = {}) => {
    const d = repo.save({
      title: `Post ${++tick}`,
      variants: [{ platform: "x", text }],
      assetIds: [],
      notes: "",
      ...extra,
    });
    // Distinct creation times make "oldest first" deterministic.
    db.prepare("UPDATE content SET createdAt=? WHERE id=?").run(
      new Date(Date.UTC(2026, 0, 1, 0, 0, tick)).toISOString(),
      d.id,
    );
    return repo.get(d.id);
  };
  const token = ensureOpsToken();
  async function call(
    method: "GET" | "POST",
    resource: string,
    opts: { body?: unknown; auth?: string | null; host?: string } = {},
  ) {
    const headers = new Headers({ host: opts.host || "127.0.0.1:5175" });
    const auth = opts.auth === undefined ? `Bearer ${token}` : opts.auth;
    if (auth) headers.set("authorization", auth);
    if (opts.body !== undefined)
      headers.set("content-type", "application/json");
    const response = await route[method](
      new Request(`http://127.0.0.1:5175/api/ops/c/demos/${resource}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      }),
      {
        params: Promise.resolve({
          slug: "demos",
          resource: resource.split("/"),
        }),
      },
    );
    const text = await response.text();
    return {
      status: response.status,
      text,
      json: text && text.startsWith("{") ? JSON.parse(text) : null,
    };
  }
  const mw = (
    url: string,
    method = "GET",
    headers: Record<string, string> = {},
  ) =>
    middleware(
      new NextRequest(`http://127.0.0.1:5175${url}`, {
        method,
        headers: { host: "127.0.0.1:5175", ...headers },
      }),
    );
  const passed = (r: Response) => r.headers.get("x-middleware-next") === "1";

  await t.test("the token file is private and stable", () => {
    const file = opsTokenFile();
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal(fs.statSync(path.dirname(file)).mode & 0o777, 0o700);
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(ensureOpsToken(), token);
  });

  await t.test(
    "middleware gates /api/ops and leaves other rules as they were",
    async () => {
      const noToken = mw("/api/ops/c/demos/queue");
      assert.equal(noToken.status, 401);
      assert.equal(await noToken.text(), "");
      assert.equal(
        mw("/api/ops/c/demos/queue", "GET", { authorization: "Basic x" })
          .status,
        401,
      );
      // Bearer calls skip the same-origin check; the handler verifies the token.
      assert.ok(
        passed(
          mw("/api/ops/c/demos/approve", "POST", {
            authorization: `Bearer ${token}`,
          }),
        ),
      );
      assert.equal(
        mw("/api/ops/c/demos/queue", "GET", {
          host: "evil.example:5175",
          authorization: `Bearer ${token}`,
        }).status,
        403,
      );
      // Unchanged rules for everything else.
      const crossSite = mw("/api/c/demos/approve", "POST");
      assert.equal(crossSite.status, 403);
      assert.equal(await crossSite.text(), "Same-origin request required");
      assert.equal(
        mw("/api/c/demos/approve", "POST", { authorization: `Bearer ${token}` })
          .status,
        403,
      );
      assert.equal(
        mw("/api/c/demos/approve", "POST", { origin: "http://evil.example" })
          .status,
        403,
      );
      assert.ok(
        passed(
          mw("/api/c/demos/approve", "POST", {
            origin: "http://127.0.0.1:5175",
          }),
        ),
      );
      assert.ok(passed(mw("/api/c/demos/overview")));
      assert.ok(passed(mw("/api/clients")));
      assert.equal(mw("/api/content").status, 410);
      assert.equal(mw("/api/opsx").status, 410);
      assert.equal(mw("/", "GET", { host: "evil.example" }).status, 403);
      assert.equal(
        mw("/r/abc").headers.get("Cache-Control"),
        "private, no-store",
      );
    },
  );

  await t.test(
    "the handler requires the exact token from localhost",
    async () => {
      const d = post("Route auth fixture.");
      for (const auth of [
        null,
        "Bearer wrong-token-of-plausible-length-000000000000",
        `Bearer ${token}x`,
        `Basic ${token}`,
        token,
      ]) {
        const r = await call("POST", "approve", {
          auth,
          body: { id: d.id, hash: d.hash },
        });
        assert.equal(r.status, 401, String(auth));
        assert.equal(r.text, "");
      }
      assert.equal(
        (await call("GET", "queue", { host: "evil.example:5175" })).status,
        403,
      );
      assert.equal(
        (await call("GET", "queue", { host: "127.0.0.1.evil.example" })).status,
        403,
      );
      assert.equal(repo.get(d.id).status, "needs_review");
      assert.equal(decisions().length, 0);
      // A token file others can read fails closed.
      fs.chmodSync(opsTokenFile(), 0o644);
      assert.equal((await call("GET", "queue")).status, 401);
      fs.chmodSync(opsTokenFile(), 0o600);
      assert.equal((await call("GET", "queue")).status, 200);
      repo.reject(d.id);
    },
  );

  const approved = post("A precise update for developers.");
  await t.test("approve requires the current hash and is logged", async () => {
    const stale = await call("POST", "approve", {
      body: { id: approved.id, hash: "0".repeat(64) },
    });
    assert.equal(stale.status, 400);
    assert.match(stale.json.error, /changed/);
    assert.equal(repo.get(approved.id).status, "needs_review");
    const ok = await call("POST", "approve", {
      body: { id: approved.id, hash: approved.hash },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.item.status, "approved");
    const log = decisions();
    assert.deepEqual(
      log.map((l) => [l.actor, l.action, l.contentId, l.result]),
      [
        ["jay via olympus", "approve", approved.id, "error"],
        ["jay via olympus", "approve", approved.id, "ok"],
      ],
    );
    assert.match(log[0].reasons![0], /changed/);
    assert.equal(
      fs.statSync(path.join(DATA, "approval-decisions.jsonl")).mode & 0o777,
      0o600,
    );
  });

  await t.test(
    "reject requires the current hash and records the reason",
    async () => {
      const d = post("A post Jay will reject.");
      const stale = await call("POST", "reject", {
        body: { id: d.id, hash: approved.hash },
      });
      assert.equal(stale.status, 400);
      assert.equal(repo.get(d.id).status, "needs_review");
      const ok = await call("POST", "reject", {
        body: { id: d.id, hash: d.hash, reason: "Off brand" },
      });
      assert.equal(ok.json.item.status, "rejected");
      const last = decisions().at(-1)!;
      assert.deepEqual(
        [last.action, last.result, last.reasons],
        ["reject", "ok", ["Off brand"]],
      );
    },
  );

  await t.test(
    "queue lists reviewable items oldest first with gate issues",
    async () => {
      const long = post("x".repeat(300));
      const q = await call("GET", "queue");
      assert.deepEqual(
        q.json.items.map((i: { id: string }) => i.id),
        [approved.id, long.id],
      );
      assert.deepEqual(q.json.counts, {
        approved: 1,
        needs_review: 1,
        rejected: 2,
      });
      const item = q.json.items[1];
      assert.deepEqual(Object.keys(item).sort(), [
        "assetIds",
        "createdAt",
        "gateIssues",
        "hash",
        "id",
        "status",
        "title",
        "variants",
      ]);
      assert.deepEqual(item.variants, [
        { platform: "x", text: "x".repeat(300) },
      ]);
      assert.ok(item.gateIssues.includes("x exceeds 280 characters"));
      repo.reject(long.id);
    },
  );

  await t.test(
    "handoff creates only an unscheduled Typefully draft",
    async () => {
      saveCredential(c, "typefully", "test-typefully-key");
      db.prepare("INSERT INTO connections VALUES(?,?,?,?,?)").run(
        c.id,
        "typefully",
        "x",
        "set-1",
        "Test set",
      );
      const withWhen = await call("POST", "handoff", {
        body: {
          id: approved.id,
          hash: approved.hash,
          when: "2026-12-01T10:00:00Z",
        },
      });
      assert.equal(withWhen.status, 400);
      assert.equal(calls.length, 0);
      assert.equal(repo.get(approved.id).status, "approved");

      reply = (url) => {
        assert.ok(url.endsWith("/social-sets/set-1/drafts"), url);
        return {
          id: 4242,
          status: "draft",
          scheduled_date: null,
          published_at: null,
        };
      };
      const ok = await call("POST", "handoff", {
        body: { id: approved.id, hash: approved.hash },
      });
      assert.equal(ok.status, 200, ok.text);
      assert.equal(ok.json.item.status, "handed_off");
      assert.equal(ok.json.scheduledFor, null);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].init.method, "POST");
      assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
        platforms: {
          x: { enabled: true, posts: [{ text: approved.variants[0].text }] },
        },
      });
      const stored = repo.get(approved.id);
      assert.deepEqual(
        [stored.status, stored.scheduledFor, stored.externalId],
        ["handed_off", null, "4242"],
      );
      assert.deepEqual(
        [decisions().at(-1)!.action, decisions().at(-1)!.result],
        ["handoff", "ok"],
      );

      // Unless Typefully confirms an unscheduled draft, the outcome is surfaced, never reported as success.
      for (const response of [
        { id: 4243, status: "scheduled", scheduled_date: null },
        { id: 4244, status: "draft", scheduled_date: "2026-11-01T10:00:00Z" },
        { id: 4245, status: "draft", published_at: "2026-10-01T10:00:00Z" },
        { id: 4246 },
      ]) {
        const next = post(`Approved update ${response.id}.`);
        assert.equal((await approve(next)).status, 200);
        reply = () => response;
        const refused = await call("POST", "handoff", {
          body: { id: next.id, hash: next.hash },
        });
        assert.equal(refused.status, 400, JSON.stringify(response));
        assert.match(refused.json.error, /unscheduled draft/);
        assert.equal(repo.get(next.id).status, "delivery_unknown");
        assert.deepEqual(
          [decisions().at(-1)!.action, decisions().at(-1)!.result],
          ["handoff", "error"],
        );
      }

      const plain = {
        platforms: {
          x: { enabled: true, posts: [{ text: "Hi", media_ids: ["m"] }] },
        },
      };
      assertUnscheduledDraft(plain);
      for (const bad of [
        { ...plain, publish_at: "next-free-slot" },
        {
          platforms: {
            x: { enabled: true, posts: [{ text: "Hi" }], publish_at: "now" },
          },
        },
        {
          platforms: {
            x: {
              enabled: true,
              posts: [{ text: "Hi", scheduled_date: "2026-12-01" }],
            },
          },
        },
        { platforms: { x: { enabled: true, posts: "Hi" } } },
        { platforms: { mastodon: { enabled: true, posts: [] } } },
      ])
        assert.throws(() => assertUnscheduledDraft(bad), /unscheduled draft/);
      reply = () => {
        throw new Error("Unexpected network call");
      };
    },
  );
  function approve(d: { id: string; hash: string }) {
    return call("POST", "approve", { body: { id: d.id, hash: d.hash } });
  }

  await t.test("the standing rule applies nothing unless active", async () => {
    const candidate = post("Shipping identity docs for developers.");
    const writeRule = (rule: object, mode = 0o600) => {
      fs.rmSync(ruleFile(), { force: true });
      fs.writeFileSync(ruleFile(), JSON.stringify(rule), { mode });
      fs.chmodSync(ruleFile(), mode);
    };
    const future = "2099-01-01T00:00:00Z";
    const cases: [string, () => void][] = [
      ["missing", () => fs.rmSync(ruleFile(), { force: true })],
      ["missing", () => fs.writeFileSync(ruleFile(), "{ not json")],
      [
        "missing",
        () =>
          writeRule({
            ...defaultRule,
            active: true,
            expires_at: future,
            extra: 1,
          }),
      ],
      [
        "missing",
        () =>
          writeRule(
            { ...defaultRule, active: true, expires_at: future },
            0o666,
          ),
      ],
      ["inactive", () => writeRule({ ...defaultRule, expires_at: future })],
      [
        "expired",
        () =>
          writeRule({
            ...defaultRule,
            active: true,
            expires_at: "2020-01-01T00:00:00Z",
          }),
      ],
      [
        "revoked",
        () =>
          writeRule({
            ...defaultRule,
            active: true,
            revoked: true,
            expires_at: future,
          }),
      ],
    ];
    for (const [state, setup] of cases) {
      setup();
      const rule = await call("GET", "rule");
      assert.equal(rule.json.state, state, JSON.stringify(rule.json));
      const applied = await call("POST", "rule/apply", {
        body: { ruleVersion: 1 },
      });
      assert.equal(applied.status, 400);
      assert.match(applied.json.error, /nothing was applied/);
    }
    // The shipped default is inactive, owned by Jay, Demos X only and expires on 15 November 2026.
    fs.rmSync(ruleFile(), { force: true });
    ensureRuleFile();
    assert.equal(fs.statSync(ruleFile()).mode & 0o777, 0o600);
    const shipped = JSON.parse(fs.readFileSync(ruleFile(), "utf8"));
    assert.deepEqual(
      [
        shipped.active,
        shipped.revoked,
        shipped.owner,
        shipped.client,
        shipped.platforms,
        shipped.max_per_day,
        shipped.expires_at,
      ],
      [false, false, "Jay", "demos", ["x"], 3, "2026-11-15T23:59:59Z"],
    );
    writeRule({ ...defaultRule, active: true, expires_at: future });
    const wrongVersion = await call("POST", "rule/apply", {
      body: { ruleVersion: 2 },
    });
    assert.equal(wrongVersion.status, 400);
    assert.equal(repo.get(candidate.id).status, "needs_review");
    assert.equal(
      decisions().filter((d) => d.actor.startsWith("standing-rule")).length,
      0,
    );
    repo.reject(candidate.id);
  });

  await t.test(
    "an active rule approves only passing items, up to max_per_day, and never hands off",
    async () => {
      fs.writeFileSync(
        ruleFile(),
        JSON.stringify({
          ...defaultRule,
          active: true,
          expires_at: "2099-01-01T00:00:00Z",
        }),
        { mode: 0o600 },
      );
      repo.addAsset({
        id: "asset-1",
        clientId: c.id,
        name: "Photo",
        path: "/unused",
        mime: "image/png",
        sha: "test",
        kind: "graphic",
        ai: false,
        alcohol: false,
        consent: true,
        sourceId: null,
        createdAt: new Date().toISOString(),
      });
      const clean = [1, 2, 3].map((n) =>
        post(`Developer guide part ${n}: identity across chains.`),
      );
      const tge = post("Get ready for the tge next week.");
      const date = post("Mark November 15 in your calendar.");
      const wide = post("Cross-posted note.", {
        variants: [
          { platform: "x", text: "Cross-posted note." },
          { platform: "threads", text: "Cross-posted note." },
        ],
      });
      const media = post("A photo from the workshop.", {
        assetIds: ["asset-1"],
      });
      const long = post("y".repeat(300));
      // One rule approval already logged today and one from yesterday: only today's counts.
      logDecision({
        actor: "standing-rule v1",
        action: "approve",
        contentId: "earlier",
        hash: "h",
        ruleVersion: 1,
        result: "ok",
      });
      fs.appendFileSync(
        path.join(DATA, "approval-decisions.jsonl"),
        `${JSON.stringify({ at: new Date(Date.now() - 86400000).toISOString(), actor: "standing-rule v1", action: "approve", contentId: "old", hash: "h", ruleVersion: 1, result: "ok" })}\n`,
      );
      const preview = await call("GET", "rule");
      assert.equal(preview.json.state, "active");
      assert.equal(preview.json.approvedToday, 1);
      assert.deepEqual(
        preview.json.dryRun.map((r: { id: string; pass: boolean }) => [
          r.id,
          r.pass,
        ]),
        [
          [clean[0].id, true],
          [clean[1].id, true],
          [clean[2].id, false],
          [tge.id, false],
          [date.id, false],
          [wide.id, false],
          [media.id, false],
          [long.id, false],
        ],
      );
      const before = calls.length;
      const applied = await call("POST", "rule/apply", {
        body: { ruleVersion: 1 },
      });
      assert.equal(applied.status, 200, applied.text);
      const results = Object.fromEntries(
        applied.json.results.map(
          (r: { id: string; result: string; reasons: string[] }) => [r.id, r],
        ),
      );
      assert.equal(results[clean[0].id].result, "approved");
      assert.equal(results[clean[1].id].result, "approved");
      assert.deepEqual(results[clean[2].id].reasons, [
        "Daily limit of 3 reached",
      ]);
      assert.match(
        results[tge.id].reasons.join(),
        /prohibited pattern \/TGE\/i/,
      );
      assert.match(results[date.id].reasons.join(), /prohibited pattern/);
      assert.match(results[wide.id].reasons.join(), /threads is outside/);
      assert.match(results[media.id].reasons.join(), /Media attachments/);
      assert.match(results[long.id].reasons.join(), /exceeds 280/);
      assert.equal(applied.json.approvedToday, 3);
      assert.equal(calls.length, before);
      assert.deepEqual(
        [clean[0], clean[1], clean[2], tge].map((d) => repo.get(d.id).status),
        ["approved", "approved", "needs_review", "needs_review"],
      );
      const ruleLines = decisions().filter(
        (d) =>
          d.actor === "standing-rule v1" &&
          d.contentId !== "earlier" &&
          d.contentId !== "old",
      );
      assert.deepEqual(
        ruleLines.map((d) => [d.contentId, d.action, d.ruleVersion, d.result]),
        [
          [clean[0].id, "approve", 1, "ok"],
          [clean[1].id, "approve", 1, "ok"],
        ],
      );
      const again = await call("POST", "rule/apply", {
        body: { ruleVersion: 1 },
      });
      assert.ok(
        again.json.results.every(
          (r: { result: string }) => r.result === "skipped",
        ),
      );
      assert.equal(repo.get(clean[2].id).status, "needs_review");
    },
  );

  globalThis.fetch = realFetch;
  db.close();
  fs.rmSync(temp, { recursive: true, force: true });
});
