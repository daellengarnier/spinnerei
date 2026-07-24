"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/apiClient";
import { Avatar, EmptyState, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { ressortIcon } from "@/lib/ressortIcon";
import { ressortHint } from "@/lib/ressortHint";
import { useAuth } from "@/components/AuthContext";
import { formatDate } from "@/lib/uiUtil";
import type { RessortSummary } from "@/lib/uiTypes";

interface Anlass {
  id: number;
  slug: string;
  name: string;
  datum: string;
}

export default function AnlassDashboard() {
  const params = useParams<{ anlassId: string }>();
  const anlassId = Number(params.anlassId);
  const { user } = useAuth();
  const [anlass, setAnlass] = useState<Anlass | null>(null);
  const [ressorts, setRessorts] = useState<RessortSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!anlassId) return;
    api.get<{ anlass: Anlass }>(`/anlaesse/${anlassId}`).then((d) => setAnlass(d.anlass)).catch((e) => setError((e as Error).message));
    api
      .get<{ ressorts: RessortSummary[] }>(`/ressorts?anlass=${anlassId}`)
      .then((d) => setRessorts(d.ressorts))
      .catch((e) => setError((e as Error).message));
  }, [anlassId]);

  if (error) return <p className="err-box">{error}</p>;
  if (!anlass) return <Spinner label="Lade Anlass …" />;

  return (
    <div className="space-y-4">
      <div className="px-1 pt-1">
        <Link href="/" className="text-sm text-mute">
          ← Alle Anlässe
        </Link>
        <h1 className="page-title mt-1">{anlass.name}</h1>
        <p className="mt-0.5 text-sm text-mute">{formatDate(anlass.datum)}</p>
      </div>

      {/* Schnellzugriff: Sitzungen & Einkauf des Anlasses */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link href={`/anlass/${anlass.id}/meetings`} className="card flex items-center gap-3 p-3.5 active:scale-[0.99]">
          <span className="quick-icon">
            <Icon name="calendar" size={19} />
          </span>
          <span className="font-semibold text-ink">Sitzungen</span>
        </Link>
        <Link href={`/anlass/${anlass.id}/einkauf`} className="card flex items-center gap-3 p-3.5 active:scale-[0.99]">
          <span className="quick-icon">
            <Icon name="cart" size={19} />
          </span>
          <span className="font-semibold text-ink">Einkauf</span>
        </Link>
      </div>

      <div>
        <h2 className="lbl mb-2 px-1">Ressorts</h2>
        {!ressorts ? (
          <Spinner label="Lade Ressorts …" />
        ) : ressorts.length === 0 ? (
          <EmptyState title="Noch keine Ressorts" hint={user?.rolle === "admin" ? "Lege im Admin-Bereich Ressorts an." : "Der Admin legt die Ressorts an."} />
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
                  {ressortHint(r) && <p className="truncate text-xs text-mute">{ressortHint(r)}</p>}
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
    </div>
  );
}
