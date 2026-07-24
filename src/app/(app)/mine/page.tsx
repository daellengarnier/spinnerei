"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { EmptyState, MentionText, Modal, Spinner } from "@/components/Ui";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/components/AuthContext";
import { TodoRow } from "@/components/TodoRow";
import { relTime } from "@/lib/uiUtil";
import type { Todo } from "@/lib/uiTypes";

interface MentionRow {
  commentId: number;
  text: string;
  createdAt: string;
  parentTyp: "todo" | "ressort";
  parentId: number;
  autorName: string | null;
}

export default function MinePage() {
  const [assigned, setAssigned] = useState<Todo[] | null>(null);
  const [mentioned, setMentioned] = useState<MentionRow[]>([]);
  const [tab, setTab] = useState<"assigned" | "mentioned">("assigned");
  const [neuOpen, setNeuOpen] = useState(false);

  const load = () =>
    api.get<{ assigned: Todo[]; mentioned: MentionRow[] }>("/todos/mine").then((d) => {
      setAssigned(d.assigned);
      setMentioned(d.mentioned);
    });

  useEffect(() => {
    load();
  }, []);

  const openAssigned = (assigned ?? []).filter((t) => t.status !== "erledigt");
  const doneAssigned = (assigned ?? []).filter((t) => t.status === "erledigt");

  return (
    <div className="space-y-4">
      <h1 className="page-title">Meine Sachen</h1>

      <button className="btn-primary w-full" onClick={() => setNeuOpen(true)}>
        <Icon name="plus" size={17} /> Todo für mich erstellen
      </button>

      <div className="flex gap-1  bg-surface2 p-1 text-sm font-medium">
        <button className={`flex-1  py-2 ${tab === "assigned" ? "bg-surface shadow-sm" : "text-dim"}`} onClick={() => setTab("assigned")}>
          Mir zugewiesen {openAssigned.length > 0 && <span className="text-dim">({openAssigned.length})</span>}
        </button>
        <button className={`flex-1  py-2 ${tab === "mentioned" ? "bg-surface shadow-sm" : "text-dim"}`} onClick={() => setTab("mentioned")}>
          @mich erwähnt
        </button>
      </div>

      {assigned === null ? (
        <Spinner />
      ) : tab === "assigned" ? (
        openAssigned.length === 0 && doneAssigned.length === 0 ? (
          <EmptyState icon="🎉" title="Nichts zugewiesen" hint="Dir wurden noch keine Todos zugewiesen." />
        ) : (
          <div className="space-y-4">
            <div className="card divide-y divide-line overflow-hidden">
              {openAssigned.length === 0 ? (
                <p className="px-4 py-3 text-sm text-dim">Alles erledigt.</p>
              ) : (
                openAssigned.map((t, i) => (
                  <TodoRowWithRessort key={t.id} todo={t} showRessort={i === 0 || openAssigned[i - 1].ressortId !== t.ressortId} onChanged={load} />
                ))
              )}
            </div>
            {doneAssigned.length > 0 && (
              <div>
                <h3 className="mb-2 px-1 text-sm font-semibold text-dim">Erledigt</h3>
                <div className="card divide-y divide-line overflow-hidden opacity-70">
                  {doneAssigned.map((t, i) => (
                    <TodoRowWithRessort key={t.id} todo={t} showRessort={i === 0 || doneAssigned[i - 1].ressortId !== t.ressortId} onChanged={load} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : mentioned.length === 0 ? (
        <EmptyState icon="📣" title="Keine Erwähnungen" hint="Hier erscheinen Kommentare, in denen du mit @Name erwähnt wurdest." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {mentioned.map((m) => (
            <Link
              key={m.commentId}
              href={m.parentTyp === "todo" ? `/todo/${m.parentId}` : `/ressort/${m.parentId}?tab=pinnwand`}
              className="block px-4 py-3 active:bg-surface2"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{m.autorName ?? "Jemand"}</span>
                <span className="text-xs text-dim">{relTime(m.createdAt)}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-sm text-dim">
                <MentionText text={m.text} />
              </p>
            </Link>
          ))}
        </div>
      )}
      {neuOpen && (
        <NeuesTodoModal
          onClose={() => setNeuOpen(false)}
          onSaved={() => {
            setNeuOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

// Eigenes Todo erstellen: standardmässig persönlich (ohne Anlass); optional
// kann ein Anlass + Ressort gewählt werden.
function NeuesTodoModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [anlaesse, setAnlaesse] = useState<{ id: number; name: string }[] | null>(null);
  const [anlassId, setAnlassId] = useState<number | null>(null);
  const [ressorts, setRessorts] = useState<{ id: number; name: string }[] | null>(null);
  const [ressortId, setRessortId] = useState<number | null>(null);
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [fristDatum, setFristDatum] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ anlaesse: { id: number; name: string; datum: string }[] }>("/anlaesse")
      .then((d) => setAnlaesse(d.anlaesse))
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    setRessorts(null);
    setRessortId(null);
    if (!anlassId) return;
    api
      .get<{ ressorts: { id: number; name: string }[] }>(`/ressorts?anlass=${anlassId}`)
      .then((d) => {
        setRessorts(d.ressorts);
        if (d.ressorts[0]) setRessortId(d.ressorts[0].id);
      })
      .catch((e) => setError((e as Error).message));
  }, [anlassId]);

  const save = async () => {
    if (!titel.trim()) return setError("Titel erforderlich");
    if (anlassId && !ressortId) return setError("Ressort wählen");
    setSaving(true);
    setError("");
    try {
      await api.post("/todos", {
        ...(anlassId && ressortId ? { ressortId } : {}),
        titel: titel.trim(),
        beschreibung,
        fristDatum: fristDatum || null,
        assigneeIds: user ? [user.id] : [],
      });
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
      title="Todo für mich"
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
          <input className="input" value={titel} onChange={(e) => setTitel(e.target.value)} autoFocus placeholder="Was ist zu tun?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Anlass (optional)</label>
            <select className="input" value={anlassId ?? ""} onChange={(e) => setAnlassId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Keiner —</option>
              {(anlaesse ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          {anlassId && (
            <div>
              <label className="label">Ressort</label>
              <select className="input" value={ressortId ?? ""} onChange={(e) => setRessortId(Number(e.target.value))} disabled={!ressorts}>
                {(ressorts ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div>
          <label className="label">Frist (optional)</label>
          <input type="date" className="input" value={fristDatum} onChange={(e) => setFristDatum(e.target.value)} />
        </div>
        <div>
          <label className="label">Beschreibung (optional)</label>
          <textarea className="input min-h-[80px] resize-y text-sm" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
        </div>
        <p className="text-xs text-dim">
          Das Todo wird dir automatisch zugewiesen. Ohne Anlass bleibt es persönlich — wählst du einen Anlass, erscheint es auch im gewählten
          Ressort.
        </p>
        {error && <p className="err-box">{error}</p>}
      </div>
    </Modal>
  );
}

function TodoRowWithRessort({ todo, showRessort = true, onChanged }: { todo: Todo; showRessort?: boolean; onChanged: () => void }) {
  return (
    <div>
      {showRessort && todo.ressortName && (
        <div className="flex items-center gap-1.5 px-3 pt-2 text-xs font-medium" style={{ color: todo.ressortFarbe ?? "#64748b" }}>
          <span className="h-2 w-2 rounded-full" style={{ background: todo.ressortFarbe ?? "#64748b" }} />
          {todo.ressortName}
        </div>
      )}
      <TodoRow todo={{ ...todo, assignees: todo.assignees ?? [] }} detail onChanged={onChanged} onDeleted={onChanged} />
    </div>
  );
}
