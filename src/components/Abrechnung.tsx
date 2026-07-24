"use client";

// Abrechnung eines Anlasses — digitalisiert das bisherige Excel-Sheet.
// Abhängigkeiten wie im Sheet: Bar-Kartenzahlungen werden aus
// (Kartenzahlung Total − Abendkasse-Karten) berechnet, Warenkosten 40 %,
// SumUp-Gebühr 2 %, Quercheck Abendkasse vs. gezählte Eintritte.

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { Spinner } from "./Ui";
import { Icon } from "./Icon";
import { formatChf } from "@/lib/finance";
import {
  berechneAbrechnung,
  leereAbrechnung,
  GEBUEHR_PROZENT,
  WARENKOSTEN_PROZENT,
  type AbrechnungDaten,
  type EintrittsStufe,
  type GagenPosten,
  type MietPosten,
} from "@/lib/abrechnung";

interface GagenAct {
  funktion: string;
  name: string;
  preisCents: number;
}

interface SonstigePos {
  art: string;
  eigentuemer: string;
  preisCents: number;
  belegId: number | null;
}

const centsZuText = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(/\.00$/, ""));
const textZuCents = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const v = parseFloat(t.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(v) ? Math.round(v * 100) : null;
};

export function Abrechnung({ anlassId }: { anlassId: number }) {
  const [daten, setDaten] = useState<AbrechnungDaten | null>(null);
  const [gagenActs, setGagenActs] = useState<GagenAct[]>([]);
  const [sonstige, setSonstige] = useState<SonstigePos[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ daten: AbrechnungDaten; gagenActs: GagenAct[]; sonstige: SonstigePos[] }>(`/anlaesse/${anlassId}/abrechnung`)
      .then((d) => {
        setDaten(d.daten);
        setGagenActs(d.gagenActs);
        setSonstige(d.sonstige);
      })
      .catch((e) => setError((e as Error).message));
  }, [anlassId]);

  const speichern = (patch: Partial<AbrechnungDaten>) => {
    setDaten((d) => (d ? { ...d, ...patch } : d));
    api.put(`/anlaesse/${anlassId}/abrechnung`, patch).catch((e) => setError((e as Error).message));
  };

  if (error) return <p className="err-box">{error}</p>;
  if (!daten) return <Spinner label="Lade Abrechnung …" />;

  const b = berechneAbrechnung(
    daten,
    gagenActs.reduce((s, g) => s + g.preisCents, 0),
    sonstige.reduce((s, a) => s + a.preisCents, 0),
  );
  const gewinn = b.gewinnVerlustCents >= 0;

  return (
    <div className="space-y-4">
      {/* Zusammenzug */}
      <div className="card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="lbl">Gewinn / Verlust</p>
            <p className={`text-2xl font-extrabold ${gewinn ? "text-[#6fcf7a]" : "text-[#e05c5c]"}`}>CHF {formatChf(b.gewinnVerlustCents)}</p>
          </div>
          <div>
            <p className="lbl">Umsatz für Buchhaltung</p>
            <p className="text-2xl font-extrabold text-ink">CHF {formatChf(b.umsatzBuchhaltungCents)}</p>
          </div>
          <div>
            <p className="lbl">Einnahmen</p>
            <p className="font-bold text-ink">CHF {formatChf(b.einnahmenCents)}</p>
          </div>
          <div>
            <p className="lbl">Ausgaben</p>
            <p className="font-bold text-ink">CHF {formatChf(b.ausgabenTotalCents)}</p>
          </div>
        </div>
        <a href={`/api/anlaesse/${anlassId}/abrechnung/export`} className="btn-ghost mt-3 w-full">
          <Icon name="file" size={15} /> Excel-Export für die Buchhaltung
        </a>
      </div>

      {/* SumUp / Twint zuerst — liefert das Karten-Total für Bar & Abendkasse. */}
      <Block titel="SumUp / Twint">
        <Zeile label="Kartenzahlung Total (Abend & Nacht)">
          <ChfInput wert={daten.kartenTotalCents} onSave={(v) => speichern({ kartenTotalCents: v })} />
        </Zeile>
        <Zeile label="Twint">
          <ChfInput wert={daten.twintCents} onSave={(v) => speichern({ twintCents: v })} />
        </Zeile>
        <Zeile label={`Gebühr (${GEBUEHR_PROZENT}%)`} wert={b.gebuehrCents} />
        <Zeile label="Total" wert={b.sumupTotalCents} fett />
      </Block>

      <Block titel="Abendkasse (oben)">
        <Zeile label="Anfangsstock">
          <ChfInput wert={daten.akAnfangCents} onSave={(v) => speichern({ akAnfangCents: v })} />
        </Zeile>
        <Zeile label="Endstock">
          <ChfInput wert={daten.akEndCents} onSave={(v) => speichern({ akEndCents: v })} />
        </Zeile>
        <Zeile label="Gewinn Kasse" wert={b.akGewinnKasseCents} />
        <Zeile label="Kartenzahlungen Abendkasse">
          <ChfInput wert={daten.akKartenCents} onSave={(v) => speichern({ akKartenCents: v })} />
        </Zeile>
        <Zeile label="Total Einnahmen Abendkasse" wert={b.akTotalCents} fett />
        {b.kassenDifferenzCents !== 0 && (daten.akEndCents != null || b.akEintritteTotalCents > 0) && (
          <p className="mt-1 border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs text-accent">
            Quercheck: Abendkasse ({formatChf(b.akTotalCents)}) und gezählte Eintritte Abendkasse ({formatChf(b.akEintritteTotalCents)}) weichen um CHF{" "}
            {formatChf(Math.abs(b.kassenDifferenzCents))} ab.
          </p>
        )}
      </Block>

      <Block titel="Bareinnahmen Bar (unten)">
        <Zeile label="Anfangsstock">
          <ChfInput wert={daten.barAnfangCents} onSave={(v) => speichern({ barAnfangCents: v })} />
        </Zeile>
        <Zeile label="Endstock">
          <ChfInput wert={daten.barEndCents} onSave={(v) => speichern({ barEndCents: v })} />
        </Zeile>
        <Zeile label="Kartenzahlungen (berechnet: Total − Abendkasse)" wert={b.barKartenCents} />
        <Zeile label="Umsatz" wert={b.barUmsatzCents} fett />
        <Zeile label={`Warenkosten (${WARENKOSTEN_PROZENT}%)`} wert={b.warenkostenCents} />
        <Zeile label="Gewinn" wert={b.barGewinnCents} fett />
      </Block>

      <StufenBlock
        titel="Eintritte Vorverkauf (Petzi)"
        stufen={daten.eintritteVvk}
        totalCents={b.vvkTotalCents}
        totalAnzahl={b.vvkAnzahl}
        onSave={(s) => speichern({ eintritteVvk: s })}
      />
      <StufenBlock
        titel="Eintritte Abendkasse"
        stufen={daten.eintritteAk}
        totalCents={b.akEintritteTotalCents}
        totalAnzahl={b.akEintritteAnzahl}
        onSave={(s) => speichern({ eintritteAk: s })}
      />
      <div className="card px-4 py-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-dim">Total Eintritte (Petzi + Abendkasse)</span>
          <span className="font-bold text-ink">{b.eintritteAnzahl}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-dim">Total Gewinn Eintritte</span>
          <span className="font-bold text-ink">CHF {formatChf(b.eintritteGewinnCents)}</span>
        </div>
      </div>

      <MieteBlock miete={daten.miete} totalCents={b.mieteTotalCents} onSave={(m) => speichern({ miete: m })} />

      <GagenBlock gagenActs={gagenActs} manuell={daten.gagenManuell} totalCents={b.gagenTotalCents} onSave={(g) => speichern({ gagenManuell: g })} />

      <Block titel="Sonstige Ausgaben (Materiell)">
        {sonstige.length === 0 ? (
          <p className="text-xs text-dim">Noch keine Ausgaben erfasst. Ausgaben mit Beleg erfasst du im Tab «Ausgaben» — sie erscheinen hier automatisch.</p>
        ) : (
          <>
            {sonstige.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-ink">
                  {s.art}
                  {s.eigentuemer && <span className="text-dim"> · {s.eigentuemer}</span>}
                </span>
                <span className="tabular-nums text-ink">{formatChf(s.preisCents)}</span>
              </div>
            ))}
            <Zeile label="Total" wert={b.sonstigeTotalCents} fett />
          </>
        )}
      </Block>
      {error && <p className="err-box">{error}</p>}
    </div>
  );
}

function Block({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-1.5 p-4">
      <h3 className="lbl mb-1">{titel}</h3>
      {children}
    </div>
  );
}

function Zeile({ label, wert, fett, children }: { label: string; wert?: number; fett?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={fett ? "font-bold text-ink" : "text-dim"}>{label}</span>
      {children ?? <span className={`tabular-nums ${fett ? "font-bold text-ink" : "text-ink"}`}>{wert != null ? formatChf(wert) : ""}</span>}
    </div>
  );
}

function ChfInput({ wert, onSave }: { wert: number | null; onSave: (v: number | null) => void }) {
  const [text, setText] = useState(centsZuText(wert));
  useEffect(() => setText(centsZuText(wert)), [wert]);
  return (
    <input
      className="input w-28 px-2 py-1 text-right text-sm tabular-nums"
      inputMode="decimal"
      placeholder="0.00"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const v = textZuCents(text);
        if (v !== wert) onSave(v);
      }}
    />
  );
}

function StufenBlock({
  titel,
  stufen,
  totalCents,
  totalAnzahl,
  onSave,
}: {
  titel: string;
  stufen: EintrittsStufe[];
  totalCents: number;
  totalAnzahl: number;
  onSave: (s: EintrittsStufe[]) => void;
}) {
  const update = (i: number, patch: Partial<EintrittsStufe>) => onSave(stufen.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  return (
    <Block titel={titel}>
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-x-2 gap-y-1 text-sm">
        <span className="lbl">Preis</span>
        <span className="lbl">Anzahl</span>
        <span className="lbl text-right">Total</span>
        <span />
        {stufen.map((s, i) => (
          <StufenZeile key={i} stufe={s} onUpdate={(p) => update(i, p)} onRemove={() => onSave(stufen.filter((_, idx) => idx !== i))} />
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button className="btn-ghost flex-1 py-1 text-xs" onClick={() => onSave([...stufen, { preisCents: 0, anzahl: 0 }])}>
          + Preisstufe
        </button>
      </div>
      <Zeile label={`Total (${totalAnzahl} Eintritte)`} wert={totalCents} fett />
    </Block>
  );
}

function StufenZeile({ stufe, onUpdate, onRemove }: { stufe: EintrittsStufe; onUpdate: (p: Partial<EintrittsStufe>) => void; onRemove: () => void }) {
  const [preis, setPreis] = useState(centsZuText(stufe.preisCents));
  const [anzahl, setAnzahl] = useState(String(stufe.anzahl || ""));
  useEffect(() => setPreis(centsZuText(stufe.preisCents)), [stufe.preisCents]);
  useEffect(() => setAnzahl(String(stufe.anzahl || "")), [stufe.anzahl]);
  return (
    <>
      <input
        className="input px-2 py-1 text-sm tabular-nums"
        inputMode="decimal"
        value={preis}
        onChange={(e) => setPreis(e.target.value)}
        onBlur={() => onUpdate({ preisCents: textZuCents(preis) ?? 0 })}
      />
      <input
        className="input px-2 py-1 text-sm tabular-nums"
        inputMode="numeric"
        value={anzahl}
        onChange={(e) => setAnzahl(e.target.value)}
        onBlur={() => onUpdate({ anzahl: Math.max(0, Math.round(Number(anzahl) || 0)) })}
      />
      <span className="text-right tabular-nums text-ink">{formatChf(stufe.preisCents * stufe.anzahl)}</span>
      <button className="text-dim hover:text-[#e05c5c]" onClick={onRemove} aria-label="Preisstufe entfernen">
        <Icon name="close" size={14} />
      </button>
    </>
  );
}

function MieteBlock({ miete, totalCents, onSave }: { miete: MietPosten[]; totalCents: number; onSave: (m: MietPosten[]) => void }) {
  return (
    <Block titel="Mieteinnahmen (Raum, Material, etc.)">
      {miete.map((m, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="input min-w-0 flex-1 px-2 py-1 text-sm"
            placeholder="Art"
            defaultValue={m.art}
            onBlur={(e) => onSave(miete.map((x, idx) => (idx === i ? { ...x, art: e.target.value } : x)))}
          />
          <ChfInput wert={m.preisCents} onSave={(v) => onSave(miete.map((x, idx) => (idx === i ? { ...x, preisCents: v ?? 0 } : x)))} />
          <button className="text-dim hover:text-[#e05c5c]" onClick={() => onSave(miete.filter((_, idx) => idx !== i))} aria-label="Posten entfernen">
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
      <button className="btn-ghost w-full py-1 text-xs" onClick={() => onSave([...miete, { art: "", preisCents: 0 }])}>
        + Mietposten
      </button>
      {miete.length > 0 && <Zeile label="Total" wert={totalCents} fett />}
    </Block>
  );
}

function GagenBlock({
  gagenActs,
  manuell,
  totalCents,
  onSave,
}: {
  gagenActs: GagenAct[];
  manuell: GagenPosten[];
  totalCents: number;
  onSave: (g: GagenPosten[]) => void;
}) {
  return (
    <Block titel="Gagen (Personen)">
      {gagenActs.map((g, i) => (
        <div key={`act-${i}`} className="flex items-center justify-between gap-2 text-sm">
          <span className="min-w-0 flex-1 truncate text-ink">
            {g.name} <span className="text-dim">· {g.funktion} (aus Acts)</span>
          </span>
          <span className="tabular-nums text-ink">{formatChf(g.preisCents)}</span>
        </div>
      ))}
      {gagenActs.length === 0 && <p className="text-xs text-dim">Gagen aus dem Ressort «Acts» erscheinen hier automatisch.</p>}
      {manuell.map((g, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="input w-24 px-2 py-1 text-sm"
            placeholder="Funktion"
            defaultValue={g.funktion}
            onBlur={(e) => onSave(manuell.map((x, idx) => (idx === i ? { ...x, funktion: e.target.value } : x)))}
          />
          <input
            className="input min-w-0 flex-1 px-2 py-1 text-sm"
            placeholder="Name"
            defaultValue={g.name}
            onBlur={(e) => onSave(manuell.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
          />
          <ChfInput wert={g.preisCents} onSave={(v) => onSave(manuell.map((x, idx) => (idx === i ? { ...x, preisCents: v ?? 0 } : x)))} />
          <button className="text-dim hover:text-[#e05c5c]" onClick={() => onSave(manuell.filter((_, idx) => idx !== i))} aria-label="Gage entfernen">
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
      <button className="btn-ghost w-full py-1 text-xs" onClick={() => onSave([...manuell, { funktion: "", name: "", preisCents: 0 }])}>
        + Gage (z. B. Mischen)
      </button>
      <Zeile label="Total Gagen" wert={totalCents} fett />
    </Block>
  );
}
