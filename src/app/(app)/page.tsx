"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { EmptyState, Modal, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/components/AuthContext";
import { formatDate } from "@/lib/uiUtil";

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

function datumTeile(datum: string) {
  const [, m, t] = datum.split("-").map(Number);
  return { tag: String(t).padStart(2, "0"), monat: MONATE_KURZ[(m ?? 1) - 1] ?? "" };
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
  const [invite, setInvite] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = () =>
    api
      .get<{ anlaesse: AnlassSummary[] }>("/anlaesse")
      .then((d) => setAnlaesse(d.anlaesse))
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    setHi(greeting());
    load();
    api.get<{ text: string }>("/invite").then((d) => setInvite(d.text)).catch(() => undefined);
  }, []);

  const copyInvite = () =>
    invite &&
    navigator.clipboard?.writeText(invite).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });

  const kommende = (anlaesse ?? []).filter((a) => !istVorbei(a.datum));
  const vergangene = (anlaesse ?? []).filter((a) => istVorbei(a.datum)).reverse();

  return (
    <div className="space-y-5">
      <div className="px-1 pt-1">
        <h1 className="page-title">
          {hi}, <span className="brand-text">{user?.name}</span>
        </h1>
        <div className="mt-3 flex gap-2">
          <button className="btn-ghost flex-1 py-1.5 text-sm" onClick={copyInvite}>
            <Icon name={copied ? "check" : "send"} size={15} /> {copied ? "Kopiert" : "Einladung"}
          </button>
          <button className="btn-ghost px-3 py-1.5" onClick={() => setInviteOpen(true)} aria-label="Einladung bearbeiten">
            <Icon name="pencil" size={16} />
          </button>
          {user?.rolle === "admin" && (
            <button className="btn-ghost flex-1 py-1.5 text-sm" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={15} /> Anlass
            </button>
          )}
        </div>
      </div>

      <section>
        <h2 className="lbl mb-2 px-1">Kommende Anlässe</h2>
        {error && <p className="err-box">{error}</p>}
        {!anlaesse ? (
          <Spinner label="Lade Anlässe …" />
        ) : kommende.length === 0 ? (
          <EmptyState title="Keine kommenden Anlässe" hint={user?.rolle === "admin" ? "Lege oben einen Anlass an." : "Der Admin legt Anlässe an."} />
        ) : (
          <div className="space-y-2.5">
            {kommende.map((a) => (
              <AnlassKarte key={a.id} anlass={a} />
            ))}
          </div>
        )}
      </section>

      {vergangene.length > 0 && (
        <section className="opacity-60">
          <h2 className="lbl mb-2 px-1">Vergangene Anlässe</h2>
          <div className="space-y-2.5">
            {vergangene.map((a) => (
              <AnlassKarte key={a.id} anlass={a} />
            ))}
          </div>
        </section>
      )}

      {inviteOpen && (
        <InviteModal
          text={invite}
          onClose={() => setInviteOpen(false)}
          onSaved={(t) => {
            setInvite(t);
            setInviteOpen(false);
          }}
        />
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

function AnlassKarte({ anlass }: { anlass: AnlassSummary }) {
  const { tag, monat } = datumTeile(anlass.datum);
  return (
    <Link href={`/anlass/${anlass.id}`} className="card flex items-center gap-3.5 p-3.5 active:scale-[0.99]">
      <span className="date-badge shrink-0">
        <span className="date-badge-day">{tag}</span>
        <span className="date-badge-month">{monat}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{anlass.name}</p>
        <p className="mt-0.5 text-xs text-mute">{formatDate(anlass.datum)}</p>
      </div>
      {anlass.openTodos > 0 && (
        <span className="count-badge" title={`${anlass.openTodos} offene Todos`}>
          {anlass.openTodos}
        </span>
      )}
      <Icon name="chevron" size={16} className="shrink-0 text-mute" />
    </Link>
  );
}

function InviteModal({ text, onClose, onSaved }: { text: string; onClose: () => void; onSaved: (t: string) => void }) {
  const [value, setValue] = useState(text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (!value.trim()) return setError("Text erforderlich");
    setSaving(true);
    setError("");
    try {
      await api.put("/invite", { text: value.trim() });
      onSaved(value.trim());
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
      title="Einladungstext bearbeiten"
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
      <div className="space-y-2">
        <label className="label">Einladung (für SMS/WhatsApp)</label>
        <textarea className="input min-h-[220px] resize-y text-sm" value={value} onChange={(e) => setValue(e.target.value)} />
        <p className="text-xs text-mute">Wird für alle geändert. Der „Einladung kopieren“-Button kopiert diesen Text.</p>
        {error && <p className="err-box">{error}</p>}
      </div>
    </Modal>
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
