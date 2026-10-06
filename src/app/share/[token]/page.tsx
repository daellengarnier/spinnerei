import { asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { acts, anlaesse, ressorts } from "@/lib/db/schema";
import { formatDateLong, istFolgetag } from "@/lib/uiUtil";

// Öffentliche, token-geschützte Ablauf-Seite für externe Ton-/Technik-Leute:
// Eckzeiten, Running Order (Load-in/Soundcheck/Showtime) und Rider-Links.
// Kein Login — wer den Link hat, sieht genau diese Infos und nichts weiter.

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 10) notFound();

  const db = getDb();
  const rows = await db.select().from(anlaesse).where(eq(anlaesse.shareToken, token)).limit(1);
  const anlass = rows[0];
  if (!anlass) notFound();

  const anlassRessorts = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.anlassId, anlass.id));
  const anlassActs = anlassRessorts.length
    ? await db
        .select({
          id: acts.id,
          name: acts.name,
          typ: acts.typ,
          genre: acts.genre,
          herkunft: acts.herkunft,
          getIn: acts.getIn,
          soundcheck: acts.soundcheck,
          showtime: acts.showtime,
          anzahlPersonen: acts.anzahlPersonen,
          drivelink: acts.drivelink,
        })
        .from(acts)
        .where(inArray(acts.ressortId, anlassRessorts.map((r) => r.id)))
        .orderBy(asc(acts.showtime), asc(acts.name))
    : [];

  const zeiten = [
    anlass.tueroeffnung && { label: "Türöffnung", zeit: anlass.tueroeffnung },
    anlass.mitEssen === true && anlass.essen && { label: "Essen", zeit: anlass.essen },
    anlass.ende && {
      label: istFolgetag(anlass.tueroeffnung, anlass.ende) ? "Ende (Folgetag)" : "Ende",
      zeit: anlass.ende,
    },
  ].filter(Boolean) as { label: string; zeit: string }[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <p className="lbl text-accent">Spinnerei — Ablauf &amp; Rider</p>
      <h1 className="page-title mt-1">{anlass.name}</h1>
      <p className="mt-1 text-sm text-mute">{formatDateLong(anlass.datum)}</p>

      {zeiten.length > 0 && (
        <section className="card mt-5 p-4">
          <h2 className="block-title mb-2.5">Eckzeiten</h2>
          <div className="space-y-1 text-sm">
            {zeiten.map((z) => (
              <p key={z.label} className="flex justify-between gap-4">
                <span className="text-dim">{z.label}</span>
                <span className="tabular-nums font-semibold text-ink">{z.zeit}</span>
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="card mt-4 p-4">
        <h2 className="block-title mb-2.5">Running Order</h2>
        {anlassActs.length === 0 ? (
          <p className="text-sm text-dim">Acts folgen — die Zeiten werden hier automatisch ergänzt.</p>
        ) : (
          <div className="divide-y divide-line">
            {anlassActs.map((a) => (
              <div key={a.id} className="py-3 first:pt-0 last:pb-0">
                <p className="font-semibold text-ink">
                  {a.showtime && <span className="brand-text mr-2 tabular-nums">{a.showtime}</span>}
                  {a.name || "Unbenannter Act"}
                  {(a.genre || a.herkunft) && (
                    <span className="ml-2 text-xs font-normal text-dim">{[a.genre, a.herkunft].filter(Boolean).join(", ")}</span>
                  )}
                </p>
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-dim">
                  {a.getIn && <span>Load-in {a.getIn}</span>}
                  {a.soundcheck && <span>Soundcheck {a.soundcheck}</span>}
                  {a.anzahlPersonen != null && a.anzahlPersonen > 0 && <span>{a.anzahlPersonen} Personen</span>}
                </p>
                {(a.drivelink || anlass.drivelink) && (
                  <a
                    href={a.drivelink || anlass.drivelink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-block text-sm text-accent underline underline-offset-2"
                  >
                    Tech-/Hospitality-Rider (Drive) →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-6 text-xs text-mute">
        Kulturspinnerei Felsenau · Spinnereiweg 17, 3004 Bern ·{" "}
        <a href="https://kulturspinnerei.ch" className="text-accent">
          kulturspinnerei.ch
        </a>
      </p>
      <p className="mt-1 text-xs text-mute">Änderungen vorbehalten — dieser Link zeigt immer den aktuellen Stand.</p>
    </main>
  );
}
