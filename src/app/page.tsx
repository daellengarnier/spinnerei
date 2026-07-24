import Link from "next/link";
import { alleAnlaesse } from "@/lib/db/queries";
import { datumTeile, istVorbei } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const anlaesse = await alleAnlaesse();
  const kommende = anlaesse.filter((a) => !istVorbei(a.datum));
  const vergangene = anlaesse.filter((a) => istVorbei(a.datum)).reverse();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Spinnerei
        </h1>
        <p className="mt-2 text-neutral-400">
          Anlässe organisieren — Aufgaben, Schichten &amp; Infos.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Kommende Anlässe
        </h2>
        {kommende.length === 0 ? (
          <p className="text-neutral-400">Keine kommenden Anlässe.</p>
        ) : (
          <ul className="space-y-3">
            {kommende.map((anlass) => (
              <li key={anlass.id}>
                <AnlassKarte anlass={anlass} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {vergangene.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Vergangene Anlässe
          </h2>
          <ul className="space-y-3 opacity-60">
            {vergangene.map((anlass) => (
              <li key={anlass.id}>
                <AnlassKarte anlass={anlass} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function AnlassKarte({
  anlass,
}: {
  anlass: { slug: string; name: string; datum: string };
}) {
  const { wochentag, tag, monat } = datumTeile(anlass.datum);
  return (
    <Link
      href={`/anlass/${anlass.slug}`}
      className="group flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-amber-400/50 hover:bg-neutral-800/80"
    >
      <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-neutral-950 py-2">
        <span className="text-xs text-neutral-500">{wochentag}</span>
        <span className="text-2xl font-bold text-amber-400">{tag}</span>
        <span className="text-xs uppercase text-neutral-400">{monat}</span>
      </div>
      <span className="flex-1 text-lg font-medium">{anlass.name}</span>
      <span
        aria-hidden
        className="text-neutral-600 transition group-hover:translate-x-1 group-hover:text-amber-400"
      >
        →
      </span>
    </Link>
  );
}
