"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/components/AuthContext";
import { Avatar, Modal, Spinner } from "@/components/Ui";
import { formatDate, formatDateLong, isOverdue } from "@/lib/uiUtil";
import type { RessortSummary, TodoStatus, Verfuegbarkeit } from "@/lib/uiTypes";

interface HqTraktandum {
  id: number;
  text: string;
  erledigt: boolean;
  autorName: string | null;
}

interface HqAnfrage {
  id: number;
  titel: string;
  link: string;
  autorName: string | null;
  ja: number;
  vielleicht: number;
  nein: number;
}

interface HqTodo {
  id: number;
  titel: string;
  status: TodoStatus;
  fristDatum: string | null;
  ressortName: string;
  mir: boolean;
}

interface HqDaten {
  sitzungsRessortId: number | null;
  naechsteSitzung: { id: number; datum: string; startzeit: string; ort: string; traktanden: HqTraktandum[] } | null;
  letzteSitzung: { id: number; datum: string; hatProtokoll: boolean; offeneTraktanden: number } | null;
  booking: { ressortId: number; total: number; offenFuerMich: HqAnfrage[]; offenFuerMichCount: number } | null;
  todos: { total: number; mir: number; liste: HqTodo[] };
}

// HQ (Headquarter): Cockpit des Vereins, unabhängig von den Anlässen.
// Oben, was ansteht (nächste Sitzung, Stimmungsbild, offene Todos), darunter die Vereinsressorts.
// Bewusst invertiert zum Rest der App: weisser Hintergrund, schwarz/weiss mit Graustufen, gerundete Kacheln.
export default function HqPage() {
  const { user } = useAuth();
  const [ressorts, setRessorts] = useState<RessortSummary[] | null>(null);
  const [daten, setDaten] = useState<HqDaten | null>(null);
  const [error, setError] = useState("");
  const [neuOpen, setNeuOpen] = useState(false);

  const load = useCallback(() => {
    api
      .get<{ ressorts: RessortSummary[] }>("/ressorts?hq=1")
      .then((d) => setRessorts(d.ressorts))
      .catch((e) => setError((e as Error).message));
    api
      .get<HqDaten>("/hq")
      .then(setDaten)
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="-mx-4 -mt-4 -mb-24 min-h-[100dvh] bg-white px-4 pb-28 pt-5 lg:m-0 lg:min-h-0 lg:rounded-3xl lg:px-8 lg:pb-8 lg:pt-7">
      <div className="px-1">
        <h1 className="page-title text-neutral-950">HQ</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Verein: was ansteht, unabhängig von den Anlässen</p>
      </div>

      {error && <p className="mt-4 rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700">{error}</p>}

      {!daten && !error ? (
        <div className="mt-6 text-neutral-500">
          <Spinner label="Lade HQ …" />
        </div>
      ) : daten ? (
        <div className="mt-4 grid gap-6 lg:mt-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <SitzungBlock daten={daten} onChanged={load} />
          <div className="space-y-6">
            {daten.booking && daten.booking.total > 0 && <BookingBlock booking={daten.booking} onChanged={load} />}
            <TodoBlock todos={daten.todos} />
          </div>
        </div>
      ) : null}

      <div className="mt-6 lg:mt-8">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Ressorts</h2>
          {user?.rolle === "admin" && (
            <button className="text-xs font-semibold text-neutral-950 hover:underline active:scale-95" onClick={() => setNeuOpen(true)}>
              + Ressort
            </button>
          )}
        </div>
        {!ressorts && !error ? (
          <div className="text-neutral-500">
            <Spinner label="Lade Ressorts …" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(ressorts ?? []).map((r) => (
              <HqKachel key={r.id} ressort={r} />
            ))}
          </div>
        )}
      </div>

      {neuOpen && (
        <NeuesRessortModal
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

function BlockTitel({ children, href, linkText }: { children: React.ReactNode; href?: string; linkText?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{children}</h2>
      {href && (
        <Link href={href} className="text-xs font-semibold text-neutral-950 hover:underline">
          {linkText} →
        </Link>
      )}
    </div>
  );
}

// Nächste Sitzung mit Traktanden zum direkten Ergänzen, dazu der Stand der letzten.
function SitzungBlock({ daten, onChanged }: { daten: HqDaten; onChanged: () => void }) {
  const { sitzungsRessortId: rid, naechsteSitzung: s, letzteSitzung: letzte } = daten;
  const [neuText, setNeuText] = useState("");
  const [saving, setSaving] = useState(false);
  if (!rid) return null;

  const add = async () => {
    if (!s || !neuText.trim() || saving) return;
    setSaving(true);
    try {
      await api.post(`/sitzungen/${s.id}/traktanden`, { text: neuText.trim() });
      setNeuText("");
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (t: HqTraktandum) => {
    await api.patch(`/traktanden/${t.id}`, { erledigt: !t.erledigt });
    onChanged();
  };

  return (
    <section>
      <BlockTitel href={`/hq/${rid}`} linkText="Alle Sitzungen">
        Nächste Sitzung
      </BlockTitel>
      {s ? (
        <div className="rounded-2xl bg-neutral-950 p-4 text-white">
          <Link href={`/hq/sitzung/${s.id}`} className="group flex items-start justify-between gap-3">
            <p className="text-[17px] font-semibold group-hover:underline">
              {formatDateLong(s.datum)}
              {s.startzeit && <span className="text-neutral-400"> · {s.startzeit} Uhr</span>}
            </p>
            <span className="shrink-0 text-xs font-semibold text-neutral-400 group-hover:text-white">Öffnen →</span>
          </Link>
          {s.ort && <p className="mt-0.5 text-xs text-neutral-400">{s.ort}</p>}
          <div className="mt-3 space-y-1 border-t border-neutral-800 pt-2.5">
            {s.traktanden.length === 0 && <p className="text-xs text-neutral-400">Noch keine Traktanden. Schreib das erste rein.</p>}
            {s.traktanden.map((t, i) => (
              <button key={t.id} className="flex w-full items-start gap-2 rounded-md py-0.5 text-left hover:bg-neutral-900" onClick={() => toggle(t)}>
                <span
                  className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-md border text-[10px] ${
                    t.erledigt ? "border-white bg-white text-neutral-950" : "border-neutral-600 text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className={`min-w-0 flex-1 text-sm ${t.erledigt ? "text-neutral-500 line-through" : ""}`}>
                  <span className="mr-1.5 text-xs text-neutral-500">{i + 1}.</span>
                  {t.text}
                  {t.autorName && <span className="ml-1.5 text-xs text-neutral-500">({t.autorName})</span>}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              placeholder="Traktandum hinzufügen …"
              value={neuText}
              onChange={(e) => setNeuText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <button
              className="shrink-0 rounded-xl bg-white px-3.5 text-sm font-semibold text-neutral-950 active:scale-95 disabled:opacity-40"
              onClick={add}
              disabled={saving || !neuText.trim()}
            >
              +
            </button>
          </div>
        </div>
      ) : (
        <Link href={`/hq/${rid}`} className="block rounded-2xl bg-neutral-100 p-4 ring-1 ring-neutral-200 hover:bg-neutral-200/70 active:bg-neutral-200">
          <p className="font-semibold text-neutral-950">Keine Sitzung geplant</p>
          <p className="mt-0.5 text-xs text-neutral-500">Tippen, um die nächste zu planen. Alle werden benachrichtigt.</p>
        </Link>
      )}
      {letzte && (!letzte.hatProtokoll || letzte.offeneTraktanden > 0) && (
        <Link
          href={`/hq/sitzung/${letzte.id}`}
          className="mt-2 flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-100 active:bg-neutral-100"
        >
          <span className="min-w-0 truncate">
            Letzte Sitzung {formatDate(letzte.datum)}:{" "}
            {[
              !letzte.hatProtokoll && "Protokoll fehlt",
              letzte.offeneTraktanden > 0 && `${letzte.offeneTraktanden} ${letzte.offeneTraktanden === 1 ? "Traktandum" : "Traktanden"} offen`,
            ]
              .filter(Boolean)
              .join(", ")}
          </span>
          <span className="shrink-0 text-neutral-400">→</span>
        </Link>
      )}
    </section>
  );
}

// Booking-Anfragen, zu denen ich noch keine Stimme abgegeben habe, direkt bewertbar.
function BookingBlock({ booking, onChanged }: { booking: NonNullable<HqDaten["booking"]>; onChanged: () => void }) {
  const vote = async (id: number, wert: Verfuegbarkeit) => {
    await api.post(`/booking/${id}/vote`, { wert });
    onChanged();
  };

  return (
    <section>
      <BlockTitel href={`/hq/${booking.ressortId}`} linkText="Alle Anfragen">
        Stimmungsbild Booking
      </BlockTitel>
      {booking.offenFuerMichCount === 0 ? (
        <p className="rounded-xl px-3 py-2 text-sm text-neutral-500 ring-1 ring-neutral-200">Du hast alle {booking.total} Anfragen bewertet.</p>
      ) : (
        <div className="space-y-2">
          {booking.offenFuerMich.map((a) => (
            <div key={a.id} className="rounded-2xl bg-neutral-100 p-3.5 ring-1 ring-neutral-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-950">
                    {a.link ? (
                      <a href={a.link} target="_blank" rel="noreferrer" className="underline decoration-neutral-300 underline-offset-2">
                        {a.titel}
                      </a>
                    ) : (
                      a.titel
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {a.autorName && `von ${a.autorName} · `}
                    {a.ja} Ja, {a.vielleicht} Vielleicht, {a.nein} Nein
                  </p>
                </div>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {(["ja", "vielleicht", "nein"] as const).map((w) => (
                  <button
                    key={w}
                    className="rounded-lg bg-white py-1.5 text-sm font-medium text-neutral-950 ring-1 ring-neutral-300 hover:bg-neutral-950 hover:text-white active:bg-neutral-950 active:text-white"
                    onClick={() => vote(a.id, w)}
                  >
                    {w === "ja" ? "Ja" : w === "vielleicht" ? "Vielleicht" : "Nein"}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {booking.offenFuerMichCount > booking.offenFuerMich.length && (
            <p className="px-1 text-xs text-neutral-500">
              und {booking.offenFuerMichCount - booking.offenFuerMich.length} weitere ohne deine Stimme
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// Offene Todos aller Vereinsressorts, meine zuerst.
function TodoBlock({ todos }: { todos: HqDaten["todos"] }) {
  return (
    <section>
      <BlockTitel>
        Offene Todos{todos.total > 0 && ` · ${todos.total}${todos.mir > 0 ? `, ${todos.mir} bei dir` : ""}`}
      </BlockTitel>
      {todos.total === 0 ? (
        <p className="rounded-xl px-3 py-2 text-sm text-neutral-500 ring-1 ring-neutral-200">Im Verein ist gerade nichts offen.</p>
      ) : (
        <div className="divide-y divide-neutral-200 overflow-hidden rounded-2xl ring-1 ring-neutral-200">
          {todos.liste.map((t) => (
            <Link key={t.id} href={`/todo/${t.id}`} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-neutral-50 active:bg-neutral-100">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-950">{t.titel}</p>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {t.ressortName}
                  {t.status === "in_arbeit" && " · in Arbeit"}
                </p>
              </div>
              {t.fristDatum && (
                <span className={`shrink-0 text-xs ${isOverdue(t.fristDatum, t.status) ? "font-semibold text-neutral-950 underline" : "text-neutral-500"}`}>
                  {formatDate(t.fristDatum)}
                </span>
              )}
              {t.mir && <span className="shrink-0 rounded-full bg-neutral-950 px-2 py-0.5 text-[11px] font-bold text-white">Du</span>}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function NeuesRessortModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) return setError("Name erforderlich");
    setSaving(true);
    setError("");
    try {
      await api.post("/ressorts", { hq: true, name: name.trim(), beschreibung: beschreibung.trim(), farbe: "#a3a3a3" });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Neues HQ-Ressort"
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            {saving ? "Speichern …" : "Anlegen"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Mitglieder" autoFocus />
        </div>
        <div>
          <label className="label">Beschreibung (optional)</label>
          <input className="input" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
        </div>
        {error && <p className="err-box">{error}</p>}
      </div>
    </Modal>
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
      href={`/hq/${r.id}`}
      className="flex items-center gap-4 rounded-2xl bg-neutral-100 p-4 ring-1 ring-neutral-200 transition hover:bg-neutral-200/70 active:scale-[0.985] active:bg-neutral-200"
    >
      <span className="grid h-13 w-13 shrink-0 place-items-center rounded-xl bg-neutral-950 text-white">
        <HqIcon name={r.name} size={26} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-semibold text-neutral-950">{r.name}</p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">{infoZeile(r)}</p>
        {r.leads.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1 grayscale">
            {r.leads.map((l) => (
              <Avatar key={l.id} name={l.name} color={l.avatarColor} size={17} userId={l.id} showName={false} />
            ))}
          </div>
        )}
      </div>
      {r.openTodos > 0 && (
        <span
          className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-neutral-950 px-1.5 text-xs font-bold text-white"
          title={`${r.openTodos} offene Todos`}
        >
          {r.openTodos}
        </span>
      )}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-neutral-400">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

// Eigene Strichzeichnungen für die HQ-Ressorts (monochrom, runde Linien).
function HqIcon({ name, size }: { name: string; size: number }) {
  const n = name.toLowerCase();
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (n.includes("sitzung")) {
    // Zwei Sprechblasen — die Runde am Tisch.
    return (
      <svg {...props}>
        <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h7A2.5 2.5 0 0 1 15 6.5v4a2.5 2.5 0 0 1-2.5 2.5H9l-4 3v-3h-.5A2.5 2.5 0 0 1 3 10.5v-4z" />
        <path d="M18 9.5h.5a2.5 2.5 0 0 1 2.5 2.5v7l-3.5-2.5H13" />
      </svg>
    );
  }
  if (n.includes("retraite")) {
    // Berge mit Sonne — raus aus dem Alltag.
    return (
      <svg {...props}>
        <circle cx="17.5" cy="6.5" r="2.3" />
        <path d="M3 19h18" />
        <path d="M4 19l5.5-9 3.5 5.5" />
        <path d="M11 19l4.5-7L21 19" />
      </svg>
    );
  }
  if (n.includes("infrastruktur") || n.includes("revision")) {
    // Halle mit Tor — das Haus in Schuss halten.
    return (
      <svg {...props}>
        <path d="M4 20V9.5L12 4l8 5.5V20" />
        <path d="M3 20h18" />
        <path d="M9.5 20v-5.5h5V20" />
      </svg>
    );
  }
  if (n.includes("booking")) {
    // Kalender mit Stern — Acts landen im Kalender.
    return (
      <svg {...props}>
        <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
        <path d="M8 3.5v4M16 3.5v4M3.5 10.5h17" />
        <path d="M12 12.8l.85 1.7 1.9.3-1.4 1.35.35 1.9-1.7-.9-1.7.9.35-1.9-1.4-1.35 1.9-.3z" />
      </svg>
    );
  }
  // Fallback: Punkt-Raster.
  return (
    <svg {...props}>
      <circle cx="7" cy="7" r="1.2" />
      <circle cx="17" cy="7" r="1.2" />
      <circle cx="7" cy="17" r="1.2" />
      <circle cx="17" cy="17" r="1.2" />
    </svg>
  );
}
