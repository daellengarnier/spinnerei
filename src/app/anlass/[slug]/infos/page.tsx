import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { infoErstellen, infoLoeschen } from "@/lib/actions";
import { getDb } from "@/lib/db/client";
import { anlassBySlug } from "@/lib/db/queries";
import { infos } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function InfosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anlass = await anlassBySlug(slug);
  if (!anlass) notFound();

  const liste = await getDb()
    .select()
    .from(infos)
    .where(eq(infos.anlassId, anlass.id))
    .orderBy(desc(infos.createdAt));

  return (
    <div className="space-y-8">
      <form
        action={infoErstellen}
        className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4"
      >
        <input type="hidden" name="anlassId" value={anlass.id} />
        <input type="hidden" name="slug" value={slug} />
        <input
          name="titel"
          required
          placeholder="Titel"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none"
        />
        <textarea
          name="text"
          required
          rows={3}
          placeholder="Info, Notiz oder Beschluss …"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            name="autor"
            placeholder="Von (optional)"
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300"
          >
            Posten
          </button>
        </div>
      </form>

      {liste.length === 0 ? (
        <p className="text-neutral-400">Noch keine Infos vorhanden.</p>
      ) : (
        <ul className="space-y-3">
          {liste.map((info) => (
            <li
              key={info.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{info.titel}</h3>
                <form action={infoLoeschen}>
                  <input type="hidden" name="id" value={info.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button
                    type="submit"
                    aria-label="Info löschen"
                    className="text-neutral-600 transition hover:text-red-400"
                  >
                    ✕
                  </button>
                </form>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-300">
                {info.text}
              </p>
              {info.autor && (
                <p className="mt-2 text-xs text-neutral-500">— {info.autor}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
