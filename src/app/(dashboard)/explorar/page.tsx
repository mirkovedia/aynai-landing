import { redirect } from "next/navigation";

/** /explorar quedó absorbido por el feed abierto. Redirige preservando los filtros. */
export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; loc?: string; avail?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.kind) qs.set("kind", params.kind);
  if (params.loc) qs.set("loc", params.loc);
  if (params.avail) qs.set("avail", params.avail);
  const query = qs.toString();
  redirect(query ? `/marketplace?${query}` : "/marketplace");
}
