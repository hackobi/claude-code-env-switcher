import { Workspace } from "../../studio/Workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <Workspace key={slug} slug={slug} />;
}
