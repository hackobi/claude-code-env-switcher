# Implementation record — 2026-09-13

## Decisions from Jay

Use the recovered project from the nested upstream folder. Keep current API keys until they are tested and remind Jay to rotate afterward. Accept the proposed default publishing and approval choices and default Anthropic API billing, with optional provider/client keys and per-client accounting. Collect restaurant specifics through reusable in-app onboarding. Demos is a technology client; restaurant profiles and content must never be merged into its context. No public posts or messages were authorized in this build.

## Recovery

Upstream `hackobi/claude-code-env-switcher`, sparse clone HEAD `a8add06a657b786213e67bb4d1a8cc611c4409ca`; relevant Typefully v2 commit `dca4d70a8dc57b68205a05a56e6132e204e63bcf` (2026-02-08). Missing source restored from the nested project, existing differing local files preserved. Manifest: `source-recovery-2026-09-13.json`. Local recovery baseline: `5c4ca06`; implementation branch: `feat/client-workspaces`. No upstream push.

Read-only migration imported 1,809 tweets, 29 drafts and six inline PNGs into Demos's own workspace. Expired remote image URLs were not fetched. Original database, generated images and `.env` retained. Temporary test clients and the test Typefully draft were removed after validation. Receipts and a pre-cleanup backup remain under ignored `data/`.

## Delivered local application

See `SOCIAL_ENGINE.md` for the exact supported workflow, startup/stop commands, validation and explicit remaining work. The Next.js app uses client-scoped APIs and a local SQLite repository. The legacy unscoped dashboard API is disabled by middleware. Typefully social set 220008 was explicitly assigned to Demos X; other channels need explicit assignment. No restaurant was fabricated or preconfigured with Demos context.

A single durable worker owns queued generation, monthly reservations, source ingestion, status polling and daily local backup. Unknown paid-call/publishing outcomes require reconciliation. Restaurant publication requires operator and owner approvals against the current content/media hash; changes revoke pending approval. Handed-off approval history is retained.

## Validation evidence

`data/api-validation.json`, `data/generation-smoke.json`, `data/typefully-smoke.json`, `data/onboarding-smoke.json`, and `data/validation-2026-09-13/`. Fourteen offline checks passed. The build passed before runtime checks and was repeated after the final fixes. Compatible dependency patches include Next 15.5.25, Sharp 0.35.4 and PostCSS/nanoid overrides; npm audit reported zero vulnerabilities. No public posts or owner messages were sent. Credentials were not changed.

Free source smoke: 10 Google national trends, 20 NRK headlines, two future Norway public holidays and one MET observation; no adapter warnings. Headlines/links only are retained for RSS. These are Oslo/Norway defaults, not a global trend service.

The prior blueprint is a roadmap, not a completion report. In particular, public review hosting, Zernio live validation, paid ads, Instagram trend scanning, vision/judge stages, complete analytics, automatic batch media and config snapshots remain open. No claim of restaurant go-live or legal approval has been made.

## Sources checked during implementation

- Typefully v2: https://typefully.com/docs/api and recovered v2 adapter; live unscheduled draft/media test.
- Zernio: https://docs.zernio.com/quickstart and API docs for media presign, accounts/profiles, connect and posts. Upload uses presigned PUT; the application does not need a public media origin. Past scheduled timestamps may publish immediately, so lead time is checked again after media upload.
- Anthropic Messages SDK and pricing: https://docs.anthropic.com/en/api/messages and https://docs.anthropic.com/en/docs/about-claude/pricing ; installed SDK types and live Sonnet 4.6 call.
- Higgsfield CLI 1.1.24 model schemas, account status, cost quote and live GPT Image 2 image result.

Reminder ID: `rotate-marketing-api-keys-after-validation`, daily at 10:00 in this task; stays quiet while validation is incomplete and does not rotate credentials itself.
