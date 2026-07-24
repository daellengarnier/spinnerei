"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { Avatar, EmptyState, Modal, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/components/AuthContext";
import { relTime } from "@/lib/uiUtil";
import type { Verfuegbarkeit } from "@/lib/uiTypes";

interface BookingVote {
  userId: number;
  wert: Verfuegbarkeit;
  name: string;
  avatarColor: string;
}

interface Anfrage {
  id: number;
  titel: string;
  notiz: string;
  link: string;
  createdAt: string;
  autorName: string | null;
  autorColor: string | null;
  votes: BookingVote[];
}

const STIMMEN: { wert: Verfuegbarkeit; label: string }[] = [
  { wert: "ja", label: "Passt" },
  { wert: "vielleicht", label: "Naja" },
  { wert: "nein", label: "Nein" },
];

// HQ-Ressort «Booking»: Anfragen & Ideen posten, alle geben ein Stimmungsbild ab.
export function Booking({ ressortId }: { ressortId: number }) {
  const [anfragen, setAnfragen] = useState<Anfrage[] | null>(null);
  const [error, setError] = useState("");
  const [neuOpen, setNeuOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Anfrage | null>(null);

  const load = useCallback(
    () =>
      api
        .get<{ anfragen: Anfrage[] }>(`/booking?ressort=${ressortId}`)
        .then((d) => setAnfragen(d.anfragen))
        .catch((e) => setError((e as Error).message)),
    [ressortId],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="err-box">{error}</p>;
  if (!anfragen) return <Spinner label="Lade Anfragen …" />;

  return (
    <div className="space-y-3">
      <button className="btn-primary w-full" onClick={() => setNeuOpen(true)}>
        <Icon name="plus" size={17} /> Anfrage / Idee
      </button>

      {anfragen.length === 0 ? (
        <EmptyState title="Noch nichts drin" hint="Poste eine Booking-Anfrage oder Idee — alle geben ihr Stimmungsbild ab." />
      ) : (
        anfragen.map((a) => <AnfrageCard key={a.id} anfrage={a} onChanged={load} onDelete={() => setConfirmDel(a)} />)
      )}

      {neuOpen && (
        <AnfrageModal
          ressortId={ressortId}
          onClose={() => setNeuOpen(false)}
          onSaved={() => {
            setNeuOpen(false);
            load();
          }}
        />
      )}
      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Anfrage löschen?"
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setConfirmDel(null)}>
              Abbrechen
            </button>
            <button
              className="btn-danger flex-1"
              onClick={async () => {
                await api.del(`/booking/${confirmDel!.id}`);
                setConfirmDel(null);
                load();
              }}
            >
              Löschen
            </button>
          </div>
        }
      >
        <p className="text-sm text-dim">&bdquo;{confirmDel?.titel}&ldquo; samt Stimmungsbild wird dauerhaft entfernt.</p>
      </Modal>
    </div>
  );
}

function AnfrageCard({ anfrage, onChanged, onDelete }: { anfrage: Anfrage; onChanged: () => void; onDelete: () => void }) {
  const { user } = useAuth();
  const eigene = anfrage.votes.find((v) => v.userId === user?.id)?.wert ?? null;

  const vote = async (wert: Verfuegbarkeit) => {
    await api.post(`/booking/${anfrage.id}/vote`, { wert });
    onChanged();
  };

  return (
    <section className="card p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{anfrage.titel}</p>
          {anfrage.notiz && <p className="mt-1 whitespace-pre-wrap text-sm text-dim">{anfrage.notiz}</p>}
          <p className="mt-1 text-xs text-mute">
            {anfrage.autorName ?? "Jemand"} · {relTime(anfrage.createdAt)}
            {anfrage.link && (
              <>
                {" · "}
                <a href={anfrage.link} target="_blank" rel="noopener noreferrer" className="text-accent">
                  Link öffnen
                </a>
              </>
            )}
          </p>
        </div>
        <button className="shrink-0 text-mute active:scale-95" onClick={onDelete} aria-label="Anfrage löschen">
          <Icon name="trash" size={15} />
        </button>
      </div>

      <div className="mt-2.5 border-t border-line pt-2.5">
        <div className="seg p-0.5">
          {STIMMEN.map((s) => {
            const stimmen = anfrage.votes.filter((v) => v.wert === s.wert);
            return (
              <button
                key={s.wert}
                className={`seg-item flex-1 px-2 py-1.5 text-xs ${eigene === s.wert ? "on" : ""}`}
                onClick={() => vote(s.wert)}
              >
                {s.label}
                {stimmen.length > 0 && <span className="ml-1 tabular-nums">({stimmen.length})</span>}
              </button>
            );
          })}
        </div>
        {anfrage.votes.length > 0 && (
          <div className="mt-2 space-y-0.5 text-xs text-dim">
            {STIMMEN.filter((s) => anfrage.votes.some((v) => v.wert === s.wert)).map((s) => (
              <p key={s.wert} className="flex flex-wrap items-center gap-1.5">
                <span className="w-10 shrink-0 text-mute">{s.label}:</span>
                {anfrage.votes
                  .filter((v) => v.wert === s.wert)
                  .map((v) => (
                    <span key={v.userId} className="inline-flex items-center gap-1">
                      <Avatar name={v.name} color={v.avatarColor} size={14} userId={v.userId} showName={false} />
                      {v.name}
                    </span>
                  ))}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AnfrageModal({ ressortId, onClose, onSaved }: { ressortId: number; onClose: () => void; onSaved: () => void }) {
  const [titel, setTitel] = useState("");
  const [notiz, setNotiz] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!titel.trim()) return setError("Titel erforderlich");
    setSaving(true);
    setError("");
    try {
      await api.post("/booking", { ressortId, titel: titel.trim(), notiz, link: link.trim() });
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
      title="Anfrage / Idee"
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            {saving ? "Posten …" : "Posten"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Titel</label>
          <input className="input" value={titel} onChange={(e) => setTitel(e.target.value)} autoFocus placeholder="z. B. Band XY am 14.11." />
        </div>
        <div>
          <label className="label">Details (optional)</label>
          <textarea
            className="input min-h-[80px] resize-y text-sm"
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder="Gage, Datum, warum passt es zu uns …"
          />
        </div>
        <div>
          <label className="label">Link (optional)</label>
          <input type="url" className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
        </div>
        <p className="text-xs text-dim">Alle Mitglieder werden benachrichtigt und können ihr Stimmungsbild abgeben.</p>
        {error && <p className="err-box">{error}</p>}
      </div>
    </Modal>
  );
}
