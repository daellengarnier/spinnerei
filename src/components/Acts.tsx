"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/apiClient";
import { EmptyState, Modal, Spinner } from "./Ui";
import { Icon } from "./Icon";
import { formatChf } from "@/lib/finance";
import type { Act } from "@/lib/uiTypes";

const TYP_LABEL: Record<string, string> = { band: "Band", dj: "DJ", andere: "Andere" };

function parseChf(s: string): number {
  const v = parseFloat(String(s).replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(v) ? Math.round(v * 100) : NaN;
}

export function Acts({ ressortId }: { ressortId: number }) {
  const [acts, setActs] = useState<Act[] | null>(null);
  const [modal, setModal] = useState<Act | "new" | null>(null);

  const load = () =>
    api.get<{ acts: Act[] }>(`/acts?ressortId=${ressortId}`).then((d) => {
      setActs(d.acts);
    });
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ressortId]);

  // Ein Floor — flache Liste, sortiert nach Showtime, dann Name.
  const sortiert = useMemo(
    () => [...(acts ?? [])].sort((a, b) => (a.showtime || "99:99").localeCompare(b.showtime || "99:99") || a.name.localeCompare(b.name)),
    [acts],
  );

  return (
    <div className="space-y-4">
      <button className="btn-primary w-full" onClick={() => setModal("new")}>
        <Icon name="plus" size={17} /> Act hinzufügen
      </button>
      <p className="px-1 text-xs text-dim">
        Pro Act: Zeiten (Load-in, Soundcheck, Showtime), Genre & Herkunft, Gage, Übernachtung & Rider. Die Zeiten erscheinen automatisch in der Anlassübersicht.
      </p>

      {acts === null ? (
        <Spinner label="Lade Acts …" />
      ) : acts.length === 0 ? (
        <EmptyState title="Noch keine Acts" hint="Füge einen Act hinzu — die Zeiten landen automatisch in der Anlassübersicht." />
      ) : (
        <div className="space-y-2.5">
          {sortiert.map((a) => (
            <ActCard key={a.id} act={a} onOpen={() => setModal(a)} />
          ))}
        </div>
      )}

      {modal && (
        <ActModal
          ressortId={ressortId}
          act={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ActCard({ act: a, onOpen }: { act: Act; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="card w-full p-3.5 text-left active:bg-surface2">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center  bg-accent/10 text-accent">
          <Icon name={a.typ === "dj" ? "music" : "star"} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-ink">{a.name || "Unbenannter Act"}</p>
            <span className="chip bg-surface2 text-dim">{TYP_LABEL[a.typ] ?? a.typ}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dim">
            {a.getIn && (
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" size={13} /> Load-in {a.getIn}
              </span>
            )}
            {a.soundcheck && (
              <span className="inline-flex items-center gap-1">
                <Icon name="tools" size={13} /> SC {a.soundcheck}
              </span>
            )}
            {a.showtime && (
              <span className="inline-flex items-center gap-1 font-medium text-dim">
                <Icon name="clock" size={13} /> Show {a.showtime}
              </span>
            )}
            {a.genre && <span>{a.genre}</span>}
            {a.herkunft && <span>aus {a.herkunft}</span>}
            {a.kostenCents != null && (
              <span className="inline-flex items-center gap-1 font-medium text-dim">
                <Icon name="coins" size={13} /> CHF {formatChf(a.kostenCents)}
              </span>
            )}
            {a.anzahlPersonen != null && (
              <span className="inline-flex items-center gap-1">
                <Icon name="user" size={13} /> {a.anzahlPersonen}
                {a.driver && " + Driver"}
              </span>
            )}
            {a.anzahlPersonen == null && a.driver && <span className="inline-flex items-center gap-1">eigener Driver</span>}
            {a.uebernachtung && (
              <span className="inline-flex items-center gap-1 text-accent-dark">
                <Icon name="bed" size={14} /> Übernachtung
              </span>
            )}
            {a.drivelink && (
              <span className="inline-flex items-center gap-1">
                <Icon name="file" size={13} /> Drive
              </span>
            )}
          </div>
        </div>
        <Icon name="chevron" size={16} className="mt-1 shrink-0 text-mute" />
      </div>
    </button>
  );
}

function ActModal({
  ressortId,
  act,
  onClose,
  onSaved,
}: {
  ressortId: number;
  act: Act | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!act;
  const [name, setName] = useState(act?.name ?? "");
  const [typ, setTyp] = useState<Act["typ"]>(act?.typ ?? "band");
  const [getIn, setGetIn] = useState(act?.getIn ?? "");
  const [soundcheck, setSoundcheck] = useState(act?.soundcheck ?? "");
  const [showtime, setShowtime] = useState(act?.showtime ?? "");
  const [genre, setGenre] = useState(act?.genre ?? "");
  const [herkunft, setHerkunft] = useState(act?.herkunft ?? "");
  const [gage, setGage] = useState(act?.kostenCents != null ? (act.kostenCents / 100).toFixed(2) : "");
  const [anzahl, setAnzahl] = useState(act?.anzahlPersonen != null ? String(act.anzahlPersonen) : "");
  const [driver, setDriver] = useState(act?.driver ?? false);
  const [uebernachtung, setUebernachtung] = useState(act?.uebernachtung ?? false);
  const [promotext, setPromotext] = useState(act?.promotext ?? "");
  const [notiz, setNotiz] = useState(act?.notiz ?? "");
  const [drivelink, setDrivelink] = useState(act?.drivelink ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) return setError("Name erforderlich");
    setSaving(true);
    setError("");
    const cents = gage.trim() ? parseChf(gage) : null;
    const payload = {
      ressortId,
      name: name.trim(),
      typ,
      getIn: getIn.trim(),
      soundcheck: soundcheck.trim(),
      showtime: showtime.trim(),
      genre: genre.trim(),
      herkunft: herkunft.trim(),
      kostenCents: cents && cents > 0 ? cents : null,
      anzahlPersonen: anzahl.trim() ? Number(anzahl) : null,
      driver,
      uebernachtung,
      promotext: promotext.trim(),
      notiz: notiz.trim(),
      drivelink: drivelink.trim(),
    };
    try {
      if (editing) {
        await api.patch(`/acts/${act!.id}`, payload);
      } else {
        await api.post("/acts", payload);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await api.del(`/acts/${act!.id}`);
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Act bearbeiten" : "Neuer Act"}
      footer={
        <div className="flex gap-2">
          {editing && (
            <button className="btn-danger" onClick={remove} aria-label="Löschen">
              <Icon name="trash" size={17} />
            </button>
          )}
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            Speichern
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Name (Band / DJ)</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="z. B. The Spinners" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Typ</label>
            <select className="input" value={typ} onChange={(e) => setTyp(e.target.value as Act["typ"])}>
              <option value="band">Band</option>
              <option value="dj">DJ</option>
              <option value="andere">Andere</option>
            </select>
          </div>
          <div>
            <label className="label">Anzahl Personen</label>
            <input className="input" inputMode="numeric" value={anzahl} onChange={(e) => setAnzahl(e.target.value)} placeholder="z. B. 4" />
          </div>
        </div>

        <label className="flex items-center gap-3 border border-line bg-surface2 px-3 py-2.5">
          <input type="checkbox" className="h-5 w-5 accent-accent" checked={driver} onChange={(e) => setDriver(e.target.checked)} />
          <span className="text-sm font-medium text-ink">Band kommt mit eigenem Driver</span>
        </label>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Load-in</label>
            <input type="time" className="input" value={getIn} onChange={(e) => setGetIn(e.target.value)} />
          </div>
          <div>
            <label className="label">Soundcheck</label>
            <input type="time" className="input" value={soundcheck} onChange={(e) => setSoundcheck(e.target.value)} />
          </div>
          <div>
            <label className="label">Showtime</label>
            <input type="time" className="input" value={showtime} onChange={(e) => setShowtime(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Genre</label>
            <input className="input" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="z. B. Psych-Rock" />
          </div>
          <div>
            <label className="label">Herkunft</label>
            <input className="input" value={herkunft} onChange={(e) => setHerkunft(e.target.value)} placeholder="z. B. Bern" />
          </div>
        </div>
        <p className="-mt-2 text-xs text-dim">Genre & Herkunft erscheinen auf dem Saisonplakat.</p>

        <div>
          <label className="label">Kosten / Gage (CHF)</label>
          <input className="input" inputMode="decimal" value={gage} onChange={(e) => setGage(e.target.value)} placeholder="0.00" />
          <p className="mt-1 text-xs text-dim">Wird in den Finanzen als Ausgabe „Gagen“ geführt.</p>
        </div>
        <label className="flex items-center gap-3  border border-line bg-surface2 px-3 py-2.5">
          <input type="checkbox" className="h-5 w-5 accent-accent" checked={uebernachtung} onChange={(e) => setUebernachtung(e.target.checked)} />
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <Icon name="bed" size={17} className="text-accent" /> Übernachtung benötigt
          </span>
        </label>
        <div>
          <label className="label">Promotext</label>
          <textarea className="input min-h-[70px] resize-y" value={promotext} onChange={(e) => setPromotext(e.target.value)} placeholder="Kurzbeschreibung für Promo/Programm …" />
        </div>
        <div>
          <label className="label">Notiz (intern)</label>
          <textarea className="input min-h-[50px] resize-y" value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="Kontakt, Absprachen, Sonstiges …" />
        </div>

        <div>
          <label className="label">Drive-Link (Tech-/Hospitality-Rider, Dokumente)</label>
          <div className="flex gap-2">
            <input
              type="url"
              className="input min-w-0 flex-1"
              placeholder="https://drive.google.com/…"
              value={drivelink}
              onChange={(e) => setDrivelink(e.target.value)}
            />
            {drivelink.trim() && (
              <a href={drivelink.trim()} target="_blank" rel="noopener noreferrer" className="btn-ghost shrink-0 px-3 text-sm">
                Öffnen
              </a>
            )}
          </div>
          <p className="mt-1 text-xs text-dim">Rider & Dokumente liegen im Drive-Ordner des Anlasses — hier den Link zum Unterordner des Acts einfügen.</p>
        </div>

        {error && <p className=" bg-terra-light px-3 py-2 text-sm text-terra-dark">{error}</p>}
      </div>
    </Modal>
  );
}
