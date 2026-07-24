import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  aufgabeErstellen,
  aufgabeLoeschen,
  aufgabeUmschalten,
} from "@/lib/actions";
import { getDb } from "@/lib/db/client";
import { anlassBySlug } from "@/lib/db/queries";
import { aufgaben } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AufgabenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anlass = await anlassBySlug(slug);
  if (!anlass) notFound();

  const liste = await getDb()
    .select()
    .from(aufgaben)
    .where(eq(aufgaben.anlassId, anlass.id))
    .orderBy(aufgaben.createdAt);

  const offen = liste.filter((a) => !a.erledigt);
  const erledigt = liste.filter((a) => a.erledigt);

  return (
    <div className="space-y-8">
      <form
        action={aufgabeErstellen}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input type="hidden" name="anlassId" value={anlass.id} />
        <input type="hidden" name="slug" value={slug} />
        <input
          name="titel"
          required
          placeholder="Neue Aufgabe …"
          className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none"
        />
        <input
          name="zustaendig"
          placeholder="Zuständig (optional)"
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none sm:w-44"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300"
        >
          Hinzufügen
        </button>
      </form>

      {liste.length === 0 && (
        <p className="text-neutral-400">Noch keine Aufgaben erfasst.</p>
      )}

      {offen.length > 0 && (
        <ul className="space-y-2">
          {offen.map((aufgabe) => (
            <AufgabenZeile key={aufgabe.id} aufgabe={aufgabe} slug={slug} />
          ))}
        </ul>
      )}

      {erledigt.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Erledigt
          </h2>
          <ul className="space-y-2 opacity-60">
            {erledigt.map((aufgabe) => (
              <AufgabenZeile key={aufgabe.id} aufgabe={aufgabe} slug={slug} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AufgabenZeile({
  aufgabe,
  slug,
}: {
  aufgabe: {
    id: number;
    titel: string;
    zustaendig: string | null;
    erledigt: boolean;
  };
  slug: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5">
      <form action={aufgabeUmschalten}>
        <input type="hidden" name="id" value={aufgabe.id} />
        <input type="hidden" name="slug" value={slug} />
        <button
          type="submit"
          aria-label={aufgabe.erledigt ? "Als offen markieren" : "Erledigen"}
          className={`flex h-5 w-5 items-center justify-center rounded border text-xs transition ${
            aufgabe.erledigt
              ? "border-amber-400 bg-amber-400 text-neutral-950"
              : "border-neutral-600 hover:border-amber-400"
          }`}
        >
          {aufgabe.erledigt ? "✓" : ""}
        </button>
      </form>
      <span
        className={`flex-1 text-sm ${aufgabe.erledigt ? "line-through" : ""}`}
      >
        {aufgabe.titel}
      </span>
      {aufgabe.zustaendig && (
        <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-300">
          {aufgabe.zustaendig}
        </span>
      )}
      <form action={aufgabeLoeschen}>
        <input type="hidden" name="id" value={aufgabe.id} />
        <input type="hidden" name="slug" value={slug} />
        <button
          type="submit"
          aria-label="Aufgabe löschen"
          className="text-neutral-600 transition hover:text-red-400"
        >
          ✕
        </button>
      </form>
    </li>
  );
}
