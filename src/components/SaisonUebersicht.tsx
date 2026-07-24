"use client";

// Saison-Übersicht: alle Anlässe untereinander mit Datum, Art, Eckzeiten und
// den Acts (Genre, Herkunft, Showtime) — automatisch aus den Anlässen gezogen.

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { EmptyState, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { formatDate, istFolgetag } from "@/lib/uiUtil";

interface UebersichtAct {
  name: string;
  typ: string;
  genre: string;
  herkunft: string;
  showtime: string;
}

interface UebersichtAnlass {
  id: number;
  name: string;
  datum: string;
  art: string;
  stichwort: string;
  zugang: string;
  tueroeffnung: string;
  essen: string;
  ende: string;
  petzilink: string;
  acts: UebersichtAct[];
}

// PDF der Saison-Übersicht — clientseitig mit jsPDF (Standard-Helvetica).
async function pdfHerunterladen(anlaesse: UebersichtAnlass[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const links = 20;
  const rechts = 190;
  let y = 22;

  const neueSeiteFalls = (platz: number) => {
    if (y + platz > 280) {
      doc.addPage();
      y = 22;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Spinnerei — Übersicht alle Anlässe", links, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Stand: ${new Date().toLocaleDateString("de-CH")}`, links, y);
  doc.setTextColor(0);
  y += 10;

  for (const a of anlaesse) {
    neueSeiteFalls(24);
    doc.setDrawColor(180);
    doc.line(links, y - 4, rechts, y - 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(a.name, links, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const zugangLabel = a.zugang === "privat" ? "Privat" : a.zugang === "oeffentlich" ? "Öffentlich" : "";
    const kopfInfos = [formatDate(a.datum), a.art, a.stichwort, zugangLabel].filter(Boolean).join("  ·  ");
    y += 5.5;
    doc.text(kopfInfos, links, y);

    const zeiten = [
      a.tueroeffnung && `Türöffnung ${a.tueroeffnung}`,
      a.essen && `Essen ${a.essen}`,
      a.ende && `Ende ${a.ende}${istFolgetag(a.tueroeffnung, a.ende) ? " (Folgetag)" : ""}`,
    ].filter(Boolean);
    if (zeiten.length > 0) {
      y += 5;
      doc.setTextColor(100);
      doc.text(zeiten.join("  ·  "), links, y);
      doc.setTextColor(0);
    }

    if (a.acts.length > 0) {
      y += 3;
      for (const act of a.acts) {
        neueSeiteFalls(6);
        y += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const zeit = act.showtime ? `${act.showtime}  ` : "";
        doc.text(`${zeit}${act.name || "Unbenannter Act"}`, links + 4, y);
        const detail = [act.genre, act.herkunft].filter(Boolean).join(" · ");
        if (detail) {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100);
          doc.text(detail, rechts, y, { align: "right" });
          doc.setTextColor(0);
        }
      }
    }
    y += 10;
  }

  doc.save(`Spinnerei_Anlaesse_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Ausklappbare Saison-Übersicht auf der Anlässe-Seite.
export function SaisonUebersicht() {
  const [anlaesse, setAnlaesse] = useState<UebersichtAnlass[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ anlaesse: UebersichtAnlass[] }>("/anlaesse/uebersicht")
      .then((d) => setAnlaesse(d.anlaesse))
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="err-box">{error}</p>;
  if (!anlaesse) return <Spinner label="Lade Übersicht …" />;

  return (
    <div className="space-y-2.5">
      <button className="btn-ghost w-full py-1.5 text-sm" onClick={() => anlaesse.length > 0 && pdfHerunterladen(anlaesse)}>
        <Icon name="download" size={15} /> Als PDF herunterladen
      </button>

      {anlaesse.length === 0 ? (
        <EmptyState title="Noch keine Anlässe" />
      ) : (
        anlaesse.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Link href={`/anlass/${a.id}`} className="block-title">
                {a.name}
              </Link>
              {a.art && <span className="chip bg-surface2 text-dim">{a.art}</span>}
              {a.stichwort && <span className="chip bg-accent/10 text-accent">{a.stichwort}</span>}
              {a.zugang && <span className="chip bg-surface2 text-dim">{a.zugang === "privat" ? "Privat" : "Öffentlich"}</span>}
            </div>
            <p className="mt-1 text-sm text-dim">{formatDate(a.datum)}</p>

            {(a.tueroeffnung || a.essen || a.ende || a.petzilink) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
                {a.tueroeffnung && <span>Türöffnung {a.tueroeffnung}</span>}
                {a.essen && <span>Essen {a.essen}</span>}
                {a.ende && (
                  <span>
                    Ende {a.ende}
                    {istFolgetag(a.tueroeffnung, a.ende) && " (Folgetag)"}
                  </span>
                )}
                {a.petzilink && (
                  <a href={a.petzilink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent">
                    <Icon name="send" size={11} /> Petzi
                  </a>
                )}
              </div>
            )}

            {a.acts.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-line pt-2.5">
                {a.acts.map((act, i) => (
                  <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                    <span className="font-semibold text-ink">
                      {act.showtime && <span className="brand-text mr-2 tabular-nums">{act.showtime}</span>}
                      {act.name || "Unbenannter Act"}
                    </span>
                    <span className="text-xs text-dim">
                      {[act.genre, act.herkunft].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
