"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { EmptyState, Modal, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/components/AuthContext";
import { icsHerunterladen, pdfHerunterladen, type UebersichtAnlass } from "@/lib/uebersichtExport";
import { istFolgetag } from "@/lib/uiUtil";

interface AnlassSummary {
  id: number;
  slug: string;
  name: string;
  datum: string; // YYYY-MM-DD
  openTodos: number;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Gute Nacht";
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Hallo";
  if (h < 23) return "Guten Abend";
  return "Gute Nacht";
}

const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const WOCHENTAGE_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function datumTeile(datum: string) {
  const [j, m, t] = datum.split("-").map(Number);
  const wochentag = WOCHENTAGE_KURZ[new Date(j ?? 2026, (m ?? 1) - 1, t ?? 1).getDay()] ?? "";
  return { tag: String(t).padStart(2, "0"), monat: MONATE_KURZ[(m ?? 1) - 1] ?? "", wochentag };
}

function istVorbei(datum: string) {
  const heute = new Date();
  const iso = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}-${String(heute.getDate()).padStart(2, "0")}`;
  return datum < iso;
}

export default function AnlaesseUebersicht() {
  const { user } = useAuth();
  const [anlaesse, setAnlaesse] = useState<AnlassSummary[] | null>(null);
  const [error, setError] = useState("");
  const [hi, setHi] = useState("Hallo");
  const [createOpen, setCreateOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState<"" | "pdf">("");
  const [archivOffen, setArchivOffen] = useState(false);
  const [details, setDetails] = useState<Map<number, UebersichtAnlass>>(new Map());

  const load = () =>
    api
      .get<{ anlaesse: AnlassSummary[] }>("/anlaesse")
      .then((d) => setAnlaesse(d.anlaesse))
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    setHi(greeting());
    load();
    api
      .get<{ anlaesse: UebersichtAnlass[] }>("/anlaesse/uebersicht")
      .then((d) => setDetails(new Map(d.anlaesse.map((a) => [a.id, a]))))
      .catch(() => undefined);
  }, []);

  const pdfExport = async () => {
    setExportBusy("pdf");
    try {
      const d = await api.get<{ anlaesse: UebersichtAnlass[] }>("/anlaesse/uebersicht");
      await pdfHerunterladen(d.anlaesse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExportBusy("");
    }
  };

  const kommende = (anlaesse ?? []).filter((a) => !istVorbei(a.datum));
  const vergangene = (anlaesse ?? []).filter((a) => istVorbei(a.datum)).reverse();

  return (
    <div className="space-y-5">
      <div className="px-1 pt-1">
        <h1 className="page-title">
          {hi}, <span className="brand-text">{user?.name}</span>
        </h1>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href="https://spinnplan-23.netlify.app" target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 text-sm">
            <Icon name="external" size={15} /> Spinnplan
          </a>
          {user?.rolle === "admin" && (
            <button className="btn-ghost py-1.5 text-sm" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={15} /> Anlass
            </button>
          )}
        </div>
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
          <h2 className="block-title">Kommende Anlässe</h2>
          <button
            className="inline-flex shrink-0 items-center gap-1 text-xs text-dim underline underline-offset-2 transition hover:text-accent disabled:opacity-50"
            onClick={pdfExport}
            disabled={exportBusy !== ""}
          >
            <Icon name="download" size={12} /> {exportBusy === "pdf" ? "Erstelle PDF …" : "Übersicht herunterladen"}
          </button>
        </div>
        {error && <p className="err-box">{error}</p>}
        {!anlaesse ? (
          <Spinner label="Lade Anlässe …" />
        ) : kommende.length === 0 ? (
          <EmptyState title="Keine kommenden Anlässe" hint={user?.rolle === "admin" ? "Lege oben einen Anlass an." : "Der Admin legt Anlässe an."} />
        ) : (
          <div className="space-y-2.5">
            {kommende.map((a) => (
              <AnlassKarte key={a.id} anlass={a} detail={details.get(a.id)} />
            ))}
          </div>
        )}
      </section>

      {vergangene.length > 0 && (
        <section>
          <button className="mb-2 flex w-full items-center justify-between gap-3 px-1" onClick={() => setArchivOffen((o) => !o)}>
            <h2 className="block-title">
              Archiv <span className="text-sm text-mute">({vergangene.length})</span>
            </h2>
            <Icon name="chevron" size={16} className={`text-mute transition-transform ${archivOffen ? "-rotate-90" : "rotate-90"}`} />
          </button>
          {archivOffen && (
            <div className="space-y-2.5 opacity-70">
              {vergangene.map((a) => (
                <AnlassKarte key={a.id} anlass={a} detail={details.get(a.id)} />
              ))}
            </div>
          )}
        </section>
      )}

      {createOpen && (
        <CreateAnlassModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AnlassKarte({ anlass, detail }: { anlass: AnlassSummary; detail?: UebersichtAnlass }) {
  const { tag, monat, wochentag } = datumTeile(anlass.datum);
  const [offen, setOffen] = useState(false);
  const zugangLabel = detail?.zugang === "privat" ? "Privat" : detail?.zugang === "oeffentlich" ? "Öffentlich" : "";
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3.5 p-3.5">
        <Link href={`/anlass/${anlass.id}`} className="flex min-w-0 flex-1 items-center gap-3.5 active:scale-[0.99]">
          <span className="date-badge shrink-0">
            <span className="date-badge-weekday">{wochentag}</span>
            <span className="date-badge-day">{tag}</span>
            <span className="date-badge-month">{monat}</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <span className="truncate">{anlass.name}</span>
              {detail && (
                <button
                  className="shrink-0 text-mute transition hover:text-accent active:scale-95"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    icsHerunterladen([detail], `Spinnerei_${anlass.name.replace(/[^\wäöüÄÖÜ-]+/g, "_")}.ics`);
                  }}
                  aria-label="In Kalender übertragen"
                  title="In Kalender übertragen"
                >
                  <Icon name="calendar" size={15} />
                </button>
              )}
            </p>
            {detail?.art && <p className="mt-0.5 truncate text-xs text-mute">{detail.art}</p>}
          </div>
          {anlass.openTodos > 0 && (
            <span className="count-badge" title={`${anlass.openTodos} offene Todos`}>
              {anlass.openTodos}
            </span>
          )}
        </Link>
        <button
          className="grid h-9 w-9 shrink-0 place-items-center border border-line2 text-dim active:scale-95"
          onClick={() => setOffen((o) => !o)}
          aria-label={offen ? "Details zuklappen" : "Details aufklappen"}
        >
          <Icon name="chevron" size={16} className={`transition-transform ${offen ? "-rotate-90" : "rotate-90"}`} />
        </button>
      </div>

      {offen && (
        <div className="border-t border-line px-3.5 pb-3.5 pt-2.5">
          {detail ? (
            <>
              {(detail.stichwort || zugangLabel) && (
                <div className="flex flex-wrap gap-1.5">
                  {detail.stichwort && <span className="chip bg-accent/10 text-accent">{detail.stichwort}</span>}
                  {zugangLabel && <span className="chip bg-surface2 text-dim">{zugangLabel}</span>}
                </div>
              )}
              {(detail.tueroeffnung || detail.essen || detail.ende || detail.petzilink) && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
                  {detail.tueroeffnung && <span>Türöffnung {detail.tueroeffnung}</span>}
                  {detail.essen && <span>Essen {detail.essen}</span>}
                  {detail.ende && (
                    <span>
                      Ende {detail.ende}
                      {istFolgetag(detail.tueroeffnung, detail.ende) && " (Folgetag)"}
                    </span>
                  )}
                  {detail.petzilink && (
                    <a href={detail.petzilink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent">
                      <Icon name="send" size={11} /> Petzi
                    </a>
                  )}
                </div>
              )}
              {detail.acts.length > 0 && (
                <div className="mt-2.5 space-y-1 border-t border-line pt-2">
                  {detail.acts.map((act, i) => (
                    <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                      <span className="font-semibold text-ink">
                        {act.showtime && <span className="brand-text mr-2 tabular-nums">{act.showtime}</span>}
                        {act.name || "Unbenannter Act"}
                      </span>
                      <span className="text-xs text-dim">{[act.genre, act.herkunft].filter(Boolean).join(" · ")}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-dim">Lade Details …</p>
          )}
        </div>
      )}
    </div>
  );
}

function CreateAnlassModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [datum, setDatum] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (!name.trim()) return setError("Name erforderlich");
    if (!datum) return setError("Datum erforderlich");
    setSaving(true);
    setError("");
    try {
      await api.post("/anlaesse", { name: name.trim(), datum });
      onCreated();
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
      title="Neuer Anlass"
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            {saving ? "Erstellen …" : "Erstellen"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="z. B. Frühlingsfest" />
        </div>
        <div>
          <label className="label">Datum</label>
          <input type="date" className="input" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>
        {error && <p className="err-box">{error}</p>}
      </div>
    </Modal>
  );
}
