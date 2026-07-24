"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/apiClient";
import { Avatar, EmptyState, Modal, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { ressortIcon } from "@/lib/ressortIcon";
import { ressortHint } from "@/lib/ressortHint";
import { useAuth } from "@/components/AuthContext";
import { useUsers } from "@/lib/useUsers";
import { formatDate } from "@/lib/uiUtil";
import type { RessortSummary } from "@/lib/uiTypes";

interface Anlass {
  id: number;
  slug: string;
  name: string;
  datum: string;
  tueroeffnung: string;
  essen: string;
  ende: string;
  mitEssen: boolean | null;
  petzilink: string;
  art: string;
  zugang: string;
  drivelink: string;
  abendverantwortungUserId: number | null;
  normaltarifCents: number | null;
  solitarifCents: number | null;
}

interface AnlassAct {
  id: number;
  ressortId: number;
  name: string;
  typ: string;
  getIn: string;
  soundcheck: string;
  showtime: string;
}

export default function AnlassDashboard() {
  const params = useParams<{ anlassId: string }>();
  const anlassId = Number(params.anlassId);
  const { user } = useAuth();
  const [anlass, setAnlass] = useState<Anlass | null>(null);
  const [acts, setActs] = useState<AnlassAct[]>([]);
  const [ressorts, setRessorts] = useState<RessortSummary[] | null>(null);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!anlassId) return;
    api
      .get<{ anlass: Anlass; acts: AnlassAct[] }>(`/anlaesse/${anlassId}`)
      .then((d) => {
        setAnlass(d.anlass);
        setActs(d.acts);
      })
      .catch((e) => setError((e as Error).message));
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
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="page-title">{anlass.name}</h1>
          <button
            className="grid h-8 w-8 shrink-0 place-items-center border border-line2 text-dim active:scale-95"
            onClick={() => setEditOpen(true)}
            aria-label="Anlass bearbeiten"
          >
            <Icon name="pencil" size={14} />
          </button>
        </div>
        <p className="mt-0.5 text-sm text-mute">{formatDate(anlass.datum)}</p>
      </div>

      {editOpen && (
        <AnlassEditModal
          anlass={anlass}
          onClose={() => setEditOpen(false)}
          onSaved={(name, datum) => {
            setAnlass({ ...anlass, name, datum });
            setEditOpen(false);
          }}
        />
      )}

      <Uebersicht anlass={anlass} acts={acts} onSaved={(a) => setAnlass(a)} />

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

const ZEIT_FELDER = [
  { key: "tueroeffnung", label: "Türöffnung" },
  { key: "ende", label: "Ende Anlass" },
] as const;

// Anlassübersicht: Eckzeiten & Petzilink (editierbar, optional — mit Reminder
// bei fehlenden Angaben) + Act-Zeiten aus dem Acts-Ressort.
function Uebersicht({ anlass, acts, onSaved }: { anlass: Anlass; acts: AnlassAct[]; onSaved: (a: Anlass) => void }) {
  const [werte, setWerte] = useState({
    tueroeffnung: anlass.tueroeffnung,
    essen: anlass.essen,
    ende: anlass.ende,
    petzilink: anlass.petzilink,
    art: anlass.art,
    zugang: anlass.zugang,
    drivelink: anlass.drivelink,
  });
  const [error, setError] = useState("");

  const save = async (key: keyof typeof werte, wert: string) => {
    setWerte((w) => ({ ...w, [key]: wert }));
    setError("");
    try {
      await api.patch(`/anlaesse/${anlass.id}`, { [key]: wert });
      onSaved({ ...anlass, ...werte, [key]: wert });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const nutzer = useUsers();
  const [mitEssen, setMitEssen] = useState<boolean | null>(anlass.mitEssen);
  const saveMitEssen = async (wert: boolean | null) => {
    setMitEssen(wert);
    if (wert !== true) setWerte((w) => ({ ...w, essen: "" }));
    setError("");
    try {
      await api.patch(`/anlaesse/${anlass.id}`, { mitEssen: wert });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const [tarife, setTarife] = useState({
    normaltarifCents: anlass.normaltarifCents,
    solitarifCents: anlass.solitarifCents,
  });
  const saveTarif = async (key: keyof typeof tarife, eingabe: string) => {
    const text = eingabe.trim().replace(",", ".");
    const cents = text === "" ? null : Math.round(Number(text) * 100);
    if (cents !== null && (!Number.isFinite(cents) || cents < 0)) {
      setError("Ticketpreis als Betrag in CHF, z. B. 25 oder 15.50");
      return;
    }
    if (cents === tarife[key]) return;
    setTarife((t) => ({ ...t, [key]: cents }));
    setError("");
    try {
      await api.patch(`/anlaesse/${anlass.id}`, { [key]: cents });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const [avId, setAvId] = useState<number | null>(anlass.abendverantwortungUserId);
  const saveAv = async (id: number | null) => {
    setAvId(id);
    setError("");
    try {
      await api.patch(`/anlaesse/${anlass.id}`, { abendverantwortungUserId: id });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const fehlend = [
    ...(werte.art ? [] : ["Art des Anlasses"]),
    ...(werte.zugang ? [] : ["Privat/Öffentlich"]),
    ...(avId ? [] : ["Abendverantwortung"]),
    ...ZEIT_FELDER.filter((f) => !werte[f.key]).map((f) => f.label),
    ...(mitEssen === null ? ["Essen (mit/ohne)"] : mitEssen && !werte.essen ? ["Zeit Essen"] : []),
    ...(werte.petzilink ? [] : ["Petzilink"]),
    ...(tarife.normaltarifCents != null || tarife.solitarifCents != null ? [] : ["Ticketpreise"]),
    ...(werte.drivelink ? [] : ["Drive-Ordner"]),
  ];
  const sortierteActs = [...acts].sort((a, b) => (a.showtime || "99:99").localeCompare(b.showtime || "99:99"));

  // Alles ausgefüllt → Formular standardmässig eingeklappt; von Hand umschaltbar.
  const [manuellOffen, setManuellOffen] = useState<boolean | null>(null);
  const offen = manuellOffen ?? fehlend.length > 0;

  return (
    <section className="card p-3.5">
      <button className="flex w-full items-center justify-between gap-3" onClick={() => setManuellOffen(!offen)}>
        <h2 className="block-title">Anlassübersicht</h2>
        <Icon name="chevron" size={16} className={`text-mute transition-transform ${offen ? "-rotate-90" : "rotate-90"}`} />
      </button>

      {offen && (
      <div className="mt-2.5">
      {fehlend.length > 0 && (
        <p className="mb-2.5 border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs text-accent">
          Noch offen: {fehlend.join(", ")} — bitte ausfüllen, sobald bekannt.
        </p>
      )}

      <div className="mb-2 flex gap-2">
        <div className="min-w-0 flex-1">
          <label className="label text-xs">Art des Anlasses</label>
          <input
            list="anlass-arten"
            className="input px-2 py-1.5 text-sm"
            placeholder="z. B. Konzert, Party, …"
            defaultValue={werte.art}
            onBlur={(e) => e.target.value.trim() !== werte.art && save("art", e.target.value.trim())}
          />
        </div>
        <div className="shrink-0">
          <label className="label text-xs">Zugang</label>
          <div className="seg p-0.5">
            {[
              { wert: "oeffentlich", label: "Öffentlich" },
              { wert: "privat", label: "Privat" },
            ].map((o) => (
              <button
                key={o.wert}
                className={`seg-item px-2.5 py-1 text-xs ${werte.zugang === o.wert ? "on" : ""}`}
                onClick={() => save("zugang", werte.zugang === o.wert ? "" : o.wert)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <datalist id="anlass-arten">
          <option value="Konzert" />
          <option value="Party" />
          <option value="Kinderdisco" />
          <option value="Daydance" />
          <option value="Fest" />
          <option value="Vermietung" />
        </datalist>
      </div>

      <div className="mb-2">
        <label className="label text-xs">Abendverantwortung (AV)</label>
        <select className="input px-2 py-1.5 text-sm" value={avId ?? ""} onChange={(e) => saveAv(e.target.value ? Number(e.target.value) : null)}>
          <option value="">— noch offen —</option>
          {nutzer.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ZEIT_FELDER.map((f) => (
          <div key={f.key}>
            <label className="label text-xs">{f.label}</label>
            <input
              type="time"
              className="input px-2 py-1.5 text-sm"
              value={werte[f.key]}
              onChange={(e) => save(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-end gap-2">
        <div className="shrink-0">
          <label className="label text-xs">Essen</label>
          <div className="seg p-0.5">
            {[
              { wert: true, label: "Mit" },
              { wert: false, label: "Ohne" },
            ].map((o) => (
              <button
                key={o.label}
                className={`seg-item px-2.5 py-1 text-xs ${mitEssen === o.wert ? "on" : ""}`}
                onClick={() => saveMitEssen(mitEssen === o.wert ? null : o.wert)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {mitEssen === true && (
          <div className="min-w-0 flex-1">
            <label className="label text-xs">Zeit Essen</label>
            <input type="time" className="input px-2 py-1.5 text-sm" value={werte.essen} onChange={(e) => save("essen", e.target.value)} />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label className="label text-xs">Petzilink (Ticketing)</label>
          <input
            type="url"
            className="input px-2 py-1.5 text-sm"
            placeholder="https://…"
            defaultValue={werte.petzilink}
            onBlur={(e) => e.target.value.trim() !== werte.petzilink && save("petzilink", e.target.value.trim())}
          />
        </div>
        {werte.petzilink && (
          <a href={werte.petzilink} target="_blank" rel="noopener noreferrer" className="btn-ghost shrink-0 px-3 py-1.5 text-sm">
            Öffnen
          </a>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {(
          [
            { key: "normaltarifCents", label: "Normaltarif (CHF)" },
            { key: "solitarifCents", label: "Solitarif (CHF)" },
          ] as const
        ).map((f) => (
          <div key={f.key}>
            <label className="label text-xs">{f.label}</label>
            <input
              type="text"
              inputMode="decimal"
              className="input px-2 py-1.5 text-sm"
              placeholder="z. B. 25"
              defaultValue={tarife[f.key] != null ? String(tarife[f.key]! / 100) : ""}
              onBlur={(e) => saveTarif(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label className="label text-xs">Drive-Ordner (Rider, Plakate, Dokumente)</label>
          <input
            type="url"
            className="input px-2 py-1.5 text-sm"
            placeholder="https://drive.google.com/…"
            defaultValue={werte.drivelink}
            onBlur={(e) => e.target.value.trim() !== werte.drivelink && save("drivelink", e.target.value.trim())}
          />
        </div>
        {werte.drivelink && (
          <a href={werte.drivelink} target="_blank" rel="noopener noreferrer" className="btn-ghost shrink-0 px-3 py-1.5 text-sm">
            Öffnen
          </a>
        )}
      </div>
      {error && <p className="err-box mt-2">{error}</p>}
      </div>
      )}

      {sortierteActs.length > 0 && (
        <div className="mt-3 border-t border-line pt-2.5">
          <div className="space-y-1.5">
            {sortierteActs.map((a) => (
              <Link key={a.id} href={`/ressort/${a.ressortId}`} className="row-hover flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-1 py-1">
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                  {a.showtime && <span className="brand-text mr-2 tabular-nums">{a.showtime}</span>}
                  {a.name || "Unbenannter Act"}
                </span>
                <span className="flex shrink-0 gap-3 text-xs text-mute">
                  {a.getIn && <span>Load-in {a.getIn}</span>}
                  {a.soundcheck && <span>SC {a.soundcheck}</span>}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {sortierteActs.length === 0 && (
        <p className="mt-3 border-t border-line pt-2.5 text-xs text-mute">
          Sobald im Ressort «Acts» Acts mit Zeiten (Load-in, Soundcheck, Showtime) erfasst sind, erscheinen sie hier automatisch.
        </p>
      )}
    </section>
  );
}

// Name & Datum des Anlasses bearbeiten.
function AnlassEditModal({
  anlass,
  onClose,
  onSaved,
}: {
  anlass: Anlass;
  onClose: () => void;
  onSaved: (name: string, datum: string) => void;
}) {
  const [name, setName] = useState(anlass.name);
  const [datum, setDatum] = useState(anlass.datum);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) return setError("Name erforderlich");
    if (!datum) return setError("Datum erforderlich");
    setSaving(true);
    setError("");
    try {
      await api.patch(`/anlaesse/${anlass.id}`, { name: name.trim(), datum });
      onSaved(name.trim(), datum);
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
      title="Anlass bearbeiten"
      footer={
        <div className="flex gap-2">
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
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
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
