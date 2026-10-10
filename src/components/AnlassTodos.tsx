"use client";

// Todos eines Anlasses — eine gemeinsame Liste statt pro Ressort. Bereiche
// (die bisherigen Ressorts) erscheinen als farbige Etiketten; jedes Todo zeigt,
// wer es erstellt hat («von») und wer es machen muss («für», auch mehrere).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { useAuth } from "./AuthContext";
import { useUsers } from "@/lib/useUsers";
import { Avatar, EmptyState, Modal, Spinner } from "./Ui";
import { Icon } from "./Icon";
import { AssigneePicker } from "./AssigneePicker";
import { formatDate, isOverdue } from "@/lib/uiUtil";
import type { Todo, TodoStatus, UserLite } from "@/lib/uiTypes";

export interface Bereich {
  id: number;
  name: string;
  farbe: string;
}

type Filter = "fuer_mich" | "von_mir" | "alle" | "erledigt";
const FILTER: { key: Filter; label: string }[] = [
  { key: "fuer_mich", label: "Für mich" },
  { key: "von_mir", label: "Von mir" },
  { key: "alle", label: "Alle" },
  { key: "erledigt", label: "Erledigt" },
];
const OHNE_BEREICH = -1;

export function AnlassTodos({ anlassId, onNeu }: { anlassId: number; onNeu: () => void }) {
  const { user } = useAuth();
  const users = useUsers();
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [bereiche, setBereiche] = useState<Bereich[]>([]);
  const [filter, setFilter] = useState<Filter>("alle");
  const [bereichFilter, setBereichFilter] = useState<number | null>(null);
  const [quick, setQuick] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      api
        .get<{ todos: Todo[]; bereiche: Bereich[] }>(`/anlaesse/${anlassId}/todos`)
        .then((d) => {
          setTodos(d.todos);
          setBereiche(d.bereiche);
        })
        .catch((e) => setError((e as Error).message)),
    [anlassId],
  );
  useEffect(() => {
    load();
    const reload = () => load();
    window.addEventListener("spinnerei:anlass-todos", reload);
    return () => window.removeEventListener("spinnerei:anlass-todos", reload);
  }, [load]);

  // Schnell erfassen: «Plakate aufhängen @Nina @Mike» → Nina & Mike zuständig.
  const quickAdd = async () => {
    let titel = quick.trim();
    if (!titel) return;
    const assigneeIds: number[] = [];
    for (const u of users) {
      const tag = new RegExp(`@${u.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "iu");
      if (tag.test(titel)) {
        assigneeIds.push(u.id);
        titel = titel.replace(tag, "").replace(/\s{2,}/g, " ").trim();
      }
    }
    if (!titel) return;
    setQuick("");
    try {
      await api.post("/todos", { anlassId, titel, assigneeIds });
      window.dispatchEvent(new Event("spinnerei:refresh-inbox"));
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggle = async (t: Todo) => {
    const next: TodoStatus = t.status === "erledigt" ? "offen" : "erledigt";
    setTodos((list) => list?.map((x) => (x.id === t.id ? { ...x, status: next } : x)) ?? null);
    try {
      await api.patch(`/todos/${t.id}`, { status: next });
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  };

  if (!todos) return error ? <p className="err-box">{error}</p> : <Spinner label="Lade Todos …" />;

  const uid = user?.id;
  const sichtbar = todos.filter((t) => {
    const erledigt = t.status === "erledigt";
    if (filter === "erledigt" ? !erledigt : erledigt) return false;
    if (filter === "fuer_mich" && !t.assignees.some((a) => a.id === uid)) return false;
    if (filter === "von_mir" && t.erstelltVon !== uid) return false;
    if (bereichFilter === OHNE_BEREICH) return !t.ressortId;
    if (bereichFilter !== null) return t.ressortId === bereichFilter;
    return true;
  });
  const anzahl = (f: Filter) =>
    todos.filter((t) =>
      f === "erledigt"
        ? t.status === "erledigt"
        : t.status !== "erledigt" &&
          (f === "alle" || (f === "fuer_mich" ? t.assignees.some((a) => a.id === uid) : t.erstelltVon === uid)),
    ).length;
  const genutzteBereiche = bereiche.filter((b) => todos.some((t) => t.ressortId === b.id));
  const hatOhne = todos.some((t) => !t.ressortId);

  return (
    <div className="space-y-3">
      <div className="seg flex p-0.5">
        {FILTER.map((f) => (
          <button key={f.key} className={`seg-item flex-1 whitespace-nowrap px-1 py-1.5 text-[13px] ${filter === f.key ? "on" : ""}`} onClick={() => setFilter(f.key)}>
            {f.label}
            {f.key !== "erledigt" && anzahl(f.key) > 0 && <span className="ml-1 text-xs opacity-70">{anzahl(f.key)}</span>}
          </button>
        ))}
      </div>

      {(genutzteBereiche.length > 0 || hatOhne) && (
        <div className="flex flex-wrap gap-1.5">
          {genutzteBereiche.map((b) => (
            <button
              key={b.id}
              onClick={() => setBereichFilter(bereichFilter === b.id ? null : b.id)}
              className={`inline-flex items-center gap-1.5 border px-2 py-1 text-xs ${bereichFilter === b.id ? "border-accent text-ink" : "border-line2 text-dim"}`}
            >
              <span className="h-2 w-2" style={{ background: b.farbe }} />
              {b.name}
            </button>
          ))}
          {hatOhne && (
            <button
              onClick={() => setBereichFilter(bereichFilter === OHNE_BEREICH ? null : OHNE_BEREICH)}
              className={`border px-2 py-1 text-xs ${bereichFilter === OHNE_BEREICH ? "border-accent text-ink" : "border-line2 text-dim"}`}
            >
              Allgemein
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="input min-w-0 flex-1"
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && quickAdd()}
          placeholder="Neues Todo … (@Name zum Verteilen)"
          aria-label="Neues Todo"
        />
        <button className="btn-primary shrink-0 px-3" onClick={quick.trim() ? quickAdd : onNeu} aria-label={quick.trim() ? "Todo hinzufügen" : "Todo mit Details erstellen"}>
          <Icon name="plus" size={18} />
        </button>
      </div>
      {error && <p className="err-box">{error}</p>}

      {sichtbar.length === 0 ? (
        <EmptyState
          title={filter === "erledigt" ? "Noch nichts erledigt" : filter === "fuer_mich" ? "Nichts für dich offen" : "Keine offenen Todos"}
          hint="Neues Todo oben eintippen – mit @Name verteilst du es direkt."
        />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {sichtbar.map((t) => (
            <TodoZeile key={t.id} todo={t} onToggle={() => toggle(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TodoZeile({ todo, onToggle }: { todo: Todo; onToggle: () => void }) {
  const done = todo.status === "erledigt";
  const overdue = isOverdue(todo.fristDatum, todo.status);
  return (
    <Link href={`/todo/${todo.id}`} className="flex items-start gap-3 px-3 py-2.5 active:bg-surface2">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        aria-label={done ? "Wieder öffnen" : "Erledigt"}
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border-2 ${done ? "border-accent bg-accent text-white" : "border-line2 text-transparent"}`}
      >
        <Icon name="check" size={13} strokeWidth={2.4} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium ${done ? "text-dim line-through" : "text-ink"}`}>{todo.titel}</p>
          {todo.fristDatum && (
            <span className={`shrink-0 text-xs ${overdue ? "font-semibold text-terra-dark" : "text-dim"}`}>{formatDate(todo.fristDatum)}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-dim">
          {todo.ressort && (
            <span className="inline-flex items-center gap-1 border border-line2 px-1.5 py-px">
              <span className="h-1.5 w-1.5" style={{ background: todo.ressort.farbe }} />
              {todo.ressort.name}
            </span>
          )}
          {todo.erstelltVonName && (
            <span>
              von <span className="text-ink">{todo.erstelltVonName}</span>
            </span>
          )}
          {todo.assignees.length > 0 ? (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              → für
              {todo.assignees.map((a: UserLite) => (
                <span key={a.id} className="inline-flex items-center gap-1 text-ink">
                  <Avatar name={a.name} color={a.avatarColor} size={16} userId={a.id} showName={false} />
                  {a.name}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-accent">noch niemand zuständig</span>
          )}
          {!!todo.commentCount && (
            <span className="inline-flex items-center gap-1">
              <Icon name="chat" size={12} /> {todo.commentCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Todo mit Details erfassen (auch aus einer Chat-Nachricht heraus).
export function AnlassTodoModal({
  anlassId,
  initialTitel = "",
  onClose,
  onSaved,
}: {
  anlassId: number;
  initialTitel?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [titel, setTitel] = useState(initialTitel);
  const [beschreibung, setBeschreibung] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [bereiche, setBereiche] = useState<Bereich[]>([]);
  const [ressortId, setRessortId] = useState<number | null>(null);
  const [fristDatum, setFristDatum] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ ressorts: Bereich[] }>(`/ressorts?anlass=${anlassId}`)
      .then((d) => setBereiche(d.ressorts))
      .catch(() => setBereiche([]));
  }, [anlassId]);

  const save = async () => {
    if (!titel.trim()) return setError("Titel erforderlich");
    setSaving(true);
    setError("");
    try {
      await api.post("/todos", {
        ...(ressortId ? { ressortId } : { anlassId }),
        titel: titel.trim(),
        beschreibung,
        fristDatum: fristDatum || null,
        assigneeIds,
      });
      window.dispatchEvent(new Event("spinnerei:refresh-inbox"));
      window.dispatchEvent(new Event("spinnerei:anlass-todos"));
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
      title="Neues Todo"
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            {saving ? "Speichern …" : assigneeIds.length > 0 ? "Todo verteilen" : "Speichern"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Was</label>
          <input className="input" value={titel} onChange={(e) => setTitel(e.target.value)} autoFocus placeholder="Was ist zu tun?" />
        </div>
        <div>
          <label className="label">Wer macht&apos;s? (mehrere möglich)</label>
          <AssigneePicker selected={assigneeIds} onChange={setAssigneeIds} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Bereich</label>
            <select className="input" value={ressortId ?? ""} onChange={(e) => setRessortId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Allgemein —</option>
              {bereiche.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Bis wann</label>
            <input type="date" className="input" value={fristDatum} onChange={(e) => setFristDatum(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Details (optional)</label>
          <textarea className="input min-h-[70px] resize-y text-sm" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
        </div>
        <p className="text-xs text-dim">
          Erstellt von <span className="text-ink">{user?.name}</span>
          {assigneeIds.length > 0 && " · die Zuständigen bekommen eine Benachrichtigung"}.
        </p>
        {error && <p className="err-box">{error}</p>}
      </div>
    </Modal>
  );
}
