import Link from "next/link";
import { notFound } from "next/navigation";
import { anlassBySlug } from "@/lib/db/queries";
import { formatDatumLang } from "@/lib/format";
import { TabNav } from "./tab-nav";

export const dynamic = "force-dynamic";

export default async function AnlassLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anlass = await anlassBySlug(slug);
  if (!anlass) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <Link
        href="/"
        className="text-sm text-neutral-400 transition hover:text-amber-400"
      >
        ← Alle Anlässe
      </Link>
      <header className="mb-6 mt-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {anlass.name}
        </h1>
        <p className="mt-1 text-neutral-400">{formatDatumLang(anlass.datum)}</p>
      </header>
      <TabNav slug={slug} />
      <div className="pt-6">{children}</div>
    </main>
  );
}
