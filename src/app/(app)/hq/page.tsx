"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { Avatar, Spinner } from "@/components/Ui";
import { formatDate } from "@/lib/uiUtil";
import type { RessortSummary } from "@/lib/uiTypes";

// HQ (Headquarter): Vereinsressorts — bewusst invertiert zum Rest der App:
// weisser Hintergrund, alles schwarz/weiss mit Graustufen, gerundete Kacheln.
export default function HqPage() {
  const [ressorts, setRessorts] = useState<RessortSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ ressorts: RessortSummary[] }>("/ressorts?hq=1")
      .then((d) => setRessorts(d.ressorts))
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div className="-mx-4 -mt-4 -mb-24 min-h-[100dvh] bg-white px-4 pb-28 pt-5">
      <div className="px-1">
        <h1 className="page-title text-neutral-950">HQ</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Vereinsressorts — unabhängig von den Anlässen</p>
      </div>

      {error && <p className="mt-4 rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700">{error}</p>}

      {!ressorts && !error ? (
        <div className="mt-6 text-neutral-500">
          <Spinner label="Lade Ressorts …" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {(ressorts ?? []).map((r) => (
            <HqKachel key={r.id} ressort={r} />
          ))}
        </div>
      )}
    </div>
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
      href={`/ressort/${r.id}`}
      className="flex items-center gap-4 rounded-2xl bg-neutral-100 p-4 ring-1 ring-neutral-200 transition active:scale-[0.985] active:bg-neutral-200"
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
