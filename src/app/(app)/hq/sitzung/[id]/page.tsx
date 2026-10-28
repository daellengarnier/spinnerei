"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import { Avatar, AvatarStack, Modal, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { TodoRow } from "@/components/TodoRow";
import { AssigneePicker } from "@/components/AssigneePicker";
import { ProtokollText, SitzungModal } from "@/components/Sitzungen";
import { useUsers } from "@/lib/useUsers";
import { formatDate, formatDateLong } from "@/lib/uiUtil";
import type { Todo } from "@/lib/uiTypes";

interface Pendenz extends Todo {
  sitzungDatum: string | null;
  traktandumId: number | null;
  erledigtNotiz: string;
}

interface Traktandum {
  id: number;
  text: string;
  notizen: string;
  erledigt: boolean;
  autorName: string | null;
  pendenzen: Pendenz[];
}

interface Detail {
  sitzung: {
    id: number;
    ressortId: number;
    datum: string;
    startzeit: string;
    ort: string;
    protokoll: string;
    sitzungsleitung: string;
    protokollfuehrung: string;
  };
  anwesend: number[];
  vorher: { id: number; datum: string } | null;
  nachher: { id: number; datum: string } | null;
  traktanden: Traktandum[];
  pendenzenOhneTraktandum: Pendenz[];
  offenAusFrueheren: Pendenz[];
  erledigtSeitLetzter: Pendenz[];
}

// Eine Vereinssitzung zum Protokollieren, aufgebaut wie die Sitzungen in der
// VIA-App: oben Leitung, Protokoll und Anwesende, dann die offenen Pendenzen
// aus früheren Sitzungen, dann jedes Traktandum mit eigenen Notizen und
// Pendenzen. Pendenzen sind Todos und erscheinen bei den Zuständigen unter
// «Meine Sachen».
export default function SitzungSeite() {
  const id = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [kopiert, setKopiert] = useState(false);

  const load = useCallback(() => {
    api
      .get<Detail>(`/sitzungen/${id}`)
      .then(setD)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <HqRahmen><p className="err-box">{error}</p></HqRahmen>;
  if (!d) return <HqRahmen><Spinner label="Lade Sitzung …" /></HqRahmen>;
  const s = d.sitzung;

  const patchSitzung = (body: Record<string, unknown>) => api.patch(`/sitzungen/${id}`, body);

  const verschieben = async (index: number, richtung: -1 | 1) => {
    const ids = d.traktanden.map((t) => t.id);
    const ziel = index + richtung;
    if (ziel < 0 || ziel >= ids.length) return;
    [ids[index], ids[ziel]] = [ids[ziel], ids[index]];
    await api.put(`/sitzungen/${id}/traktanden`, { ids });
    load();
  };

  const kopieren = async () => {
    await navigator.clipboard.writeText(protokollAlsText(d));
    setKopiert(true);
    setTimeout(() => setKopiert(false), 2000);
  };

  return (
    <HqRahmen>
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center justify-between gap-3 px-1 text-sm">
          <Link href={`/hq/${s.ressortId}`} className="text-dim hover:text-ink">
            ← Sitzungen
          </Link>
          <span className="flex gap-3 text-dim">
            {d.vorher && (
              <Link href={`/hq/sitzung/${d.vorher.id}`} className="hover:text-ink">
                ‹ {formatDate(d.vorher.datum)}
              </Link>
            )}
            {d.nachher && (
              <Link href={`/hq/sitzung/${d.nachher.id}`} className="hover:text-ink">
                {formatDate(d.nachher.datum)} ›
              </Link>
            )}
          </span>
        </nav>

        <header className="mt-2 flex items-start justify-between gap-3 px-1">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">{formatDateLong(s.datum)}</h1>
            <p className="mt-1 text-sm text-dim">{[s.startzeit && `${s.startzeit} Uhr`, s.ort].filter(Boolean).join(" · ") || "Sitzung"}</p>
          </div>
          <button className="btn-ghost shrink-0 px-2.5 py-1.5 text-sm" onClick={() => setEditOpen(true)} aria-label="Datum, Zeit, Ort ändern">
            <Icon name="pencil" size={14} />
          </button>
        </header>

        <Rahmendaten detail={d} onPatch={patchSitzung} onChanged={load} />

        {(d.offenAusFrueheren.length > 0 || d.erledigtSeitLetzter.length > 0) && (
          <FruehererPendenzen offen={d.offenAusFrueheren} erledigt={d.erledigtSeitLetzter} onChanged={load} />
        )}

        <section className="mt-6">
          <h2 className="lbl mb-2 px-1">Traktanden</h2>
          <div className="space-y-3">
            {d.traktanden.map((t, i) => (
              <TraktandumKarte
                key={t.id}
                nummer={i + 1}
                traktandum={t}
                sitzungId={id}
                ressortId={s.ressortId}
                erstes={i === 0}
                letztes={i === d.traktanden.length - 1}
                onVerschieben={(r) => verschieben(i, r)}
                onChanged={load}
              />
            ))}
          </div>
          <NeuesTraktandum sitzungId={id} onAdded={load} />
        </section>

        {d.pendenzenOhneTraktandum.length > 0 && (
          <section className="mt-6">
            <h2 className="lbl mb-2 px-1">Weitere Pendenzen dieser Sitzung</h2>
            <div className="card divide-y divide-line overflow-hidden">
              {d.pendenzenOhneTraktandum.map((t) => (
                <TodoRow key={t.id} todo={t} onChanged={load} onDeleted={load} />
              ))}
            </div>
          </section>
        )}

        <WeitereNotizen text={s.protokoll} onSave={async (protokoll) => { await patchSitzung({ protokoll }); load(); }} />

        <div className="mt-6 flex flex-wrap gap-2">
          <button className="btn-ghost flex-1" onClick={kopieren}>
            <Icon name="copy" size={15} /> {kopiert ? "Kopiert" : "Protokoll als Text kopieren"}
          </button>
        </div>
        <p className="mt-1.5 px-1 text-xs text-dim">Zum Einfügen ins Google Doc oder in eine Mail.</p>
      </div>

      {editOpen && (
        <SitzungModal
          ressortId={s.ressortId}
          sitzung={s}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            // Gelöscht? Dann zurück zur Übersicht.
            api.get(`/sitzungen/${id}`).then(load, () => router.replace(`/hq/${s.ressortId}`));
          }}
        />
      )}
    </HqRahmen>
  );
}

function HqRahmen({ children }: { children: React.ReactNode }) {
  return (
    <div className="hq-light -mx-4 -mt-4 -mb-24 min-h-[100dvh] px-4 pb-28 pt-5 lg:m-0 lg:min-h-0 lg:rounded-3xl lg:px-8 lg:pb-10 lg:pt-7">
      {children}
    </div>
  );
}

// Sitzungsleitung, Protokollführung, Anwesende.
function Rahmendaten({ detail: d, onPatch, onChanged }: { detail: Detail; onPatch: (b: Record<string, unknown>) => Promise<unknown>; onChanged: () => void }) {
  const users = useUsers();
  const [leitung, setLeitung] = useState(d.sitzung.sitzungsleitung);
  const [protokoll, setProtokoll] = useState(d.sitzung.protokollfuehrung);
  const [anwesend, setAnwesend] = useState(d.anwesend);
  const [anwesendOffen, setAnwesendOffen] = useState(false);
  const namen = users.filter((u) => anwesend.includes(u.id));

  return (
    <section className="card mt-5 space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Sitzungsleitung</label>
          <input
            className="input w-full text-sm"
            value={leitung}
            list="sitzung-namen"
            placeholder="Name …"
            onChange={(e) => setLeitung(e.target.value)}
            onBlur={() => leitung !== d.sitzung.sitzungsleitung && onPatch({ sitzungsleitung: leitung })}
          />
        </div>
        <div>
          <label className="label">Protokoll</label>
          <input
            className="input w-full text-sm"
            value={protokoll}
            list="sitzung-namen"
            placeholder="Name …"
            onChange={(e) => setProtokoll(e.target.value)}
            onBlur={() => protokoll !== d.sitzung.protokollfuehrung && onPatch({ protokollfuehrung: protokoll })}
          />
        </div>
        <datalist id="sitzung-namen">
          {users.map((u) => (
            <option key={u.id} value={u.name} />
          ))}
        </datalist>
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <label className="label mb-0">Anwesend ({anwesend.length})</label>
          <button className="text-xs font-semibold text-ink hover:underline" onClick={() => setAnwesendOffen((o) => !o)}>
            {anwesendOffen ? "Fertig" : "Bearbeiten"}
          </button>
        </div>
        {anwesendOffen ? (
          <div className="mt-2">
            <AssigneePicker
              selected={anwesend}
              onChange={async (ids) => {
                setAnwesend(ids);
                await onPatch({ anwesendIds: ids });
                onChanged();
              }}
            />
          </div>
        ) : namen.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {namen.map((u) => (
              <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface2 py-0.5 pl-0.5 pr-2.5 text-sm">
                <Avatar name={u.name} color={u.avatarColor} size={20} userId={u.id} showName={false} />
                {u.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-dim">Noch niemand eingetragen.</p>
        )}
      </div>
    </section>
  );
}

// Pendenzen aus früheren Sitzungen: offen abhaken (mit Notiz), erledigte seit der letzten.
function FruehererPendenzen({ offen, erledigt, onChanged }: { offen: Pendenz[]; erledigt: Pendenz[]; onChanged: () => void }) {
  const [abhaken, setAbhaken] = useState<Pendenz | null>(null);
  return (
    <section className="mt-6">
      <h2 className="lbl mb-2 px-1">Pendenzen aus früheren Sitzungen</h2>
      <div className="card divide-y divide-line overflow-hidden">
        {offen.map((p) => (
          <div key={p.id} className="flex items-start gap-3 px-4 py-3">
            <button
              className="traktandum-check mt-0.5 grid h-5 w-5 shrink-0 place-items-center border"
              onClick={() => setAbhaken(p)}
              aria-label="Als erledigt markieren"
            >
              <Icon name="check" size={12} />
            </button>
            <Link href={`/todo/${p.id}`} className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{p.titel}</p>
              <p className="mt-0.5 text-xs text-dim">
                aus der Sitzung vom {p.sitzungDatum ? formatDate(p.sitzungDatum) : "?"}
                {p.status === "in_arbeit" && " · in Arbeit"}
                {p.fristDatum && ` · bis ${formatDate(p.fristDatum)}`}
              </p>
            </Link>
            {p.assignees.length > 0 && <AvatarStack users={p.assignees} size={22} />}
          </div>
        ))}
        {erledigt.map((p) => (
          <div key={p.id} className="flex items-start gap-3 px-4 py-3">
            <span className="traktandum-check on mt-0.5 grid h-5 w-5 shrink-0 place-items-center border">
              <Icon name="check" size={12} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-dim line-through">{p.titel}</p>
              <p className="mt-0.5 text-xs text-dim">Erledigt seit der letzten Sitzung{p.erledigtNotiz && `: ${p.erledigtNotiz}`}</p>
            </div>
            {p.assignees.length > 0 && <AvatarStack users={p.assignees} size={22} />}
          </div>
        ))}
      </div>
      {abhaken && (
        <ErledigtModal
          pendenz={abhaken}
          onClose={() => setAbhaken(null)}
          onDone={() => {
            setAbhaken(null);
            onChanged();
          }}
        />
      )}
    </section>
  );
}

function ErledigtModal({ pendenz, onClose, onDone }: { pendenz: Pendenz; onClose: () => void; onDone: () => void }) {
  const [notiz, setNotiz] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/todos/${pendenz.id}`, { status: "erledigt", erledigtNotiz: notiz });
      onDone();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Pendenz erledigt"
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            {saving ? "Speichern …" : "Erledigt"}
          </button>
        </div>
      }
    >
      <p className="mb-3 text-sm font-medium text-ink">{pendenz.titel}</p>
      <label className="label">Wie ist es ausgegangen? (optional)</label>
      <textarea className="input min-h-20 w-full text-sm" value={notiz} onChange={(e) => setNotiz(e.target.value)} autoFocus />
    </Modal>
  );
}

// Ein Traktandum: Titel, Notizen (Protokoll) und die daraus entstandenen Pendenzen.
function TraktandumKarte({
  nummer,
  traktandum: t,
  sitzungId,
  ressortId,
  erstes,
  letztes,
  onVerschieben,
  onChanged,
}: {
  nummer: number;
  traktandum: Traktandum;
  sitzungId: number;
  ressortId: number;
  erstes: boolean;
  letztes: boolean;
  onVerschieben: (richtung: -1 | 1) => void;
  onChanged: () => void;
}) {
  const [titel, setTitel] = useState(t.text);
  const [titelEdit, setTitelEdit] = useState(false);
  const [notizen, setNotizen] = useState(t.notizen);
  const [gespeichert, setGespeichert] = useState<"" | "speichert" | "ok">("");
  const [pendenzOffen, setPendenzOffen] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Textfeld wächst mit dem Inhalt.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 64)}px`;
  }, [notizen]);

  const notizenSpeichern = async () => {
    if (notizen === t.notizen) return;
    setGespeichert("speichert");
    await api.patch(`/traktanden/${t.id}`, { notizen });
    setGespeichert("ok");
    setTimeout(() => setGespeichert(""), 1500);
  };

  const titelSpeichern = async () => {
    setTitelEdit(false);
    if (titel.trim() && titel.trim() !== t.text) {
      await api.patch(`/traktanden/${t.id}`, { text: titel.trim() });
      onChanged();
    } else setTitel(t.text);
  };

  return (
    <article className="card p-4">
      <div className="flex items-start gap-3">
        <div className="flex w-6 shrink-0 flex-col items-center pt-0.5 text-mute">
          <button className="leading-none hover:text-ink disabled:opacity-20" onClick={() => onVerschieben(-1)} disabled={erstes} aria-label="Nach oben">
            ▲
          </button>
          <span className="my-0.5 text-sm font-bold text-ink">{nummer}.</span>
          <button className="leading-none hover:text-ink disabled:opacity-20" onClick={() => onVerschieben(1)} disabled={letztes} aria-label="Nach unten">
            ▼
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {titelEdit ? (
              <input
                className="input w-full text-base font-semibold"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                onBlur={titelSpeichern}
                onKeyDown={(e) => e.key === "Enter" && titelSpeichern()}
                autoFocus
              />
            ) : (
              <button className="text-left text-base font-semibold text-ink hover:underline" onClick={() => setTitelEdit(true)} title="Titel ändern">
                {t.text}
              </button>
            )}
            <button className="shrink-0 text-mute hover:text-ink" onClick={() => setLoeschen(true)} aria-label="Traktandum löschen">
              <Icon name="close" size={15} />
            </button>
          </div>
          {t.autorName && <p className="text-xs text-mute">von {t.autorName}</p>}

          <textarea
            ref={ref}
            className="input mt-2.5 w-full resize-none text-sm leading-relaxed"
            placeholder="Was wurde besprochen und entschieden?"
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            onBlur={notizenSpeichern}
          />
          <p className="h-4 text-right text-[11px] text-mute">{gespeichert === "speichert" ? "Speichert …" : gespeichert === "ok" ? "Gespeichert" : ""}</p>

          {t.pendenzen.length > 0 && (
            <div className="pendenzen-liste mt-1 divide-y divide-line overflow-hidden border border-line">
              {t.pendenzen.map((p) => (
                <TodoRow key={p.id} todo={p} onChanged={onChanged} onDeleted={onChanged} />
              ))}
            </div>
          )}
          {pendenzOffen ? (
            <NeuePendenz
              sitzungId={sitzungId}
              traktandumId={t.id}
              ressortId={ressortId}
              onClose={() => setPendenzOffen(false)}
              onSaved={() => {
                setPendenzOffen(false);
                onChanged();
              }}
            />
          ) : (
            <button className="mt-2 text-sm font-semibold text-ink hover:underline" onClick={() => setPendenzOffen(true)}>
              + Pendenz
            </button>
          )}
        </div>
      </div>

      {loeschen && (
        <Modal
          open
          onClose={() => setLoeschen(false)}
          title="Traktandum löschen?"
          footer={
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setLoeschen(false)}>
                Abbrechen
              </button>
              <button
                className="btn-danger flex-1"
                onClick={async () => {
                  await api.del(`/traktanden/${t.id}`);
                  setLoeschen(false);
                  onChanged();
                }}
              >
                Löschen
              </button>
            </div>
          }
        >
          <p className="text-sm text-dim">«{t.text}» und die Notizen dazu werden gelöscht. Pendenzen bleiben bestehen.</p>
        </Modal>
      )}
    </article>
  );
}

function NeuePendenz({
  sitzungId,
  traktandumId,
  ressortId,
  onClose,
  onSaved,
}: {
  sitzungId: number;
  traktandumId: number;
  ressortId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titel, setTitel] = useState("");
  const [wer, setWer] = useState<number[]>([]);
  const [frist, setFrist] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!titel.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/todos", { ressortId, sitzungId, traktandumId, titel: titel.trim(), assigneeIds: wer, fristDatum: frist || null });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-line bg-surface2 p-3">
      <input
        className="input w-full text-sm"
        placeholder="Was ist zu tun?"
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        autoFocus
      />
      <div>
        <p className="label">Wer?</p>
        <AssigneePicker selected={wer} onChange={setWer} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="label">Bis wann? (optional)</p>
          <input type="date" className="input text-sm" value={frist} onChange={(e) => setFrist(e.target.value)} />
        </div>
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost px-3 py-1.5 text-sm" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary px-3 py-1.5 text-sm" onClick={save} disabled={saving || !titel.trim()}>
            {saving ? "Speichern …" : "Pendenz zuweisen"}
          </button>
        </div>
      </div>
      <p className="text-xs text-dim">Erscheint bei den Zuständigen unter «Meine Sachen», sie werden benachrichtigt.</p>
      {error && <p className="err-box">{error}</p>}
    </div>
  );
}

function NeuesTraktandum({ sitzungId, onAdded }: { sitzungId: number; onAdded: () => void }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const add = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await api.post(`/sitzungen/${sitzungId}/traktanden`, { text: text.trim() });
      setText("");
      onAdded();
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mt-3 flex gap-2">
      <input
        className="input flex-1 text-sm"
        placeholder="Neues Traktandum …"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
      />
      <button className="btn-primary shrink-0 px-4 text-sm" onClick={add} disabled={saving || !text.trim()}>
        Hinzufügen
      </button>
    </div>
  );
}

// Weitere Notizen zur Sitzung (z. B. importierte Protokolle aus Google Docs).
function WeitereNotizen({ text, onSave }: { text: string; onSave: (t: string) => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [wert, setWert] = useState(text);
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="lbl">Weitere Notizen</h2>
        {!edit && (
          <button className="text-xs font-semibold text-ink hover:underline" onClick={() => setEdit(true)}>
            {text ? "Bearbeiten" : "+ Notiz"}
          </button>
        )}
      </div>
      {edit ? (
        <div className="space-y-2">
          <textarea className="input min-h-32 w-full text-sm" value={wert} onChange={(e) => setWert(e.target.value)} autoFocus />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => { setWert(text); setEdit(false); }}>
              Abbrechen
            </button>
            <button className="btn-primary px-3 py-1.5 text-sm" onClick={async () => { await onSave(wert); setEdit(false); }}>
              Speichern
            </button>
          </div>
        </div>
      ) : text ? (
        <div className="card p-4">
          <ProtokollText text={text} />
        </div>
      ) : null}
    </section>
  );
}

// Protokoll als Klartext, z. B. fürs Google Doc.
function protokollAlsText(d: Detail): string {
  const s = d.sitzung;
  const zeilen = [`Protokoll Spinnerei Sitzung ${formatDateLong(s.datum)}`, ""];
  if (s.sitzungsleitung) zeilen.push(`Sitzungsleitung: ${s.sitzungsleitung}`);
  if (s.protokollfuehrung) zeilen.push(`Protokoll: ${s.protokollfuehrung}`);
  zeilen.push("");
  if (d.offenAusFrueheren.length || d.erledigtSeitLetzter.length) {
    zeilen.push("Pendenzen aus früheren Sitzungen");
    for (const p of d.erledigtSeitLetzter) zeilen.push(`• erledigt: ${p.titel}${p.erledigtNotiz ? ` (${p.erledigtNotiz})` : ""}`);
    for (const p of d.offenAusFrueheren) zeilen.push(`• offen: ${p.titel}${p.assignees.length ? ` (${p.assignees.map((a) => a.name).join(", ")})` : ""}`);
    zeilen.push("");
  }
  d.traktanden.forEach((t, i) => {
    zeilen.push(`${i + 1}. ${t.text}`);
    if (t.notizen.trim()) zeilen.push(t.notizen.trim());
    for (const p of t.pendenzen) {
      zeilen.push(`→ Pendenz: ${p.titel}${p.assignees.length ? ` (${p.assignees.map((a) => a.name).join(", ")})` : ""}${p.fristDatum ? `, bis ${formatDate(p.fristDatum)}` : ""}`);
    }
    zeilen.push("");
  });
  if (s.protokoll.trim()) zeilen.push(s.protokoll.trim());
  return zeilen.join("\n").trim() + "\n";
}
