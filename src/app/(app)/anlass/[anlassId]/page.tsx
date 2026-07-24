"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/apiClient";
import { Avatar, EmptyState, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { ressortIcon } from "@/lib/ressortIcon";
import { ressortHint } from "@/lib/ressortHint";
import { useAuth } from "@/components/AuthContext";
import { formatDate, istFolgetag } from "@/lib/uiUtil";
import type { RessortSummary } from "@/lib/uiTypes";

interface Anlass {
  id: number;
  slug: string;
  name: string;
  datum: string;
  tueroeffnung: string;
  essen: string;
  ende: string;
  petzilink: string;
  art: string;
  stichwort: string;
  zugang: string;
  drivelink: string;
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
        <h1 className="page-title mt-1">{anlass.name}</h1>
        <p className="mt-0.5 text-sm text-mute">{formatDate(anlass.datum)}</p>
      </div>

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
  { key: "essen", label: "Essen" },
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
    stichwort: anlass.stichwort,
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

  // Stichwort nur für Anlässe ohne Konzert-Charakter (Party etc.) —
  // bei (Doppel-)Konzerten kommt das Genre von den Acts.
  const zeigeStichwort = !werte.art.toLowerCase().includes("konzert");
  const brauchtStichwort = !!werte.art && zeigeStichwort;
  const fehlend = [
    ...(werte.art ? [] : ["Art des Anlasses"]),
    ...(werte.zugang ? [] : ["Privat/Öffentlich"]),
    ...(brauchtStichwort && !werte.stichwort ? ["Stichwort (z. B. Musikrichtung)"] : []),
    ...ZEIT_FELDER.filter((f) => !werte[f.key]).map((f) => f.label),
    ...(werte.petzilink ? [] : ["Petzilink"]),
    ...(werte.drivelink ? [] : ["Drive-Ordner"]),
  ];
  const sortierteActs = [...acts].sort((a, b) => (a.showtime || "99:99").localeCompare(b.showtime || "99:99"));

  return (
    <section className="card p-3.5">
      <h2 className="block-title mb-2.5">Anlassübersicht</h2>

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

      {zeigeStichwort && (
        <div className="mb-2">
          <label className="label text-xs">Stichwort (max. 3 Wörter, z. B. Psytrance, Techno)</label>
          <input
            className="input px-2 py-1.5 text-sm"
            placeholder="z. B. Psytrance"
            defaultValue={werte.stichwort}
            onBlur={(e) => e.target.value.trim() !== werte.stichwort && save("stichwort", e.target.value.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(" "))}
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {ZEIT_FELDER.map((f) => (
          <div key={f.key}>
            <label className="label text-xs">
              {f.label}
              {f.key === "ende" && istFolgetag(werte.tueroeffnung, werte.ende) && <span className="text-accent"> (Folgetag)</span>}
            </label>
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
