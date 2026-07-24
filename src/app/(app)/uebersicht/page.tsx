"use client";

// Saison-Übersicht: alle Anlässe untereinander mit Datum, Art, Eckzeiten und
// den Acts (Genre, Herkunft, Showtime) — automatisch aus den Anlässen gezogen.

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { EmptyState, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { formatDate, istFolgetag } from "@/lib/uiUtil";

interface UebersichtAct {
  name: string;
  typ: string;
  genre: string;
  herkunft: string;
  showtime: string;
}

interface UebersichtAnlass {
  id: number;
  name: string;
  datum: string;
  art: string;
  tueroeffnung: string;
  essen: string;
  ende: string;
  petzilink: string;
  acts: UebersichtAct[];
}

export default function SaisonUebersicht() {
  const [anlaesse, setAnlaesse] = useState<UebersichtAnlass[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ anlaesse: UebersichtAnlass[] }>("/anlaesse/uebersicht")
      .then((d) => setAnlaesse(d.anlaesse))
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="err-box">{error}</p>;
  if (!anlaesse) return <Spinner label="Lade Übersicht …" />;

  return (
    <div className="space-y-4">
      <div className="px-1 pt-1">
        <Link href="/" className="text-sm text-mute">
          ← Anlässe
        </Link>
        <h1 className="page-title mt-1">Übersicht alle Anlässe</h1>
      </div>

      {anlaesse.length === 0 ? (
        <EmptyState title="Noch keine Anlässe" />
      ) : (
        anlaesse.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Link href={`/anlass/${a.id}`} className="block-title">
                {a.name}
              </Link>
              {a.art && <span className="chip bg-surface2 text-dim">{a.art}</span>}
            </div>
            <p className="mt-1 text-sm text-dim">{formatDate(a.datum)}</p>

            {(a.tueroeffnung || a.essen || a.ende || a.petzilink) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
                {a.tueroeffnung && <span>Türöffnung {a.tueroeffnung}</span>}
                {a.essen && <span>Essen {a.essen}</span>}
                {a.ende && (
                  <span>
                    Ende {a.ende}
                    {istFolgetag(a.tueroeffnung, a.ende) && " (Folgetag)"}
                  </span>
                )}
                {a.petzilink && (
                  <a href={a.petzilink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent">
                    <Icon name="send" size={11} /> Petzi
                  </a>
                )}
              </div>
            )}

            {a.acts.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-line pt-2.5">
                {a.acts.map((act, i) => (
                  <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                    <span className="font-semibold text-ink">
                      {act.showtime && <span className="brand-text mr-2 tabular-nums">{act.showtime}</span>}
                      {act.name || "Unbenannter Act"}
                    </span>
                    <span className="text-xs text-dim">
                      {[act.genre, act.herkunft].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
