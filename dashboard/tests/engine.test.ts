import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("client workspaces enforce ownership through content, context, billing and approvals", async (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "social-engine-tests-"));
  process.env.SOCIAL_ENGINE_DATA = temp;
  process.env.SOCIAL_ENGINE_TEST = "1";
  const { db } = await import("../engine/db");
  const { createClient, updateClient, profileOf } =
    await import("../engine/clients");
  const { forClient } = await import("../engine/repository");
  const { approve, reviewLink, decideReview, resolveReview } =
    await import("../engine/approvals");
  const { generationContext } = await import("../engine/generate");
  const { reserve, settle, usage } = await import("../engine/usage");
  const { saveCredential, credential, credentialStatus } =
    await import("../engine/credentials");
  const { bind, connections } = await import("../engine/connections");
  const { publicationCheck } = await import("../engine/publish");
  const { enqueue, claim } = await import("../engine/jobs");
  const common = {
    description: "Real business",
    audience: "Local customers",
    facts: "Only verified details",
    channels: ["facebook"],
    sources: ["brief"],
  };
  const a = createClient({
    ...common,
    name: "Technology client",
    slug: "tech",
    industry: "technology",
    channels: ["x"],
    facts: "TECH_ONLY_IDENTITY_42",
  });
  const b = createClient({
    ...common,
    name: "Restaurant client",
    slug: "restaurant",
    industry: "restaurant",
    restaurant: {
      address: "Oslo",
      menu: "Soup 100 NOK",
      alcohol: true,
      licenceHolder: "Owner",
    },
    approver: { name: "Owner", email: "owner@example.com" },
    facts: "FOOD_ONLY_MENU_84",
  });
  const input = {
    title: "This week",
    variants: [{ platform: "x", text: "A precise update for developers." }],
    assetIds: [],
    notes: "",
  };
  const d = forClient(a).save(input);
  const food = forClient(b).save({
    ...input,
    variants: [{ platform: "facebook", text: "A bowl of soup in Oslo." }],
  });
  await t.test(
    "read and write queries reject content from a different client",
    () => {
      assert.throws(() => forClient(b).get(d.id), /not found/);
      assert.throws(
        () =>
          forClient(b).save(
            {
              ...input,
              variants: [{ platform: "facebook", text: "Overwrite" }],
            },
            d.id,
          ),
        /not found/,
      );
      assert.equal(
        forClient(a).get(d.id).variants[0].text,
        input.variants[0].text,
      );
    },
  );
  await t.test("generation has only the selected client context", () => {
    forClient(a).addSignal({
      source: "brief",
      title: "Tech source",
      text: "SECRET_TECH_SIGNAL",
      url: "",
    });
    const context = JSON.stringify(generationContext(b, "Lunch service"));
    assert.match(context, /FOOD_ONLY_MENU_84/);
    assert.doesNotMatch(context, /TECH_ONLY|SECRET_TECH|blockchain|Demos/);
  });
  await t.test("foreign media cannot be attached or read", () => {
    forClient(a).addAsset({
      id: "asset-a",
      clientId: a.id,
      name: "Tech",
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
    assert.throws(() => forClient(b).asset("asset-a"), /not found/);
    assert.throws(
      () =>
        forClient(b).save({
          ...input,
          variants: [{ platform: "facebook", text: "Photo" }],
          assetIds: ["asset-a"],
        }),
      /not found/,
    );
  });
  await t.test(
    "restaurant needs both approvals and owner links cannot be reused",
    () => {
      const one = approve(b, food.id, "operator", food.hash);
      assert.equal(one.status, "needs_review");
      const token = reviewLink(b, food.id);
      decideReview(token, "approve");
      assert.equal(forClient(b).get(food.id).status, "approved");
      assert.throws(() => resolveReview(token), /already used/);
    },
  );
  await t.test(
    "editing any variant revokes previous approval and review tokens",
    () => {
      const token = reviewLink(b, food.id);
      const edited = forClient(b).save(
        {
          title: food.title,
          variants: [{ platform: "facebook", text: "Changed menu" }],
          assetIds: [],
          notes: "",
        },
        food.id,
      );
      assert.equal(edited.status, "needs_review");
      assert.deepEqual(edited.approvals, []);
      assert.notEqual(edited.hash, food.hash);
      assert.throws(() => approve(b, food.id, "owner", food.hash), /changed/);
      assert.throws(() => resolveReview(token), /expired/);
    },
  );
  await t.test("profile changes invalidate pending approvals", () => {
    approve(a, d.id, "operator", d.hash);
    updateClient(a, { ...profileOf(a), voice: "New voice" });
    assert.equal(forClient(a).get(d.id).status, "needs_review");
    assert.deepEqual(forClient(a).get(d.id).approvals, []);
  });
  await t.test("usage and budgets stay within a client", () => {
    const id = reserve(a, "anthropic", a.llm.model, 1);
    settle(a, id, 100, 50, 0.01);
    assert.equal(usage(a).length, 1);
    assert.equal(usage(b).length, 0);
    assert.throws(() => reserve(a, "anthropic", a.llm.model, 30), /budget/);
  });
  await t.test(
    "credentials are encrypted and never included in status responses",
    () => {
      saveCredential(a, "anthropic", "a-secret-test-key-123");
      saveCredential(b, "anthropic", "b-secret-test-key-456");
      assert.equal(credential(a, "anthropic"), "a-secret-test-key-123");
      assert.equal(credential(b, "anthropic"), "b-secret-test-key-456");
      const row = db
        .prepare("SELECT sealed FROM credentials WHERE clientId=?")
        .get(a.id) as { sealed: string };
      assert.ok(!row.sealed.includes("a-secret"));
      assert.ok(!JSON.stringify(credentialStatus(a)).includes("a-secret"));
    },
  );
  await t.test(
    "one publishing account cannot be assigned across clients",
    async () => {
      const old = globalThis.fetch;
      process.env.TYPEFULLY_API_KEY = "test-secret";
      saveCredential(a, "typefully", "test-secret");
      saveCredential(b, "typefully", "test-secret");
      const other = createClient({
        ...common,
        name: "Another technology",
        slug: "another-tech",
        industry: "technology",
        channels: ["x", "threads"],
      });
      saveCredential(other, "typefully", "test-secret");
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({ results: [{ id: 123, name: "Test account" }] }),
          { status: 200 },
        );
      try {
        await bind(a, "typefully", "x", "123");
        await assert.rejects(
          () => bind(other, "typefully", "x", "123"),
          /another client/,
        );
        await assert.rejects(
          () => bind(other, "typefully", "threads", "123"),
          /another client/,
        );
        assert.equal(connections(other).length, 0);
      } finally {
        globalThis.fetch = old;
      }
    },
  );
  await t.test(
    "publication cannot bypass approval and rejects a past schedule",
    () => {
      assert.throws(
        () => publicationCheck(a, forClient(a).get(d.id)),
        /approvals/,
      );
      const current = forClient(b).get(food.id);
      approve(b, current.id, "operator", current.hash);
      approve(b, current.id, "owner", current.hash);
      db.prepare("INSERT INTO connections VALUES(?,?,?,?,?)").run(
        b.id,
        "zernio",
        "facebook",
        "test-page",
        "Test Page",
      );
      assert.throws(
        () =>
          publicationCheck(
            b,
            forClient(b).get(food.id),
            "2020-01-01T00:00:00Z",
          ),
        /three hours/,
      );
    },
  );
  await t.test(
    "jobs preserve tenant ownership and duplicate runs are rejected",
    () => {
      enqueue(a, "generate", { brief: "Test" });
      assert.throws(
        () => enqueue(a, "generate", { brief: "Again" }),
        /already/,
      );
      enqueue(b, "generate", { brief: "Restaurant" });
      const first = claim(),
        second = claim();
      assert.ok(first && second);
      assert.notEqual(first.clientId, second.clientId);
      assert.equal(claim(), undefined);
    },
  );
  await t.test(
    "a second worker cannot reconcile requests owned by a live worker",
    async () => {
      const { acquireWorker } = await import("../engine/worker-lock");
      const release = acquireWorker();
      assert.throws(() => acquireWorker(), /already running/);
      release();
      acquireWorker()();
    },
  );
  await t.test(
    "handoff keeps approval history and closes stale review capabilities",
    () => {
      const current = forClient(b).get(food.id),
        token = reviewLink(b, food.id);
      db.prepare("UPDATE content SET status='dispatching' WHERE id=?").run(
        food.id,
      );
      assert.throws(() => updateClient(b, profileOf(b)), /handoff/);
      db.prepare("UPDATE content SET status='scheduled' WHERE id=?").run(
        food.id,
      );
      assert.throws(() => resolveReview(token), /no longer/);
      updateClient(b, profileOf(b));
      assert.equal(
        forClient(b).get(food.id).approvals.length,
        current.approvals.length,
      );
    },
  );
  db.close();
  fs.rmSync(temp, { recursive: true, force: true });
});
