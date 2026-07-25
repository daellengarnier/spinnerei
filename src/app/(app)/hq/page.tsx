"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { Avatar, EmptyState, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { ressortIcon } from "@/lib/ressortIcon";
import { formatDate } from "@/lib/uiUtil";
import type { RessortSummary } from "@/lib/uiTypes";

// HQ (Headquarter): Vereinsressorts als Kachel-Grid —
// Sitzungen, Retraite, Infrastruktur, Booking.
export default function HqPage() {
  const [ressorts, setRessorts] = useState<RessortSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ ressorts: RessortSummary[] }>("/ressorts?hq=1")
      .then((d) => setRessorts(d.ressorts))
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="err-box">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="px-1 pt-1">
        <h1 className="page-title">HQ</h1>
        <p className="mt-0.5 text-sm text-mute">Vereinsressorts — unabhängig von den Anlässen</p>
      </div>

      {!ressorts ? (
        <Spinner label="Lade Ressorts …" />
      ) : ressorts.length === 0 ? (
        <EmptyState title="Noch keine Vereinsressorts" hint="Sie werden beim nächsten Deploy automatisch angelegt." />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {ressorts.map((r) => (
            <HqKachel key={r.id} ressort={r} />
          ))}
        </div>
      )}
    </div>
  );
}

// Was auf der Kachel steht: das, was im Ressort gerade zählt.
function infoZeile(r: RessortSummary): string {
  if (r.hatSitzungen) {
    return r.naechsteSitzung
      ? `Nächste: ${formatDate(r.naechsteSitzung.datum)}${r.naechsteSitzung.startzeit ? ` · ${r.naechsteSitzung.startzeit}` : ""}`
      : "Keine Sitzung geplant";
  }
  if (r.hatBooking) {
    return r.anfragenCount ? `${r.anfragenCount} ${r.anfragenCount === 1 ? "Anfrage" : "Anfragen"}` : "Keine Anfragen";
  }
  return r.openTodos ? `${r.openTodos} offene Todos` : "Nichts offen";
}

function HqKachel({ ressort: r }: { ressort: RessortSummary }) {
  return (
    <Link
      href={`/ressort/${r.id}`}
      className="card relative flex min-h-[8.5rem] flex-col justify-between gap-3 p-3.5 active:scale-[0.98]"
      style={{ borderTop: `2px solid ${r.farbe}` }}
    >
      {r.openTodos > 0 && (
        <span className="count-badge absolute right-2.5 top-2.5" title={`${r.openTodos} offene Todos`}>
          {r.openTodos}
        </span>
      )}
      <span
        className="grid h-11 w-11 place-items-center ring-1 ring-inset"
        style={{ background: `${r.farbe}1c`, color: r.farbe, borderColor: `${r.farbe}3a` }}
      >
        <Icon name={ressortIcon(r.name)} size={22} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{r.name}</p>
        <p className="mt-0.5 truncate text-xs text-dim">{infoZeile(r)}</p>
        {r.leads.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            {r.leads.map((l) => (
              <Avatar key={l.id} name={l.name} color={l.avatarColor} size={18} userId={l.id} showName={false} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
