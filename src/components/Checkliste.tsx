"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { EmptyState, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import type { VorlagePunkt } from "@/lib/uiTypes";

// Checkliste Putzen & Vorbereitung: eine gemeinsame Vorlage für alle Anlässe.
// Pflegen dürfen alle Mitglieder. Neue Anlässe bekommen die Punkte als Todos.
export function Checkliste({ ressortId, onUebernommen }: { ressortId: number; onUebernommen: () => void }) {
  const [punkte, setPunkte] = useState<VorlagePunkt[] | null>(null);
  const [neu, setNeu] = useState("");
  const [edit, setEdit] = useState<{ id: number; titel: string; beschreibung: string } | null>(null);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get<{ punkte: VorlagePunkt[] }>("/vorlage").then((d) => setPunkte(d.punkte)).catch((e) => setError((e as Error).message));
  }, []);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    setInfo("");
    try {
      await fn();
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const add = () => {
    const titel = neu.trim();
    if (!titel) return;
    setNeu("");
    run(() => api.post("/vorlage", { titel }));
  };

  const move = (i: number, dir: -1 | 1) => {
    if (!punkte) return;
    const a = punkte[i];
    const b = punkte[i + dir];
    if (!b) return;
    run(async () => {
      await api.patch(`/vorlage/${a.id}`, { reihenfolge: b.reihenfolge });
      await api.patch(`/vorlage/${b.id}`, { reihenfolge: a.reihenfolge === b.reihenfolge ? a.reihenfolge + dir : a.reihenfolge });
    });
  };

  const uebernehmen = async () => {
    setError("");
    try {
      const r = await api.post<{ neu: number }>(`/ressorts/${ressortId}/vorlage`);
      setInfo(r.neu === 0 ? "Alle Punkte sind schon als Todos da." : `${r.neu} Punkt(e) als Todos übernommen.`);
      onUebernommen();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!punkte) return <Spinner label="Lade Checkliste …" />;

  return (
    <div className="space-y-4">
      <p className="px-1 text-sm text-dim">
        Gemeinsame Checkliste für alle Anlässe. Jeder neue Anlass bekommt diese Punkte als Todos. Änderungen hier wirken auf künftige
        Anlässe; bei diesem Anlass holst du fehlende Punkte mit «In diesen Anlass übernehmen».
      </p>

      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={neu}
          onChange={(e) => setNeu(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Neuer Punkt, z. B. Toiletten putzen"
        />
        <button className="btn-primary" onClick={add} disabled={!neu.trim()}>
          Hinzufügen
        </button>
      </div>

      <div className="card divide-y divide-line overflow-hidden">
        {punkte.length === 0 ? (
          <div className="p-4">
            <EmptyState icon="🧹" title="Checkliste ist noch leer" hint="Leg den ersten Punkt an." />
          </div>
        ) : (
          punkte.map((p, i) =>
            edit?.id === p.id ? (
              <div key={p.id} className="space-y-2 p-3">
                <input className="input" value={edit.titel} onChange={(e) => setEdit({ ...edit, titel: e.target.value })} autoFocus />
                <textarea
                  className="input min-h-[60px] resize-y"
                  value={edit.beschreibung}
                  onChange={(e) => setEdit({ ...edit, beschreibung: e.target.value })}
                  placeholder="Details (optional)"
                />
                <div className="flex gap-2">
                  <button className="btn-ghost flex-1" onClick={() => setEdit(null)}>
                    Abbrechen
                  </button>
                  <button
                    className="btn-primary flex-1"
                    disabled={!edit.titel.trim()}
                    onClick={() => {
                      const e = edit;
                      setEdit(null);
                      run(() => api.patch(`/vorlage/${e.id}`, { titel: e.titel, beschreibung: e.beschreibung }));
                    }}
                  >
                    Speichern
                  </button>
                </div>
              </div>
            ) : (
              <div key={p.id} className="flex items-start gap-1 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{p.titel}</div>
                  {p.beschreibung && <div className="whitespace-pre-wrap text-xs text-dim">{p.beschreibung}</div>}
                </div>
                <button className="shrink-0 p-1.5 text-mute hover:bg-surface2 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Nach oben">
                  ↑
                </button>
                <button
                  className="shrink-0 p-1.5 text-mute hover:bg-surface2 disabled:opacity-30"
                  disabled={i === punkte.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Nach unten"
                >
                  ↓
                </button>
                <button
                  className="shrink-0 p-1.5 text-mute hover:bg-surface2 hover:text-accent"
                  onClick={() => setEdit({ id: p.id, titel: p.titel, beschreibung: p.beschreibung })}
                  aria-label="Bearbeiten"
                >
                  <Icon name="pencil" size={16} />
                </button>
                <button
                  className="shrink-0 p-1.5 text-mute hover:bg-terra-light hover:text-red-500"
                  onClick={() => confirm(`«${p.titel}» aus der Checkliste entfernen?`) && run(() => api.del(`/vorlage/${p.id}`))}
                  aria-label="Entfernen"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ),
          )
        )}
      </div>

      {punkte.length > 0 && (
        <button className="btn-ghost w-full" onClick={uebernehmen}>
          In diesen Anlass übernehmen
        </button>
      )}
      {info && <p className="px-1 text-sm text-dim">{info}</p>}
      {error && <p className="err-box">{error}</p>}
    </div>
  );
}
