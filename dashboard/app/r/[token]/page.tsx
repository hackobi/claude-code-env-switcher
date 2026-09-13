import { resolveReview } from "../../../engine/approvals";
import { forClient } from "../../../engine/repository";
import { gate } from "../../../engine/policy";
import { ReviewButtons } from "../../studio/ReviewButtons";
export const dynamic = "force-dynamic";
export default async function Review({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  try {
    const { client: c, draft: d } = resolveReview(token),
      assets = d.assetIds.map((id) => forClient(c).asset(id)),
      issues = gate(c, d);
    return (
      <main className="onboarding">
        <span className="eyebrow">{c.name} · Godkjenning</span>
        <h1>{d.title}</h1>
        <p className="muted">
          Se gjennom alle tekster og bilder før du godkjenner.
        </p>
        {assets.map((a) => (
          <div key={a.id} className="review-media">
            {a.kind === "video" ? (
              <video controls src={`/r/${token}/media/${a.id}`} />
            ) : (
              <img alt={a.name} src={`/r/${token}/media/${a.id}`} />
            )}
          </div>
        ))}
        {d.variants.map((v) => (
          <section key={v.platform} className="panel">
            <span className="eyebrow">{v.platform}</span>
            <p className="caption">{v.text}</p>
          </section>
        ))}
        {issues.length > 0 && (
          <div className="notice">Må avklares: {issues.join("; ")}</div>
        )}
        <ReviewButtons token={token} blocked={!!issues.length} />
      </main>
    );
  } catch (e) {
    return (
      <main className="onboarding">
        <h1>Lenken er ikke tilgjengelig</h1>
        <p>{(e as Error).message}</p>
      </main>
    );
  }
}
