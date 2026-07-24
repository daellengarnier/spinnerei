"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/apiClient";
import { EmptyState, Modal, Spinner } from "@/components/Ui";
import { useUsers } from "@/lib/useUsers";
import { formatDate } from "@/lib/uiUtil";
import type { MeetingDetail, MeetingListItem, RessortSummary } from "@/lib/uiTypes";
import { Icon } from "@/components/Icon";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  umfrage_laeuft: { label: "Umfrage läuft", cls: "bg-[#2a2413] text-[#c9a84c]" },
  terminFixiert: { label: "Termin fix", cls: "bg-[#1a2e1c] text-[#6fcf7a]" },
  erledigt: { label: "Erledigt", cls: "bg-surface2 text-dim" },
};

export default function MeetingsPage() {
  const params = useParams<{ anlassId: string }>();
  const anlassId = Number(params.anlassId);
  const [meetings, setMeetings] = useState<MeetingListItem[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = () => api.get<{ meetings: MeetingListItem[] }>(`/meetings?anlass=${anlassId}`).then((d) => setMeetings(d.meetings));
  useEffect(() => {
    if (anlassId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anlassId]);

  return (
    <div className="space-y-4">
      <div className="px-1">
        <Link href={`/anlass/${anlassId}`} className="text-sm text-mute">
          ← Anlass
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="page-title">Sitzungen</h1>
        <button className="btn-primary px-4 py-2" onClick={() => setCreateOpen(true)}>
          + Sitzung
        </button>
      </div>

      {meetings === null ? (
        <Spinner />
      ) : meetings.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Noch keine Sitzungen"
          hint="Erstelle eine Sitzung mit Terminvorschlägen – alle stimmen dann ab."
          action={
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              + Sitzung erstellen
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => {
            const badge = STATUS_BADGE[m.status];
            return (
              <Link key={m.id} href={`/meetings/${m.id}`} className="card flex items-center justify-between gap-3 p-4 active:scale-[0.99]">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{m.titel}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`chip ${badge.cls}`}>{badge.label}</span>
                    {m.ressortName && (
                      <span className="chip" style={{ background: `${m.ressortFarbe}1a`, color: m.ressortFarbe ?? "#64748b" }}>
                        {m.ressortName}
                      </span>
                    )}
                    {m.fixDatum && (
                      <span className="chip bg-surface2 text-dim">
                        {formatDate(m.fixDatum)}
                        {m.fixStartzeit ? ` ${m.fixStartzeit}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-mute">›</span>
              </Link>
            );
          })}
        </div>
      )}

      <CreateMeetingModal anlassId={anlassId} open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
    </div>
  );
}

interface SlotDraft {
  datum: string;
  startzeit: string;
  endzeit: string;
}

function CreateMeetingModal({ anlassId, open, onClose, onCreated }: { anlassId: number; open: boolean; onClose: () => void; onCreated: () => void }) {
  const users = useUsers();
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [ressortId, setRessortId] = useState("");
  const [ressorts, setRessorts] = useState<RessortSummary[]>([]);
  const [slots, setSlots] = useState<SlotDraft[]>([{ datum: "", startzeit: "", endzeit: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      api.get<{ ressorts: RessortSummary[] }>(`/ressorts?anlass=${anlassId}`).then((d) => setRessorts(d.ressorts)).catch(() => undefined);
    }
  }, [open, anlassId]);

  const updateSlot = (i: number, patch: Partial<SlotDraft>) => setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const save = async () => {
    const validSlots = slots.filter((s) => s.datum);
    if (!titel.trim()) return setError("Titel erforderlich");
    if (validSlots.length === 0) return setError("Mindestens ein Terminvorschlag mit Datum");
    setSaving(true);
    setError("");
    try {
      await api.post<MeetingDetail>("/meetings", {
        titel: titel.trim(),
        beschreibung,
        anlassId,
        ressortId: ressortId ? Number(ressortId) : null,
        slots: validSlots,
      });
      window.dispatchEvent(new Event("spinnerei:refresh-inbox"));
      onCreated();
      onClose();
      setTitel("");
      setBeschreibung("");
      setRessortId("");
      setSlots([{ datum: "", startzeit: "", endzeit: "" }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Neue Sitzung"
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
          <label className="label">Titel</label>
          <input className="input" value={titel} onChange={(e) => setTitel(e.target.value)} autoFocus placeholder="z. B. Kickoff Deko" />
        </div>
        <div>
          <label className="label">Beschreibung (optional)</label>
          <textarea className="input min-h-[60px] resize-y" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
        </div>
        <div>
          <label className="label">Ressort (optional)</label>
          <select className="input" value={ressortId} onChange={(e) => setRessortId(e.target.value)}>
            <option value="">— keines —</option>
            {ressorts.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Terminvorschläge</label>
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="date" className="input flex-1" value={s.datum} onChange={(e) => updateSlot(i, { datum: e.target.value })} />
                <input type="time" className="input w-28" value={s.startzeit} onChange={(e) => updateSlot(i, { startzeit: e.target.value })} />
                {slots.length > 1 && (
                  <button className="text-dim hover:text-red-500" onClick={() => setSlots((p) => p.filter((_, idx) => idx !== i))} aria-label="Entfernen">
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className="btn-ghost mt-2 w-full py-2 text-sm" onClick={() => setSlots((p) => [...p, { datum: "", startzeit: "", endzeit: "" }])}>
            + Weiterer Vorschlag
          </button>
        </div>

        <p className="text-xs text-dim">
          Alle {users.length} Mitglieder werden über die neue Sitzung benachrichtigt und können ihre Verfügbarkeit angeben.
        </p>
        {error && <p className=" bg-terra-light px-3 py-2 text-sm text-terra-dark">{error}</p>}
      </div>
    </Modal>
  );
}
