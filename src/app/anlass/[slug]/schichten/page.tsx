import { asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  helferAustragen,
  helferEintragen,
  schichtErstellen,
  schichtLoeschen,
} from "@/lib/actions";
import { getDb } from "@/lib/db/client";
import { anlassBySlug } from "@/lib/db/queries";
import { schichten, schichtHelfer } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function SchichtenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anlass = await anlassBySlug(slug);
  if (!anlass) notFound();

  const db = getDb();
  const schichtListe = await db
    .select()
    .from(schichten)
    .where(eq(schichten.anlassId, anlass.id))
    .orderBy(asc(schichten.zeitVon), asc(schichten.bereich));

  const helferListe = schichtListe.length
    ? await db
        .select()
        .from(schichtHelfer)
        .where(
          inArray(
            schichtHelfer.schichtId,
            schichtListe.map((s) => s.id),
          ),
        )
        .orderBy(asc(schichtHelfer.createdAt))
    : [];

  return (
    <div className="space-y-8">
      <form
        action={schichtErstellen}
        className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]"
      >
        <input type="hidden" name="anlassId" value={anlass.id} />
        <input type="hidden" name="slug" value={slug} />
        <input
          name="bereich"
          required
          placeholder="Bereich (z.B. Bar, Eingang)"
          className="col-span-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none sm:col-span-1"
        />
        <input
          name="zeitVon"
          type="time"
          required
          className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none [color-scheme:dark]"
        />
        <input
          name="zeitBis"
          type="time"
          required
          className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none [color-scheme:dark]"
        />
        <input
          name="plaetze"
          type="number"
          min={1}
          defaultValue={2}
          required
          title="Anzahl Plätze"
          className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300"
        >
          Schicht anlegen
        </button>
      </form>

      {schichtListe.length === 0 ? (
        <p className="text-neutral-400">Noch keine Schichten erfasst.</p>
      ) : (
        <ul className="space-y-4">
          {schichtListe.map((schicht) => {
            const helfer = helferListe.filter(
              (h) => h.schichtId === schicht.id,
            );
            const voll = helfer.length >= schicht.plaetze;
            return (
              <li
                key={schicht.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{schicht.bereich}</h3>
                    <p className="text-sm text-neutral-400">
                      {schicht.zeitVon} – {schicht.zeitBis} Uhr ·{" "}
                      <span className={voll ? "text-amber-400" : ""}>
                        {helfer.length}/{schicht.plaetze} besetzt
                      </span>
                    </p>
                  </div>
                  <form action={schichtLoeschen}>
                    <input type="hidden" name="id" value={schicht.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <button
                      type="submit"
                      aria-label="Schicht löschen"
                      className="text-neutral-600 transition hover:text-red-400"
                    >
                      ✕
                    </button>
                  </form>
                </div>

                {helfer.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {helfer.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1 text-sm"
                      >
                        {h.name}
                        <form action={helferAustragen}>
                          <input type="hidden" name="id" value={h.id} />
                          <input type="hidden" name="slug" value={slug} />
                          <button
                            type="submit"
                            aria-label={`${h.name} austragen`}
                            className="text-neutral-500 transition hover:text-red-400"
                          >
                            ✕
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}

                {!voll && (
                  <form action={helferEintragen} className="mt-3 flex gap-2">
                    <input type="hidden" name="schichtId" value={schicht.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <input
                      name="name"
                      required
                      placeholder="Dein Name"
                      className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-amber-400/50 px-3 py-1.5 text-sm font-medium text-amber-400 transition hover:bg-amber-400 hover:text-neutral-950"
                    >
                      Eintragen
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
