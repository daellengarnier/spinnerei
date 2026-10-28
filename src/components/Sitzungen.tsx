"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { EmptyState, Modal, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { formatDate, formatDateLong } from "@/lib/uiUtil";
import type { Todo } from "@/lib/uiTypes";

interface Traktandum {
  id: number;
  text: string;
  erledigt: boolean;
  autorName: string | null;
}

export interface SitzungBasis {
  id: number;
  datum: string; // YYYY-MM-DD
  startzeit: string;
  ort: string;
}

interface Sitzung extends SitzungBasis {
  protokoll: string;
  traktanden: Traktandum[];
  pendenzen: Todo[];
}

function heuteIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Übersicht im HQ-Ressort «Sitzungen»: die nächste Sitzung gross, dort sammelt
// man vorab Traktanden. Jede Sitzung öffnet sich als eigene Seite
// (/hq/sitzung/[id]) zum Protokollieren.
export function Sitzungen({ ressortId }: { ressortId: number }) {
  const [sitzungen, setSitzungen] = useState<Sitzung[] | null>(null);
  const [error, setError] = useState("");
  const [neuOpen, setNeuOpen] = useState(false);

  const load = useCallback(
    () =>
      api
        .get<{ sitzungen: Sitzung[] }>(`/sitzungen?ressort=${ressortId}`)
        .then((d) => setSitzungen(d.sitzungen))
        .catch((e) => setError((e as Error).message)),
    [ressortId],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="err-box">{error}</p>;
  if (!sitzungen) return <Spinner label="Lade Sitzungen …" />;

  const heute = heuteIso();
  const kommende = sitzungen.filter((s) => s.datum >= heute);
  const vergangene = sitzungen.filter((s) => s.datum < heute).reverse();
  const [naechste, ...spaeter] = kommende;
  // Offene Pendenzen aus Sitzungen vor der nächsten (die kommen dort automatisch auf den Tisch).
  const offenePendenzen = sitzungen
    .filter((s) => !naechste || s.datum < naechste.datum)
    .flatMap((s) => s.pendenzen)
    .filter((t) => t.status !== "erledigt").length;

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-4">
        {naechste ? (
          <NaechsteSitzung sitzung={naechste} offenePendenzen={offenePendenzen} onChanged={load} />
        ) : (
          <EmptyState title="Keine Sitzung geplant" hint="Plane die nächste Sitzung, alle werden benachrichtigt." />
        )}
        {spaeter.map((s) => (
          <SitzungZeile key={s.id} sitzung={s} />
        ))}
        <button className="btn-ghost w-full" onClick={() => setNeuOpen(true)}>
          <Icon name="plus" size={16} /> Sitzung planen
        </button>
      </div>

      <section>
        <h2 className="lbl mb-2 px-1">Vergangene Sitzungen</h2>
        {vergangene.length === 0 ? (
          <p className="px-1 text-sm text-dim">Noch keine.</p>
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {vergangene.map((s) => (
              <SitzungZeile key={s.id} sitzung={s} flach />
            ))}
          </div>
        )}
      </section>

      {neuOpen && (
        <SitzungModal
          ressortId={ressortId}
          onClose={() => setNeuOpen(false)}
          onSaved={() => {
            setNeuOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

// Nächste Sitzung: Traktanden vorab sammeln, dann öffnen und protokollieren.
function NaechsteSitzung({ sitzung: s, offenePendenzen, onChanged }: { sitzung: Sitzung; offenePendenzen: number; onChanged: () => void }) {
  const [neuText, setNeuText] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!neuText.trim() || saving) return;
    setSaving(true);
    try {
      await api.post(`/sitzungen/${s.id}/traktanden`, { text: neuText.trim() });
      setNeuText("");
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="card overflow-hidden">
      <Link href={`/hq/sitzung/${s.id}`} className="block bg-ink p-5 text-surface hover:opacity-95">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-60">Nächste Sitzung</p>
        <p className="mt-1 text-xl font-semibold">
          {formatDateLong(s.datum)}
          {s.startzeit && <span className="opacity-60"> · {s.startzeit} Uhr</span>}
        </p>
        {s.ort && <p className="mt-0.5 text-sm opacity-60">{s.ort}</p>}
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
          Sitzung öffnen <Icon name="chevron" size={14} />
        </p>
      </Link>
      <div className="p-5">
        <h3 className="lbl mb-2">Traktanden</h3>
        {s.traktanden.length === 0 ? (
          <p className="text-sm text-dim">Noch keine. Wer etwas besprechen will, trägt es hier ein.</p>
        ) : (
          <ol className="space-y-1.5">
            {s.traktanden.map((t, i) => (
              <li key={t.id} className="flex gap-2 text-sm">
                <span className="w-5 shrink-0 text-right text-mute">{i + 1}.</span>
                <span className="min-w-0 flex-1 text-ink">
                  {t.text}
                  {t.autorName && <span className="ml-1.5 text-xs text-mute">{t.autorName}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-3 flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="Traktandum eintragen …"
            value={neuText}
            onChange={(e) => setNeuText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="btn-primary shrink-0 px-3 text-sm" onClick={add} disabled={saving || !neuText.trim()} aria-label="Traktandum hinzufügen">
            <Icon name="plus" size={15} />
          </button>
        </div>
        {offenePendenzen > 0 && (
          <p className="mt-3 text-xs text-dim">
            {offenePendenzen} offene {offenePendenzen === 1 ? "Pendenz" : "Pendenzen"} aus früheren Sitzungen kommen automatisch dazu.
          </p>
        )}
      </div>
    </article>
  );
}

function SitzungZeile({ sitzung: s, flach = false }: { sitzung: Sitzung; flach?: boolean }) {
  const pendenzen = s.pendenzen.length;
  const meta = [
    `${s.traktanden.length} ${s.traktanden.length === 1 ? "Traktandum" : "Traktanden"}`,
    pendenzen > 0 && `${pendenzen} ${pendenzen === 1 ? "Pendenz" : "Pendenzen"}`,
  ].filter(Boolean);
  return (
    <Link
      href={`/hq/sitzung/${s.id}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-surface2 ${flach ? "" : "card"}`}
    >
      <span className="w-24 shrink-0 font-semibold text-ink">{formatDate(s.datum)}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-dim">{meta.join(" · ")}</span>
      <Icon name="chevron" size={14} className="shrink-0 text-mute" />
    </Link>
  );
}

// Freitext mit anklickbaren Links; lange Texte zuerst eingeklappt.
export function ProtokollText({ text }: { text: string }) {
  const lang = text.split("\n").length > 14;
  const [ganz, setGanz] = useState(!lang);
  return (
    <div className="mt-1.5">
      <p className={`whitespace-pre-wrap text-sm leading-relaxed text-ink [overflow-wrap:anywhere] ${ganz ? "" : "line-clamp-[12]"}`}>
        {text.split(/(https?:\/\/\S+)/g).map((teil, i) =>
          /^https?:\/\//.test(teil) ? (
            <a key={i} href={teil} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {teil.includes("docs.google.com") ? "Google Doc öffnen" : teil}
            </a>
          ) : (
            teil
          ),
        )}
      </p>
      {lang && (
        <button className="mt-1 text-xs font-semibold text-ink hover:underline" onClick={() => setGanz((g) => !g)}>
          {ganz ? "Weniger anzeigen" : "Ganzes Protokoll anzeigen"}
        </button>
      )}
    </div>
  );
}

export function SitzungModal({
  ressortId,
  sitzung,
  onClose,
  onSaved,
}: {
  ressortId: number;
  sitzung?: SitzungBasis;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!sitzung;
  const [datum, setDatum] = useState(sitzung?.datum ?? "");
  const [startzeit, setStartzeit] = useState(sitzung?.startzeit ?? "");
  const [ort, setOrt] = useState(sitzung?.ort ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!datum) return setError("Datum erforderlich");
    setSaving(true);
    setError("");
    try {
      if (editing) await api.patch(`/sitzungen/${sitzung!.id}`, { datum, startzeit, ort });
      else await api.post("/sitzungen", { ressortId, datum, startzeit, ort });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await api.del(`/sitzungen/${sitzung!.id}`);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Sitzung bearbeiten" : "Sitzung planen"}
      footer={
        <div className="flex gap-2">
          {editing && (
            <button className="btn-danger" onClick={remove} aria-label="Sitzung löschen">
              <Icon name="trash" size={16} />
            </button>
          )}
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            {saving ? "Speichern …" : "Speichern"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Datum</label>
            <input type="date" className="input" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </div>
          <div>
            <label className="label">Zeit</label>
            <input type="time" className="input" value={startzeit} onChange={(e) => setStartzeit(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Ort (optional)</label>
          <input className="input" value={ort} onChange={(e) => setOrt(e.target.value)} placeholder="z. B. Spinnerei" />
        </div>
        {!editing && <p className="text-xs text-dim">Alle Mitglieder bekommen eine Benachrichtigung.</p>}
        {error && <p className="err-box">{error}</p>}
      </div>
    </Modal>
  );
}
