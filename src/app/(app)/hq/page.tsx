"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { Avatar, EmptyState, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { ressortIcon } from "@/lib/ressortIcon";
import type { RessortSummary } from "@/lib/uiTypes";

// HQ (Headquarter): Vereinsressorts ohne Anlass-Bezug —
// Sitzungen, Retraite, Revision, Booking.
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
        <div className="card divide-y divide-line overflow-hidden">
          {ressorts.map((r) => (
            <Link key={r.id} href={`/ressort/${r.id}`} className="row-hover flex items-center gap-3 px-3 py-2.5">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center ring-1 ring-inset"
                style={{ background: `${r.farbe}1c`, color: r.farbe, borderColor: `${r.farbe}3a` }}
              >
                <Icon name={ressortIcon(r.name)} size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 truncate font-semibold text-ink">{r.name}</p>
                  {r.leads.length > 0 && (
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-mute">
                      {r.leads.map((l) => (
                        <span key={l.id} className="inline-flex items-center gap-1">
                          <Avatar name={l.name} color={l.avatarColor} size={14} userId={l.id} showName={false} />
                          {l.name}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
              {r.openTodos > 0 && (
                <span className="count-badge" title={`${r.openTodos} offene Todos`}>
                  {r.openTodos}
                </span>
              )}
              <Icon name="chevron" size={16} className="shrink-0 text-mute" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
