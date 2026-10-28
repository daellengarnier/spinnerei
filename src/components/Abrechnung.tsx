"use client";

// Abrechnung eines Anlasses — digitalisiert das bisherige Excel-Sheet.
// Abhängigkeiten wie im Sheet: Bar-Kartenzahlungen werden aus
// (Kartenzahlung Total − Abendkasse-Karten) berechnet, Warenkosten 40 %,
// SumUp-Gebühr 2 %, Quercheck Abendkasse vs. gezählte Eintritte.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { erklaereAbrechnung, type ErklaerungKey, type Rechnung } from "@/lib/abrechnungErklaerung";

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
  // Aufschlüsselung der berechneten Zahlen (nur Anzeige, ändert nichts).
  const e = erklaereAbrechnung(daten, b, gagenActs, sonstige);

  // Desktop: Blöcke in zwei Spalten, Lesereihenfolge bleibt von oben nach unten.
  return (
    <div className="space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0 lg:[&>*]:mb-4 lg:[&>*]:break-inside-avoid">
      {/* Zusammenzug */}
      <div className="card p-4 lg:[column-span:all]">
        <Zusammenzug
          kennzahlen={[
            { key: "gewinnVerlust", label: "Gewinn / Verlust", cents: b.gewinnVerlustCents, gross: true, farbe: gewinn ? "text-[#6fcf7a]" : "text-[#e05c5c]" },
            { key: "umsatzBuchhaltung", label: "Umsatz für Buchhaltung", cents: b.umsatzBuchhaltungCents, gross: true },
            { key: "einnahmen", label: "Einnahmen", cents: b.einnahmenCents },
            { key: "ausgaben", label: "Ausgaben", cents: b.ausgabenTotalCents },
          ]}
          erklaerung={e}
        />
        <p className="mt-2 text-xs text-dim">Tipp: Auf eine berechnete Zahl tippen, um zu sehen, wie sie zusammengesetzt ist.</p>
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
        <Zeile label={`Gebühr (${GEBUEHR_PROZENT}%)`} wert={b.gebuehrCents} rechnung={e.gebuehr} />
        <Zeile label="Total" wert={b.sumupTotalCents} fett rechnung={e.sumupTotal} />
      </Block>

      <Block titel="Abendkasse (Eingang)">
        <Zeile label="Anfangsstock">
          <ChfInput wert={daten.akAnfangCents} onSave={(v) => speichern({ akAnfangCents: v })} />
        </Zeile>
        <Zeile label="Endstock">
          <ChfInput wert={daten.akEndCents} onSave={(v) => speichern({ akEndCents: v })} />
        </Zeile>
        <Zeile label="Gewinn Kasse" wert={b.akGewinnKasseCents} rechnung={e.akGewinnKasse} />
        <Zeile
          label={b.akKartenManuell ? "Kartenzahlungen Abendkasse (manuell)" : "Kartenzahlungen Abendkasse (berechnet: Eintritte − Gewinn Kasse)"}
          wert={b.akKartenCents}
          rechnung={e.akKarten}
        />
        <Zeile label="Kartenzahlungen manuell (optional, z. B. laut SumUp-Gerät)">
          <ChfInput wert={daten.akKartenCents} onSave={(v) => speichern({ akKartenCents: v })} />
        </Zeile>
        {b.akKartenManuell && b.akEintritteTotalCents > 0 && b.akKartenBerechnetCents !== b.akKartenCents && (
          <p className="text-xs text-dim">
            Aus Eintritten und Kassenstock berechnet wären es CHF {formatChf(b.akKartenBerechnetCents)}. Feld leeren, um den berechneten Wert zu verwenden.
          </p>
        )}
        <Zeile label="Total Einnahmen Abendkasse" wert={b.akTotalCents} fett rechnung={e.akTotal} />
        {b.kassenDifferenzCents !== 0 && (daten.akEndCents != null || b.akEintritteTotalCents > 0) && (
          <p className="mt-1 border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs text-accent">
            Quercheck: Abendkasse ({formatChf(b.akTotalCents)}) und gezählte Eintritte Abendkasse ({formatChf(b.akEintritteTotalCents)}) weichen um CHF{" "}
            {formatChf(Math.abs(b.kassenDifferenzCents))} ab.
          </p>
        )}
      </Block>

      <Block titel="Bar">
        <Zeile label="Anfangsstock">
          <ChfInput wert={daten.barAnfangCents} onSave={(v) => speichern({ barAnfangCents: v })} />
        </Zeile>
        <Zeile label="Endstock">
          <ChfInput wert={daten.barEndCents} onSave={(v) => speichern({ barEndCents: v })} />
        </Zeile>
        <Zeile label="Kartenzahlungen (berechnet: Total − Abendkasse)" wert={b.barKartenCents} rechnung={e.barKarten} />
        {b.barKartenCents < 0 && (
          <p className="border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs text-accent">
            Die Kartenzahlungen der Abendkasse sind höher als das Karten-Total von SumUp — bitte Eintritte, Kassenstock und Karten-Total prüfen.
          </p>
        )}
        <Zeile label="Umsatz" wert={b.barUmsatzCents} fett rechnung={e.barUmsatz} />
        <Zeile label={`Warenkosten (${WARENKOSTEN_PROZENT}%)`} wert={b.warenkostenCents} rechnung={e.warenkosten} />
        <Zeile label="Gewinn" wert={b.barGewinnCents} fett rechnung={e.barGewinn} />
      </Block>

      <StufenBlock
        titel="Eintritte Vorverkauf (Petzi)"
        stufen={daten.eintritteVvk}
        totalCents={b.vvkTotalCents}
        totalAnzahl={b.vvkAnzahl}
        rechnung={e.vvkTotal}
        onSave={(s) => speichern({ eintritteVvk: s })}
      />
      <StufenBlock
        titel="Eintritte Abendkasse"
        stufen={daten.eintritteAk}
        totalCents={b.akEintritteTotalCents}
        totalAnzahl={b.akEintritteAnzahl}
        rechnung={e.akEintritteTotal}
        onSave={(s) => speichern({ eintritteAk: s })}
      />
      <div className="card px-4 py-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-dim">Total Eintritte (Petzi + Abendkasse)</span>
          <span className="font-bold text-ink">{b.eintritteAnzahl}</span>
        </div>
        <Zeile label="Total Gewinn Eintritte (CHF)" wert={b.eintritteGewinnCents} fett rechnung={e.eintritteGewinn} />
      </div>

      <MieteBlock miete={daten.miete} totalCents={b.mieteTotalCents} rechnung={e.mieteTotal} onSave={(m) => speichern({ miete: m })} />

      <GagenBlock gagenActs={gagenActs} manuell={daten.gagenManuell} totalCents={b.gagenTotalCents} rechnung={e.gagenTotal} onSave={(g) => speichern({ gagenManuell: g })} />

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
            <Zeile label="Total" wert={b.sonstigeTotalCents} fett rechnung={e.sonstigeTotal} />
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
      <h3 className="block-title mb-2">{titel}</h3>
      {children}
    </div>
  );
}

function Zeile({
  label,
  wert,
  fett,
  rechnung,
  children,
}: {
  label: string;
  wert?: number;
  fett?: boolean;
  rechnung?: Rechnung;
  children?: React.ReactNode;
}) {
  const zahl = <span className={`tabular-nums ${fett ? "font-bold text-ink" : "text-ink"}`}>{wert != null ? formatChf(wert) : ""}</span>;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={fett ? "font-bold text-ink" : "text-dim"}>{label}</span>
      {children ??
        (rechnung && wert != null ? (
          <RechnungTooltip titel={label} rechnung={rechnung} className="-my-1 border-b border-dashed border-line2 py-1 hover:border-accent">
            {zahl}
          </RechnungTooltip>
        ) : (
          zahl
        ))}
    </div>
  );
}

// Tooltip mit der Aufschlüsselung: Antippen (Handy) bzw. Hover (Maus) an der
// Zahl. Schwebt über dem Inhalt (fixe Position, bleibt im Bildschirm);
// schliesst bei Tippen daneben, Scrollen oder Escape.
function RechnungTooltip({
  titel,
  rechnung,
  className,
  children,
}: {
  titel: string;
  rechnung: Rechnung;
  className?: string;
  children: React.ReactNode;
}) {
  const [offen, setOffen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; oben: boolean; pfeil: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const perHover = useRef(false);

  const schliessen = useCallback(() => {
    setOffen(false);
    setPos(null);
  }, []);

  // Position: unter der Zahl, rechtsbündig; zu wenig Platz unten → oben.
  useLayoutEffect(() => {
    if (!offen) return;
    const t = triggerRef.current?.getBoundingClientRect();
    const tip = tipRef.current?.getBoundingClientRect();
    if (!t || !tip) return;
    const rand = 8;
    const left = Math.min(Math.max(rand, t.right - tip.width), window.innerWidth - tip.width - rand);
    const oben = t.bottom + 8 + tip.height > window.innerHeight - rand && t.top - 8 - tip.height > rand;
    const top = oben ? t.top - 8 - tip.height : t.bottom + 8;
    const pfeil = Math.min(Math.max(12, t.left + t.width / 2 - left), tip.width - 12);
    setPos((p) => (p && p.top === top && p.left === left && p.oben === oben ? p : { top, left, oben, pfeil }));
  }, [offen, rechnung]);

  useEffect(() => {
    if (!offen) return;
    const weg = (e: Event) => {
      const z = e.target as Node;
      if (triggerRef.current?.contains(z) || tipRef.current?.contains(z)) return;
      schliessen();
    };
    const taste = (e: KeyboardEvent) => e.key === "Escape" && schliessen();
    document.addEventListener("pointerdown", weg);
    window.addEventListener("scroll", schliessen, true);
    window.addEventListener("resize", schliessen);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("pointerdown", weg);
      window.removeEventListener("scroll", schliessen, true);
      window.removeEventListener("resize", schliessen);
      document.removeEventListener("keydown", taste);
    };
  }, [offen, schliessen]);

  const kannHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          perHover.current = false;
          if (offen) schliessen();
          else setOffen(true);
        }}
        onMouseEnter={() => {
          if (!offen && kannHover()) {
            perHover.current = true;
            setOffen(true);
          }
        }}
        onMouseLeave={() => perHover.current && schliessen()}
        aria-expanded={offen}
        aria-label={`${titel}: Berechnung ${offen ? "ausblenden" : "anzeigen"}`}
        className={className}
      >
        {children}
      </button>
      {offen &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className="fixed z-50 w-max min-w-[200px] max-w-[min(300px,calc(100vw-16px))] border border-line2 bg-surface text-left shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
          >
            <span
              aria-hidden="true"
              className={`absolute h-2.5 w-2.5 rotate-45 border-line2 bg-surface ${pos?.oben ? "-bottom-[6px] border-b border-r" : "-top-[6px] border-l border-t"}`}
              style={{ left: (pos?.pfeil ?? 12) - 5 }}
            />
            <p className="px-2.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-accent">{titel}</p>
            <RechnungBox rechnung={rechnung} />
          </div>,
          document.body,
        )}
    </>
  );
}

// Aufschlüsselung einer berechneten Zahl: Posten mit + / − / %, dann = Ergebnis.
function RechnungBox({ rechnung }: { rechnung: Rechnung }) {
  const zeilen = rechnung.zeilen;
  const prozentIdx = zeilen.findIndex((z) => z.op === "%");
  // Vor einer Prozent-Zeile mit mehreren Posten: Zwischensumme als Basis zeigen.
  const basis =
    prozentIdx > 1
      ? zeilen.slice(0, prozentIdx).reduce((s, z) => (z.op === "+" ? s + z.cents : z.op === "−" ? s - z.cents : s), 0)
      : null;
  return (
    <div className="px-2.5 pb-2 pt-1 text-xs">
      {zeilen.length === 0 ? (
        <p className="text-dim">Noch keine Posten erfasst.</p>
      ) : (
        zeilen.map((z, i) => (
          <div key={i}>
            {i === prozentIdx && basis !== null && (
              <div className="flex justify-between gap-3 border-t border-line pt-0.5 text-dim">
                <span>= Basis</span>
                <span className="tabular-nums">{formatChf(basis)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-dim">
                <span className="inline-block w-4 font-semibold text-ink">{z.op === "%" ? "×" : i === 0 && z.op === "+" ? "" : z.op}</span>
                {z.op === "%" ? `${z.prozent} % (${z.label})` : z.label}
              </span>
              {z.op !== "%" && <span className="tabular-nums text-ink">{formatChf(z.cents)}</span>}
            </div>
          </div>
        ))
      )}
      <div className="mt-1 flex justify-between gap-3 border-t border-line2 pt-1 font-bold text-ink">
        <span>
          <span className="inline-block w-4">=</span>Ergebnis
        </span>
        <span className="tabular-nums">{formatChf(rechnung.ergebnisCents)}</span>
      </div>
      {rechnung.hinweis && <p className="mt-1 text-dim">{rechnung.hinweis}</p>}
    </div>
  );
}

// Kennzahlen oben: antippen bzw. Hover zeigt die Berechnung als Tooltip.
function Zusammenzug({
  kennzahlen,
  erklaerung,
}: {
  kennzahlen: { key: ErklaerungKey; label: string; cents: number; gross?: boolean; farbe?: string }[];
  erklaerung: Record<ErklaerungKey, Rechnung>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {kennzahlen.map((k) => (
        <div key={k.key}>
          <p className="lbl">{k.label}</p>
          <RechnungTooltip titel={k.label} rechnung={erklaerung[k.key]} className="border-b border-dashed border-line2 text-left hover:border-accent">
            <span className={`${k.gross ? "text-2xl font-extrabold" : "font-bold"} ${k.farbe ?? "text-ink"}`}>CHF {formatChf(k.cents)}</span>
          </RechnungTooltip>
        </div>
      ))}
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
  rechnung,
  totalAnzahl,
  onSave,
}: {
  titel: string;
  stufen: EintrittsStufe[];
  totalCents: number;
  rechnung?: Rechnung;
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
      <Zeile label={`Total (${totalAnzahl} Eintritte)`} wert={totalCents} fett rechnung={rechnung} />
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

function MieteBlock({
  miete,
  totalCents,
  rechnung,
  onSave,
}: {
  miete: MietPosten[];
  totalCents: number;
  rechnung?: Rechnung;
  onSave: (m: MietPosten[]) => void;
}) {
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
      {miete.length > 0 && <Zeile label="Total" wert={totalCents} fett rechnung={rechnung} />}
    </Block>
  );
}

function GagenBlock({
  gagenActs,
  manuell,
  totalCents,
  rechnung,
  onSave,
}: {
  gagenActs: GagenAct[];
  manuell: GagenPosten[];
  totalCents: number;
  rechnung?: Rechnung;
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
      <Zeile label="Total Gagen" wert={totalCents} fett rechnung={rechnung} />
    </Block>
  );
}
