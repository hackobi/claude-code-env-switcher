# Social Engine

The local app extends the recovered Demos project with separate client workspaces. Open **http://127.0.0.1:5175** and use **Add client**. Select **Restaurant**, **Technology**, or **Other business**; each workspace has its own brand instructions, sources, drafts, media, approval records, accounts, and usage ledger.

The original Demos pipeline is retained in `src/`. The upstream project lives inside `hackobi/claude-code-env-switcher/demos-marketing-intelligence`; it was never a separate upstream repository.

## Everyday use

1. Complete the four onboarding steps. Restaurant setup asks for the menu, address, hours, bookings, events, photo permissions, and owner/approval details. Incomplete profiles can be saved and finished in Settings. Onboarding progress survives a page reload in the same browser tab.
2. In Settings, connect the client's publishing accounts and choose the exact account for each channel. Demos uses Typefully. Instagram and Facebook use Zernio. One publishing account cannot belong to different clients, even on different channels.
3. Upload the client's photos in Media. Generate a photo/headline graphic, a story-sized graphic, a Higgsfield image, or a five-second reference-image video. Restaurant generation requires a cleared real reference photo. Review the result before use.
4. Add the weekly brief and generate drafts. Choose media for each draft, edit captions, and approve the package. Each package can contain platform-specific captions. Any edit invalidates pending approvals.
5. Restaurant packages also require owner approval through the exact-version review page. Share the review link yourself. Demos packages become unscheduled Typefully drafts, keeping the final publishing decision there. Restaurant packages can be scheduled at least three hours ahead once both approvals and account connections are present.
6. Enable a weekly/daily routine in Settings when the profile and sources are ready. It prepares text drafts within the client's allowance. Media selection, creative generation and publishing handoff remain operator actions in this first version.

Text generation defaults to the existing shared Anthropic API key and Sonnet 4.6. Settings supports OpenAI, another model, custom billing rates, and encrypted per-client API keys. This is API billing, not a Claude subscription allowance. USD estimates and Higgsfield credits are kept separately. Subscription fees and RapidAPI plan charges are not apportioned automatically; Apify calls retain their maximum charge as a conservative estimate.

## Run and maintain

Requires Node 22, the authenticated Higgsfield CLI, and dashboard dependencies:

```sh
npm --prefix dashboard ci
npm --prefix dashboard rebuild better-sqlite3
npm run app:build
npm run app:background
```

`app:background` installs a macOS LaunchAgent for this app, bound to loopback on port 5175, with automatic restart. It loads the root `.env` without changing it. To stop the app and disable background startup:

```sh
npm run app:stop
```

For foreground development, stop the background service first, then `npm run app`. For a foreground production run, use `npm run app:start`. After moving the project or changing the Node installation, build and reinstall the service. Do not run two instances against the same data directory.

Runtime data is in `data/social-engine/engine.db`; media and encrypted credentials live beside it. The original `data/marketing.db` stays intact. Daily local backups retain seven dated copies of the database, credential encryption key, and media. These protect against application mistakes, not loss of the Mac; include the directory in your normal machine backup. Logs: `data/social-engine/service.log`.

Interrupted paid jobs are marked for reconciliation instead of automatically replayed. A publishing request with an uncertain remote outcome becomes `delivery_unknown`; inspect the publishing service before retrying. The worker polls publishing status every 15 minutes. A sleeping/offline Mac resumes work when available; the vendor holds posts already scheduled there.

## Owner review hosting

Review links work locally now. Remote owner access needs a configured HTTPS hostname and a tunnel/reverse proxy. Set `REVIEW_BASE_URL` in the root environment to that hostname after configuring it. The hostname must route **only `/r/*` and the necessary `/_next/static/*` assets** to the app; everything else must return 404. Preserve the original Host header. Do not expose the operator workspace or client API. Tokens expire after 48 hours, are bound to the reviewed content and media, and can be used once. They are not emailed or messaged automatically.

No public review hostname was provisioned in this build. The existing Cloudflare configuration for unrelated services was left intact. Telegram review delivery remains a follow-up.

## Validation and current limits

Passed on 2026-09-13:

- Fourteen offline checks covering tenant boundaries, media ownership, approval invalidation/history, account assignment, budget isolation and worker exclusivity.
- Production build and TypeScript checks; dependency audit: zero reported vulnerabilities after compatible patches.
- Browser restaurant onboarding, independent empty workspace, default Bokmål/IG/FB settings, and owner approval.
- Live Anthropic generation: three drafts, estimated USD 0.007341.
- Live Higgsfield image: 0.5 credits; downloaded and attributed to the correct client. Norwegian æ/ø/å overlay visually checked.
- Live Typefully media upload and unscheduled draft; status `draft` on read-back. The temporary test draft was deleted, with no public post.
- Read-only auth checks for existing Anthropic, OpenAI, RapidAPI, Linear and Typefully credentials.
- Google Trends NO RSS, NRK Stor-Oslo RSS, Nager Norway holidays and MET Oslo weather ingestion.

Not yet live-validated: Zernio Instagram/Facebook scheduling and account connection, Higgsfield video generation, OpenAI text generation, and remote owner review hosting. A standalone GitHub API token is not configured. The original Linear/GitHub adapters remain in the recovered pipeline; they are not yet wired into the new client source picker.

Instagram trend scanning, performance analytics, paid ad campaign management, automatic media assignment/creation in weekly batches, vision/judge stages, automated owner reminders, and the cross-client inbox remain follow-ups. Story-sized graphics can be created and downloaded; automated Story publishing is not implemented. The app uses validated SQLite client profiles; config-as-code exports and profile snapshots from the earlier design are not implemented yet.

Existing credentials have **not** been rotated. The task reminder checks for completed validation and will remind Jay to rotate and re-test them. No secrets or runtime databases should be pushed with the source.
