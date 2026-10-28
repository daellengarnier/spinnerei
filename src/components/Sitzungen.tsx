"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { EmptyState, Modal, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { TodoRow } from "@/components/TodoRow";
import { AssigneePicker } from "@/components/AssigneePicker";
import { formatDate, formatDateLong } from "@/lib/uiUtil";
import type { Todo } from "@/lib/uiTypes";

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
  protokoll: string;
  traktanden: Traktandum[];
  pendenzen: Todo[];
}

function heuteIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Sitzungsbuch des Vereins (HQ-Ressort «Sitzungen»): links alle Sitzungen,
// rechts die gewählte mit Traktanden, Pendenzen und Protokoll.
// Pendenzen sind Todos mit Zuständigen; sie erscheinen bei ihnen unter «Meine Sachen».
// ?sitzung=<id> wählt eine Sitzung vor (Link aus dem HQ).
export function Sitzungen({ ressortId }: { ressortId: number }) {
  const [sitzungen, setSitzungen] = useState<Sitzung[] | null>(null);
  const [error, setError] = useState("");
  const [neuOpen, setNeuOpen] = useState(false);
  const [edit, setEdit] = useState<Sitzung | null>(null);
  // Hydration unkritisch: die Liste erscheint erst nach dem Laden im Browser.
  const [gewaehlt, setGewaehlt] = useState<number | null>(() =>
    typeof window !== "undefined" ? Number(new URLSearchParams(window.location.search).get("sitzung")) || null : null,
  );

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
  // Ohne Auswahl: die nächste geplante, sonst die letzte.
  const aktiv = sitzungen.find((s) => s.id === gewaehlt) ?? kommende[0] ?? vergangene[0] ?? null;
  const naechsteId = kommende[0]?.id ?? null;
  // Offene Pendenzen aus allen früheren Sitzungen, für die Runde «Pendenzen aus der letzten Sitzung».
  const offenAusFrueheren = aktiv
    ? sitzungen.filter((s) => s.datum < aktiv.datum).flatMap((s) => s.pendenzen.filter((t) => t.status !== "erledigt"))
    : [];

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <aside className="space-y-3 lg:sticky lg:top-24">
        <button className="btn-primary w-full" onClick={() => setNeuOpen(true)}>
          <Icon name="plus" size={17} /> Sitzung planen
        </button>
        {sitzungen.length > 0 && (
          // Handy: Sitzungen als waagrechte Leiste, Desktop: Liste.
          <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:block lg:space-y-4 lg:overflow-visible lg:px-0" aria-label="Sitzungen">
            {[
              { titel: "Geplant", liste: kommende },
              { titel: "Vergangen", liste: vergangene },
            ]
              .filter((g) => g.liste.length > 0)
              .map((g) => (
                <div key={g.titel} className="contents lg:block">
                  <p className="lbl mb-1.5 hidden px-1 lg:block">{g.titel}</p>
                  <div className="contents lg:block lg:space-y-1.5">
                    {g.liste.map((s) => (
                      <SitzungEintrag key={s.id} sitzung={s} aktiv={s.id === aktiv?.id} naechste={s.id === naechsteId} onClick={() => setGewaehlt(s.id)} />
                    ))}
                  </div>
                </div>
              ))}
          </nav>
        )}
      </aside>

      {aktiv ? (
        <SitzungDetail
          key={aktiv.id}
          sitzung={aktiv}
          ressortId={ressortId}
          istNaechste={aktiv.id === naechsteId}
          vergangen={aktiv.datum < heute}
          naechsteGeplant={kommende.length > 0}
          offenAusFrueheren={offenAusFrueheren}
          onEdit={() => setEdit(aktiv)}
          onChanged={load}
        />
      ) : (
        <EmptyState title="Noch keine Sitzungen" hint="Plane die nächste Sitzung, alle werden benachrichtigt." />
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

function SitzungEintrag({ sitzung: s, aktiv, naechste, onClick }: { sitzung: Sitzung; aktiv: boolean; naechste: boolean; onClick: () => void }) {
  const offenePendenzen = s.pendenzen.filter((t) => t.status !== "erledigt").length;
  const meta = [
    s.traktanden.length > 0 && `${s.traktanden.length} Traktanden`,
    offenePendenzen > 0 && `${offenePendenzen} Pendenzen offen`,
  ].filter(Boolean);
  return (
    <button
      onClick={onClick}
      className={`sitzung-eintrag block w-40 shrink-0 px-3 py-2.5 text-left lg:w-full ${aktiv ? "on" : ""}`}
      aria-current={aktiv ? "true" : undefined}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold">{formatDate(s.datum)}</span>
        {naechste ? <span className="sitzung-tag">Nächste</span> : s.protokoll ? <Icon name="pencil" size={12} className="opacity-50" /> : null}
      </span>
      <span className="mt-0.5 block truncate text-xs opacity-60">{meta.join(" · ") || s.ort || "Noch leer"}</span>
    </button>
  );
}

function SitzungDetail({
  sitzung,
  ressortId,
  istNaechste,
  vergangen,
  naechsteGeplant,
  offenAusFrueheren,
  onEdit,
  onChanged,
}: {
  sitzung: Sitzung;
  ressortId: number;
  istNaechste: boolean;
  vergangen: boolean;
  naechsteGeplant: boolean;
  offenAusFrueheren: Todo[];
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [neuText, setNeuText] = useState("");
  const [saving, setSaving] = useState(false);
  const [uebernehmen, setUebernehmen] = useState(false);
  const offene = sitzung.traktanden.filter((t) => !t.erledigt).length;

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

  const offeneUebernehmen = async () => {
    setUebernehmen(true);
    try {
      await api.post(`/sitzungen/${sitzung.id}/uebernehmen`);
      onChanged();
    } finally {
      setUebernehmen(false);
    }
  };

  return (
    <article className="card space-y-5 p-4 lg:p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="lbl">{istNaechste ? "Nächste Sitzung" : vergangen ? "Sitzung" : "Geplante Sitzung"}</p>
          <h2 className="mt-0.5 text-xl font-semibold text-ink">
            {formatDateLong(sitzung.datum)}
            {sitzung.startzeit && <span className="text-dim"> · {sitzung.startzeit} Uhr</span>}
          </h2>
          {sitzung.ort && <p className="mt-0.5 text-sm text-dim">{sitzung.ort}</p>}
        </div>
        <button className="btn-ghost shrink-0 px-2.5 py-1.5 text-sm" onClick={onEdit} aria-label="Sitzung bearbeiten">
          <Icon name="pencil" size={14} />
        </button>
      </header>

      {!vergangen && offenAusFrueheren.length > 0 && (
        <section>
          <h3 className="lbl mb-1.5">Offene Pendenzen aus früheren Sitzungen ({offenAusFrueheren.length})</h3>
          <div className="pendenzen-liste divide-y divide-line overflow-hidden border border-line">
            {offenAusFrueheren.map((t) => (
              <TodoRow key={t.id} todo={t} onChanged={onChanged} onDeleted={onChanged} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="lbl mb-1.5">Traktanden</h3>
        {sitzung.traktanden.length === 0 && <p className="text-sm text-dim">Noch keine. Schreib das erste Traktandum rein.</p>}
        <div className="space-y-1">
          {sitzung.traktanden.map((t, i) => (
            <div key={t.id} className="flex items-start gap-2 py-0.5">
              <button
                className={`traktandum-check mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center border text-[10px] ${t.erledigt ? "on" : ""}`}
                onClick={() => toggle(t)}
                aria-label={t.erledigt ? "Als offen markieren" : "Als behandelt markieren"}
              >
                <Icon name="check" size={11} />
              </button>
              <span className={`min-w-0 flex-1 text-sm ${t.erledigt ? "text-dim line-through" : "text-ink"}`}>
                <span className="mr-1.5 text-xs text-mute">{i + 1}.</span>
                {t.text}
                {t.autorName && <span className="ml-1.5 text-xs text-mute">({t.autorName})</span>}
              </span>
              <button className="shrink-0 text-mute hover:text-ink" onClick={() => removeTraktandum(t)} aria-label="Traktandum löschen">
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
        {vergangen && offene > 0 && naechsteGeplant && (
          <button className="btn-ghost mt-2 w-full py-1.5 text-sm" onClick={offeneUebernehmen} disabled={uebernehmen}>
            {uebernehmen ? "Verschiebe …" : `${offene} offene ${offene === 1 ? "Traktandum" : "Traktanden"} in die nächste Sitzung`}
          </button>
        )}
      </section>

      <Pendenzen sitzung={sitzung} ressortId={ressortId} onChanged={onChanged} />

      <Protokoll sitzung={sitzung} onChanged={onChanged} />
    </article>
  );
}

// Pendenzen: was an dieser Sitzung beschlossen wurde, mit Zuständigen und Frist.
function Pendenzen({ sitzung, ressortId, onChanged }: { sitzung: Sitzung; ressortId: number; onChanged: () => void }) {
  const [titel, setTitel] = useState("");
  const [zustaendig, setZustaendig] = useState<number[]>([]);
  const [frist, setFrist] = useState("");
  const [offen, setOffen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!titel.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/todos", { ressortId, sitzungId: sitzung.id, titel: titel.trim(), assigneeIds: zustaendig, fristDatum: frist || null });
      setTitel("");
      setZustaendig([]);
      setFrist("");
      setOffen(false);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h3 className="lbl">Pendenzen ({sitzung.pendenzen.length})</h3>
        {!offen && (
          <button className="text-xs font-semibold text-ink hover:underline" onClick={() => setOffen(true)}>
            + Pendenz
          </button>
        )}
      </div>
      {sitzung.pendenzen.length === 0 && !offen && (
        <p className="text-sm text-dim">Keine. Beschlossene Aufgaben hier erfassen, sie landen bei den Zuständigen unter «Meine Sachen».</p>
      )}
      {sitzung.pendenzen.length > 0 && (
        <div className="pendenzen-liste divide-y divide-line overflow-hidden border border-line">
          {sitzung.pendenzen.map((t) => (
            <TodoRow key={t.id} todo={t} onChanged={onChanged} onDeleted={onChanged} />
          ))}
        </div>
      )}
      {offen && (
        <div className="mt-2 space-y-3 border border-line p-3">
          <input
            className="input w-full text-sm"
            placeholder="Was ist zu tun? z. B. «Fabienne zurückschreiben»"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            autoFocus
          />
          <div>
            <p className="label">Wer?</p>
            <AssigneePicker selected={zustaendig} onChange={setZustaendig} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="label">Bis wann? (optional)</p>
              <input type="date" className="input text-sm" value={frist} onChange={(e) => setFrist(e.target.value)} />
            </div>
            <div className="ml-auto flex gap-2">
              <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setOffen(false)}>
                Abbrechen
              </button>
              <button className="btn-primary px-3 py-1.5 text-sm" onClick={save} disabled={saving || !titel.trim()}>
                {saving ? "Speichern …" : "Pendenz erfassen"}
              </button>
            </div>
          </div>
          {error && <p className="err-box">{error}</p>}
        </div>
      )}
    </section>
  );
}

// Protokoll der Sitzung: zugeklappt, solange leer; Freitext mit Zeilenumbrüchen.
function Protokoll({ sitzung, onChanged }: { sitzung: Sitzung; onChanged: () => void }) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const [text, setText] = useState(sitzung.protokoll);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/sitzungen/${sitzung.id}`, { protokoll: text });
      setBearbeiten(false);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const vorlage = () =>
    sitzung.traktanden.map((t, i) => `${i + 1}. ${t.text}\n`).join("\n");

  return (
    <div className="mt-3 border-t border-line pt-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="lbl">Protokoll</p>
        {!bearbeiten && (
          <button
            className="text-xs text-dim underline-offset-2 active:scale-95"
            onClick={() => {
              setText(sitzung.protokoll || vorlage());
              setBearbeiten(true);
            }}
          >
            {sitzung.protokoll ? "Bearbeiten" : "Protokoll schreiben"}
          </button>
        )}
      </div>
      {bearbeiten ? (
        <div className="mt-1.5 space-y-2">
          <textarea
            className="input min-h-48 w-full text-sm leading-relaxed"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Was wurde besprochen und entschieden?"
            autoFocus
          />
          {error && <p className="err-box">{error}</p>}
          <div className="flex gap-2">
            <button
              className="btn-ghost flex-1 py-1.5 text-sm"
              onClick={() => {
                setText(sitzung.protokoll);
                setBearbeiten(false);
              }}
            >
              Abbrechen
            </button>
            <button className="btn-primary flex-1 py-1.5 text-sm" onClick={save} disabled={saving}>
              {saving ? "Speichern …" : "Speichern"}
            </button>
          </div>
        </div>
      ) : sitzung.protokoll ? (
        <ProtokollText text={sitzung.protokoll} />
      ) : null}
    </div>
  );
}

// Protokolltext mit anklickbaren Links; lange Protokolle zuerst eingeklappt.
function ProtokollText({ text }: { text: string }) {
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
