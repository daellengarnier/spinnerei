"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { EmptyState, Modal, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { formatDateLong } from "@/lib/uiUtil";

interface Traktandum {
  id: number;
  text: string;
  erledigt: boolean;
  autorName: string | null;
}

interface Sitzung {
  id: number;
  datum: string; // YYYY-MM-DD
  startzeit: string;
  ort: string;
  traktanden: Traktandum[];
}

function heuteIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// HQ-Ressort «Sitzungen»: nächste Sitzung prominent, Traktanden direkt erfassbar.
export function Sitzungen({ ressortId }: { ressortId: number }) {
  const [sitzungen, setSitzungen] = useState<Sitzung[] | null>(null);
  const [error, setError] = useState("");
  const [neuOpen, setNeuOpen] = useState(false);
  const [edit, setEdit] = useState<Sitzung | null>(null);
  const [vergangeneOffen, setVergangeneOffen] = useState(false);

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

  return (
    <div className="space-y-3">
      <button className="btn-primary w-full" onClick={() => setNeuOpen(true)}>
        <Icon name="plus" size={17} /> Sitzung planen
      </button>

      {kommende.length === 0 ? (
        <EmptyState title="Keine Sitzung geplant" hint="Plane oben die nächste Sitzung — alle werden benachrichtigt." />
      ) : (
        kommende.map((s, i) => (
          <SitzungCard key={s.id} sitzung={s} istNaechste={i === 0} onEdit={() => setEdit(s)} onChanged={load} />
        ))
      )}

      {vergangene.length > 0 && (
        <div>
          <button className="flex w-full items-center justify-between gap-3 px-1 py-1" onClick={() => setVergangeneOffen((o) => !o)}>
            <span className="lbl">Vergangene ({vergangene.length})</span>
            <Icon name="chevron" size={14} className={`text-mute transition-transform ${vergangeneOffen ? "-rotate-90" : "rotate-90"}`} />
          </button>
          {vergangeneOffen && (
            <div className="mt-1 space-y-3 opacity-70">
              {vergangene.map((s) => (
                <SitzungCard key={s.id} sitzung={s} istNaechste={false} onEdit={() => setEdit(s)} onChanged={load} />
              ))}
            </div>
          )}
        </div>
      )}

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
      {edit && (
        <SitzungModal
          ressortId={ressortId}
          sitzung={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function SitzungCard({
  sitzung,
  istNaechste,
  onEdit,
  onChanged,
}: {
  sitzung: Sitzung;
  istNaechste: boolean;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [neuText, setNeuText] = useState("");
  const [saving, setSaving] = useState(false);

  const addTraktandum = async () => {
    if (!neuText.trim() || saving) return;
    setSaving(true);
    try {
      await api.post(`/sitzungen/${sitzung.id}/traktanden`, { text: neuText.trim() });
      setNeuText("");
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (t: Traktandum) => {
    await api.patch(`/traktanden/${t.id}`, { erledigt: !t.erledigt });
    onChanged();
  };

  const removeTraktandum = async (t: Traktandum) => {
    await api.del(`/traktanden/${t.id}`);
    onChanged();
  };

  return (
    <section className={`card p-3.5 ${istNaechste ? "ring-1 ring-accent/40" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {istNaechste && <p className="lbl text-accent">Nächste Sitzung</p>}
          <p className="font-semibold text-ink">
            {formatDateLong(sitzung.datum)}
            {sitzung.startzeit && <span className="brand-text"> · {sitzung.startzeit} Uhr</span>}
          </p>
          {sitzung.ort && <p className="mt-0.5 text-xs text-dim">{sitzung.ort}</p>}
        </div>
        <button
          className="grid h-8 w-8 shrink-0 place-items-center border border-line2 text-dim active:scale-95"
          onClick={onEdit}
          aria-label="Sitzung bearbeiten"
        >
          <Icon name="pencil" size={13} />
        </button>
      </div>

      <div className="mt-3 border-t border-line pt-2.5">
        <p className="lbl mb-1.5">Traktanden</p>
        {sitzung.traktanden.length === 0 && <p className="text-xs text-dim">Noch keine — schreib das erste Traktandum rein.</p>}
        <div className="space-y-1">
          {sitzung.traktanden.map((t, i) => (
            <div key={t.id} className="group flex items-start gap-2 py-0.5">
              <button
                className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center border text-[10px] ${
                  t.erledigt ? "border-accent bg-accent/20 text-accent" : "border-line2 text-transparent"
                }`}
                onClick={() => toggle(t)}
                aria-label={t.erledigt ? "Als offen markieren" : "Als behandelt markieren"}
              >
                <Icon name="check" size={11} />
              </button>
              <span className={`min-w-0 flex-1 text-sm ${t.erledigt ? "text-dim line-through" : "text-ink"}`}>
                <span className="mr-1.5 text-xs text-mute">{i + 1}.</span>
                {t.text}
                {t.autorName && <span className="ml-1.5 text-xs text-mute">— {t.autorName}</span>}
              </span>
              <button className="shrink-0 text-mute active:scale-95" onClick={() => removeTraktandum(t)} aria-label="Traktandum löschen">
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className="input flex-1 px-2 py-1.5 text-sm"
            placeholder="Neues Traktandum …"
            value={neuText}
            onChange={(e) => setNeuText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTraktandum()}
          />
          <button className="btn-ghost shrink-0 px-3 py-1.5 text-sm" onClick={addTraktandum} disabled={saving || !neuText.trim()}>
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}

function SitzungModal({
  ressortId,
  sitzung,
  onClose,
  onSaved,
}: {
  ressortId: number;
  sitzung?: Sitzung;
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
