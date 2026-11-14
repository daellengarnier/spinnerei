"use client";

// Standard-Checkliste: Vorbereitung und Nachbereitung im Haus.
// Modus «anlass»: sich für Punkte einschreiben («Ich mach's»), abhaken (mit
// Name und Zeit), Beschreibung aufklappen, eigene Punkte ergänzen. Modus «vorlage» (Admin): die Vorlage bearbeiten, die
// neue Anlässe bekommen.

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { EmptyState, Spinner } from "./Ui";
import { useAuth } from "./AuthContext";
import { Icon } from "./Icon";

type Phase = "vorbereitung" | "nachbereitung";

interface Punkt {
  id: number;
  phase: Phase;
  gruppe: string;
  titel: string;
  beschreibung: string;
  reihenfolge: number;
  erledigtVon?: number | null;
  erledigtVonName?: string | null;
  erledigtAm?: string | null;
  uebernommenVon?: number | null;
  uebernommenVonName?: string | null;
}

const PHASEN: { key: Phase; label: string }[] = [
  { key: "vorbereitung", label: "Vorbereitung" },
  { key: "nachbereitung", label: "Nachbereitung" },
];

type Props = { modus: "anlass"; anlassId: number } | { modus: "vorlage" };

function erledigtText(p: Punkt): string {
  const wer = p.erledigtVonName ?? "jemand";
  if (!p.erledigtAm) return wer;
  const d = new Date(p.erledigtAm);
  const tag = d.toLocaleDateString("de-CH", { weekday: "short", day: "2-digit", month: "2-digit" });
  const zeit = d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
  return `${wer}, ${tag} ${zeit}`;
}

// Gruppen in der Reihenfolge ihres ersten Punktes.
function gruppieren(punkte: Punkt[]): { gruppe: string; punkte: Punkt[] }[] {
  const map = new Map<string, Punkt[]>();
  for (const p of punkte) {
    if (!map.has(p.gruppe)) map.set(p.gruppe, []);
    map.get(p.gruppe)!.push(p);
  }
  return [...map.entries()].map(([gruppe, ps]) => ({ gruppe, punkte: ps }));
}

export function Checkliste(props: Props) {
  const istAnlass = props.modus === "anlass";
  const anlassId = istAnlass ? props.anlassId : 0;
  const listUrl = istAnlass ? `/anlaesse/${anlassId}/checkliste` : "/checkliste/vorlage";
  const punktUrl = (id: number) => (istAnlass ? `/checkliste/punkte/${id}` : `/checkliste/vorlage/${id}`);

  const { user } = useAuth();
  const [punkte, setPunkte] = useState<Punkt[] | null>(null);
  const [offen, setOffen] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      api
        .get<{ punkte: Punkt[] }>(listUrl)
        .then((d) => setPunkte(d.punkte))
        .catch((e) => setError((e as Error).message)),
    [listUrl],
  );
  useEffect(() => {
    load();
    if (!istAnlass) return;
    // Was andere einschreiben oder abhaken, erscheint ohne Neuladen: alle 10 s
    // nachfragen, solange die Seite sichtbar ist, und sofort beim Zurückkehren.
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 10000);
    const sichtbar = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", sichtbar);
    window.addEventListener("focus", sichtbar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sichtbar);
      window.removeEventListener("focus", sichtbar);
    };
  }, [load, istAnlass]);

  const fehler = (e: unknown) => {
    setError((e as Error).message);
    load();
  };

  const toggle = async (p: Punkt) => {
    const erledigt = !p.erledigtAm;
    setPunkte((l) => l?.map((x) => (x.id === p.id ? { ...x, erledigtAm: erledigt ? new Date().toISOString() : null, erledigtVonName: erledigt ? "du" : null } : x)) ?? null);
    try {
      await api.patch(punktUrl(p.id), { erledigt });
      load();
    } catch (e) {
      fehler(e);
    }
  };

  const uebernehmen = async (p: Punkt, ja: boolean) => {
    setPunkte((l) => l?.map((x) => (x.id === p.id ? { ...x, uebernommenVon: ja ? (user?.id ?? null) : null, uebernommenVonName: ja ? (user?.name ?? null) : null } : x)) ?? null);
    try {
      await api.patch(punktUrl(p.id), { uebernehmen: ja });
    } catch (e) {
      fehler(e);
    }
  };

  const speichern = async (p: Punkt, titel: string, beschreibung: string) => {
    try {
      await api.patch(punktUrl(p.id), { titel, beschreibung });
      setPunkte((l) => l?.map((x) => (x.id === p.id ? { ...x, titel: titel.trim(), beschreibung } : x)) ?? null);
    } catch (e) {
      fehler(e);
    }
  };

  const entfernen = async (p: Punkt) => {
    if (!window.confirm(`«${p.titel}» entfernen?`)) return;
    try {
      await api.del(punktUrl(p.id));
      setPunkte((l) => l?.filter((x) => x.id !== p.id) ?? null);
    } catch (e) {
      fehler(e);
    }
  };

  const hinzufuegen = async (phase: Phase, gruppe: string, titel: string) => {
    try {
      await api.post(listUrl, { phase, gruppe, titel });
      await load();
    } catch (e) {
      fehler(e);
    }
  };

  const ausVorlage = async () => {
    setBusy(true);
    try {
      const d = await api.post<{ punkte: Punkt[] }>(listUrl, { ausVorlage: true });
      setPunkte(d.punkte);
    } catch (e) {
      fehler(e);
    } finally {
      setBusy(false);
    }
  };

  if (!punkte) return error ? <p className="err-box">{error}</p> : <Spinner label="Lade Checkliste …" />;

  if (istAnlass && punkte.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState title="Noch keine Checkliste" hint="Übernimm die Standard-Checkliste für Vorbereitung und Nachbereitung. Danach kannst du Punkte ergänzen oder entfernen." />
        <button className="btn-primary w-full" onClick={ausVorlage} disabled={busy}>
          {busy ? "Übernehme …" : "Standard-Checkliste übernehmen"}
        </button>
        {error && <p className="err-box">{error}</p>}
      </div>
    );
  }

  const umschalten = (id: number) =>
    setOffen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-5">
      {!istAnlass && (
        <p className="text-sm text-dim">
          Diese Vorlage bekommt jeder neue Anlass als eigene Kopie. Änderungen hier verändern bestehende Anlässe nicht.
        </p>
      )}
      {error && <p className="err-box">{error}</p>}
      {PHASEN.map((ph) => {
        const inPhase = punkte.filter((p) => p.phase === ph.key);
        const fertig = inPhase.filter((p) => p.erledigtAm).length;
        return (
          <section key={ph.key} className="space-y-3">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="block-title">{ph.label}</h2>
              {istAnlass && inPhase.length > 0 && (
                <span className="text-sm tabular-nums text-dim">
                  {fertig} / {inPhase.length}
                </span>
              )}
            </div>
            {istAnlass && inPhase.length > 0 && (
              <div className="h-1 bg-surface2">
                <div className="h-1 bg-accent transition-all" style={{ width: `${(fertig / inPhase.length) * 100}%` }} />
              </div>
            )}
            {gruppieren(inPhase).map((g) => (
              <div key={g.gruppe} className="card overflow-hidden">
                <div className="flex items-baseline justify-between border-b border-line px-3 py-2">
                  <h3 className="text-sm font-semibold text-ink">{g.gruppe}</h3>
                  {istAnlass && (
                    <span className="text-xs tabular-nums text-dim">
                      {g.punkte.filter((p) => p.erledigtAm).length} / {g.punkte.length}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-line">
                  {g.punkte.map((p) => (
                    <PunktZeile
                      key={p.id}
                      punkt={p}
                      abhakbar={istAnlass}
                      meineId={user?.id ?? null}
                      onUebernehmen={(ja) => uebernehmen(p, ja)}
                      aufgeklappt={offen.has(p.id)}
                      onAufklappen={() => umschalten(p.id)}
                      onToggle={() => toggle(p)}
                      onSpeichern={(t, b) => speichern(p, t, b)}
                      onEntfernen={() => entfernen(p)}
                    />
                  ))}
                </div>
                <NeuerPunkt onAdd={(titel) => hinzufuegen(ph.key, g.gruppe, titel)} />
              </div>
            ))}
            {!istAnlass && <NeueGruppe onAdd={(gruppe, titel) => hinzufuegen(ph.key, gruppe, titel)} />}
          </section>
        );
      })}
    </div>
  );
}

function PunktZeile({
  punkt,
  abhakbar,
  meineId,
  onUebernehmen,
  aufgeklappt,
  onAufklappen,
  onToggle,
  onSpeichern,
  onEntfernen,
}: {
  punkt: Punkt;
  abhakbar: boolean;
  meineId: number | null;
  onUebernehmen: (ja: boolean) => void;
  aufgeklappt: boolean;
  onAufklappen: () => void;
  onToggle: () => void;
  onSpeichern: (titel: string, beschreibung: string) => Promise<void>;
  onEntfernen: () => void;
}) {
  const done = !!punkt.erledigtAm;
  const vergeben = !!punkt.uebernommenVon;
  const meins = vergeben && punkt.uebernommenVon === meineId;
  const [bearbeiten, setBearbeiten] = useState(false);
  const [titel, setTitel] = useState(punkt.titel);
  const [beschreibung, setBeschreibung] = useState(punkt.beschreibung);

  const startBearbeiten = () => {
    setTitel(punkt.titel);
    setBeschreibung(punkt.beschreibung);
    setBearbeiten(true);
  };

  return (
    <div>
      <div className="flex items-start gap-3 px-3 py-2.5">
        {abhakbar && (
          <button
            onClick={onToggle}
            aria-label={done ? "Wieder öffnen" : "Erledigt"}
            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border-2 ${done ? "border-accent bg-accent text-white" : "border-line2 text-transparent"}`}
          >
            <Icon name="check" size={13} strokeWidth={2.4} />
          </button>
        )}
        <button className="min-w-0 flex-1 text-left" onClick={onAufklappen} aria-expanded={aufgeklappt}>
          <span className={`block text-sm font-medium ${done ? "text-dim line-through" : "text-ink"}`}>{punkt.titel}</span>
          {done && <span className="mt-0.5 block text-xs text-dim">erledigt von {erledigtText(punkt)}</span>}
          {!done && vergeben && (
            <span className="mt-0.5 block text-xs text-accent">{meins ? "Du machst das" : `${punkt.uebernommenVonName ?? "Jemand"} macht das`}</span>
          )}
        </button>
        {abhakbar && !done && (!vergeben || meins) && (
          <button onClick={() => onUebernehmen(!meins)} className="mt-0.5 shrink-0 whitespace-nowrap border border-line2 px-2 py-0.5 text-xs text-dim">
            {meins ? "Abgeben" : "Ich mach's"}
          </button>
        )}
        <button
          className={`mt-1 shrink-0 text-dim transition-transform ${aufgeklappt ? "rotate-90" : ""}`}
          onClick={onAufklappen}
          aria-label={aufgeklappt ? "Zuklappen" : "Aufklappen"}
        >
          <Icon name="chevron" size={14} />
        </button>
      </div>

      {aufgeklappt && (
        <div className={`space-y-2 px-3 pb-3 ${abhakbar ? "pl-12" : ""}`}>
          {bearbeiten ? (
            <>
              <input className="input text-sm" value={titel} onChange={(e) => setTitel(e.target.value)} aria-label="Titel" />
              <textarea
                className="input min-h-[80px] resize-y text-sm"
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                placeholder="Beschreibung, z. B. wo etwas liegt oder worauf man achten muss"
                aria-label="Beschreibung"
              />
              <div className="flex gap-2">
                <button className="btn-ghost flex-1" onClick={() => setBearbeiten(false)}>
                  Abbrechen
                </button>
                <button
                  className="btn-primary flex-1"
                  disabled={!titel.trim()}
                  onClick={async () => {
                    await onSpeichern(titel, beschreibung);
                    setBearbeiten(false);
                  }}
                >
                  Speichern
                </button>
              </div>
            </>
          ) : (
            <>
              {punkt.beschreibung.trim() ? (
                <p className="whitespace-pre-wrap text-sm text-ink">{punkt.beschreibung}</p>
              ) : (
                <p className="text-sm italic text-dim">Noch keine Beschreibung.</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs">
                <button className="inline-flex items-center gap-1 text-dim" onClick={startBearbeiten}>
                  <Icon name="pencil" size={12} /> Bearbeiten
                </button>
                <button className="inline-flex items-center gap-1 text-dim" onClick={onEntfernen}>
                  <Icon name="trash" size={12} /> Entfernen
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NeuerPunkt({ onAdd }: { onAdd: (titel: string) => Promise<void> }) {
  const [titel, setTitel] = useState("");
  const add = async () => {
    const t = titel.trim();
    if (!t) return;
    setTitel("");
    await onAdd(t);
  };
  return (
    <div className="flex gap-2 border-t border-line px-3 py-2">
      <input
        className="input min-w-0 flex-1 text-sm"
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder="Punkt ergänzen …"
        aria-label="Punkt ergänzen"
      />
      <button className="btn-ghost shrink-0 px-3" onClick={add} disabled={!titel.trim()} aria-label="Punkt hinzufügen">
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

function NeueGruppe({ onAdd }: { onAdd: (gruppe: string, titel: string) => Promise<void> }) {
  const [auf, setAuf] = useState(false);
  const [gruppe, setGruppe] = useState("");
  const [titel, setTitel] = useState("");
  if (!auf) {
    return (
      <button className="inline-flex items-center gap-1 px-1 text-sm text-dim" onClick={() => setAuf(true)}>
        <Icon name="plus" size={14} /> Neue Gruppe
      </button>
    );
  }
  return (
    <div className="card space-y-2 p-3">
      <input className="input text-sm" value={gruppe} onChange={(e) => setGruppe(e.target.value)} placeholder="Name der Gruppe" autoFocus />
      <input className="input text-sm" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Erster Punkt" />
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={() => setAuf(false)}>
          Abbrechen
        </button>
        <button
          className="btn-primary flex-1"
          disabled={!gruppe.trim() || !titel.trim()}
          onClick={async () => {
            await onAdd(gruppe.trim(), titel.trim());
            setGruppe("");
            setTitel("");
            setAuf(false);
          }}
        >
          Hinzufügen
        </button>
      </div>
    </div>
  );
}
