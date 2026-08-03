"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/apiClient";
import { Avatar, EmptyState, Modal, Spinner } from "@/components/Ui";
import { TodoRow } from "@/components/TodoRow";
import { TodoFormModal } from "@/components/TodoFormModal";
import { CommentThread } from "@/components/CommentThread";
import { AssigneePicker } from "@/components/AssigneePicker";
import { Zeitplan } from "@/components/Zeitplan";
import { Finanzen } from "@/components/Finanzen";
import { Acts } from "@/components/Acts";
import { Abrechnung } from "@/components/Abrechnung";
import { Sitzungen } from "@/components/Sitzungen";
import { Booking } from "@/components/Booking";
import { relTime } from "@/lib/uiUtil";
import type { ProtocolRef, Ressort, SubRessort, Todo } from "@/lib/uiTypes";
import { Icon } from "@/components/Icon";

interface DetailResponse {
  ressort: Ressort;
  subRessorts: SubRessort[];
  todos: Todo[];
  protocols: ProtocolRef[];
}

type TabKey = "todos" | "pinnwand" | "zeitplan" | "bars" | "finanzen" | "abrechnung" | "acts" | "sitzungen" | "anfragen";
const TAB_KEYS: TabKey[] = ["todos", "pinnwand", "zeitplan", "bars", "finanzen", "abrechnung", "acts", "sitzungen", "anfragen"];

export default function RessortPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const ressortId = Number(params.id);
  const [data, setData] = useState<DetailResponse | null>(null);
  // Startet ggf. auf dem via ?tab=… verlinkten Tab (z. B. aus einer Benachrichtigung).
  const initialTab = (() => {
    const t = searchParams.get("tab");
    return t && (TAB_KEYS as string[]).includes(t) ? (t as TabKey) : null;
  })();
  const [tab, setTab] = useState<TabKey | null>(initialTab);
  const [error, setError] = useState("");
  const [todoModal, setTodoModal] = useState<{ open: boolean; subId: number | null }>({ open: false, subId: null });
  const [createSeq, setCreateSeq] = useState(0); // erzwingt frisches Todo-Formular bei jedem Öffnen
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editSub, setEditSub] = useState<SubRessort | null>(null);
  const [deleteSub, setDeleteSub] = useState<SubRessort | null>(null);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [leadsOpen, setLeadsOpen] = useState(false);

  const openTodo = (subId: number | null) => {
    setCreateSeq((s) => s + 1);
    setTodoModal({ open: true, subId });
  };

  const load = useCallback(() => {
    api.get<DetailResponse>(`/ressorts/${ressortId}`).then(setData).catch((e) => setError((e as Error).message));
  }, [ressortId]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  if (error) return <p className=" bg-terra-light px-3 py-2 text-sm text-terra-dark">{error}</p>;
  if (!data) return <Spinner label="Lade Ressort …" />;

  const { ressort, subRessorts, todos, protocols } = data;
  const todosWithoutSub = todos.filter((t) => !t.subRessortId);
  const todosBySub = (subId: number) => todos.filter((t) => t.subRessortId === subId);
  const openTodoCount = todos.filter((t) => t.status !== "erledigt").length;
  // Spezialansichten öffnen standardmäßig ihren eigenen Tab.
  // Programmübersicht (Line-up/Bars) braucht keine Todos/Pinnwand; Acts schon.
  const spezial = !!ressort.hatZeitplan;
  const activeTab =
    tab ??
    (ressort.hatSitzungen
      ? "sitzungen"
      : ressort.hatBooking
        ? "anfragen"
        : ressort.hatActs
          ? "acts"
          : ressort.hatFinanzen
            ? "finanzen"
            : ressort.hatZeitplan
              ? "zeitplan"
              : "todos");

  return (
    <div className="space-y-4">
      {/* Kopf ohne Box – Titel prominent mit farbigem Punkt. */}
      <div className="px-1 pt-1">
        <Link href={ressort.anlassId != null ? `/anlass/${ressort.anlassId}` : "/hq"} className="text-sm text-mute">
          ← Übersicht
        </Link>
        <h1 className="mt-1 flex items-center gap-2.5 page-title">
          <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: ressort.farbe }} />
          {ressort.name}
        </h1>
        {ressort.beschreibung && <p className="mt-1 text-sm text-dim">{ressort.beschreibung}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-dim">Verantwortlich:</span>
          {ressort.leads.length === 0 && !ressort.externeLeads && <span className="text-xs text-dim">—</span>}
          {ressort.leads.map((u) => (
            <span key={u.id} className="flex items-center gap-1.5 rounded-full bg-surface2 py-0.5 pl-0.5 pr-2.5 text-sm">
              <Avatar name={u.name} color={u.avatarColor} size={22} userId={u.id} />
              {u.name}
            </span>
          ))}
          {(ressort.externeLeads ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((name) => (
              <span key={name} className="flex items-center gap-1.5 rounded-full border border-dashed border-line2 bg-surface2 px-2.5 py-0.5 text-sm">
                {name}
              </span>
            ))}
          <button
            className="grid h-7 w-7 place-items-center rounded-full border border-line2 text-dim active:scale-95"
            onClick={() => setLeadsOpen(true)}
            aria-label="Verantwortliche wählen"
          >
            <Icon name="pencil" size={13} />
          </button>
        </div>
      </div>

      {leadsOpen && (
        <LeadsModal
          ressortId={ressortId}
          initial={ressort.leads.map((u) => u.id)}
          initialExtern={ressort.externeLeads ?? ""}
          onClose={() => setLeadsOpen(false)}
          onSaved={() => {
            setLeadsOpen(false);
            load();
          }}
        />
      )}

      <div className="seg overflow-x-auto">
        {ressort.hatSitzungen && (
          <button className={`seg-item whitespace-nowrap px-3 ${activeTab === "sitzungen" ? "on" : ""}`} onClick={() => setTab("sitzungen")}>
            Sitzungen
          </button>
        )}
        {ressort.hatBooking && (
          <button className={`seg-item whitespace-nowrap px-3 ${activeTab === "anfragen" ? "on" : ""}`} onClick={() => setTab("anfragen")}>
            Anfragen
          </button>
        )}
        {ressort.hatActs && (
          <button className={`seg-item whitespace-nowrap px-3 ${activeTab === "acts" ? "on" : ""}`} onClick={() => setTab("acts")}>
            Acts
          </button>
        )}
        {ressort.hatFinanzen && (
          <>
            <button className={`seg-item whitespace-nowrap px-3 ${activeTab === "finanzen" ? "on" : ""}`} onClick={() => setTab("finanzen")}>
              Ausgaben
            </button>
            <button className={`seg-item whitespace-nowrap px-3 ${activeTab === "abrechnung" ? "on" : ""}`} onClick={() => setTab("abrechnung")}>
              Abrechnung
            </button>
          </>
        )}
        {ressort.hatZeitplan && (
          <>
            <button className={`seg-item whitespace-nowrap px-3 ${activeTab === "zeitplan" ? "on" : ""}`} onClick={() => setTab("zeitplan")}>
              Line-up
            </button>
            <button className={`seg-item whitespace-nowrap px-3 ${activeTab === "bars" ? "on" : ""}`} onClick={() => setTab("bars")}>
              Öffnungszeiten Bars
            </button>
          </>
        )}
        {!spezial && (
          <>
            <button className={`seg-item inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 ${activeTab === "todos" ? "on" : ""}`} onClick={() => setTab("todos")}>
              Todos
              {openTodoCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#c2453d] px-1 text-[11px] font-bold leading-none text-white">
                  {openTodoCount}
                </span>
              )}
            </button>
            <button className={`seg-item whitespace-nowrap px-3 ${activeTab === "pinnwand" ? "on" : ""}`} onClick={() => setTab("pinnwand")}>
              Pinnwand
            </button>
          </>
        )}
      </div>

      {activeTab === "sitzungen" ? (
        <Sitzungen ressortId={ressortId} />
      ) : activeTab === "anfragen" ? (
        <Booking ressortId={ressortId} />
      ) : activeTab === "acts" ? (
        <Acts ressortId={ressortId} />
      ) : activeTab === "finanzen" && ressort.anlassId != null ? (
        <Finanzen ressortId={ressortId} anlassId={ressort.anlassId} />
      ) : activeTab === "abrechnung" && ressort.anlassId != null ? (
        <Abrechnung anlassId={ressort.anlassId} />
      ) : activeTab === "zeitplan" ? (
        <Zeitplan ressortId={ressortId} board="programm" mode="acts" />
      ) : activeTab === "bars" ? (
        <Zeitplan ressortId={ressortId} board="bars" mode="bars" />
      ) : activeTab === "todos" ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={() => openTodo(null)}>
              + Todo
            </button>
            <button className="btn-ghost" onClick={() => setSubModalOpen(true)}>
              + Sub-Ressort
            </button>
          </div>

          {(todosWithoutSub.length > 0 || subRessorts.length === 0) && (
            <div className="card divide-y divide-line overflow-hidden">
              {todosWithoutSub.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon="🌱" title="Noch keine Todos" hint="Leg das erste an." />
                </div>
              ) : (
                todosWithoutSub.map((t) => <TodoRow key={t.id} todo={t} onChanged={load} onDeleted={load} />)
              )}
            </div>
          )}

          {subRessorts.map((sub) => {
            const subTodos = todosBySub(sub.id);
            const isCollapsed = collapsed[sub.id];
            const open = subTodos.filter((t) => t.status !== "erledigt").length;
            return (
              <div key={sub.id} className="card overflow-hidden">
                <div className="flex items-center gap-1 px-3 py-2.5">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setCollapsed((c) => ({ ...c, [sub.id]: !c[sub.id] }))}
                  >
                    <Icon name="chevron" size={16} className={`shrink-0 text-dim transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
                    <span className="block min-w-0 truncate font-semibold">{sub.name}</span>
                  </button>
                  <span className="chip shrink-0 bg-surface2 text-dim">{open} offen</span>
                  <button onClick={() => setEditSub(sub)} className="shrink-0  p-1.5 text-mute hover:bg-surface2 hover:text-accent" aria-label="Bearbeiten">
                    <Icon name="pencil" size={16} />
                  </button>
                  <button onClick={() => setDeleteSub(sub)} className="shrink-0  p-1.5 text-mute hover:bg-terra-light hover:text-red-500" aria-label="Löschen">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                {!isCollapsed && (
                  <div className="divide-y divide-line border-t border-line">
                    {sub.beschreibung && <p className="whitespace-pre-wrap px-4 py-2.5 text-sm text-dim">{sub.beschreibung}</p>}
                    {subTodos.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-dim">Noch keine Todos hier.</p>
                    ) : (
                      subTodos.map((t) => <TodoRow key={t.id} todo={t} onChanged={load} onDeleted={load} />)
                    )}
                    <button
                      className="w-full px-4 py-2.5 text-left text-sm font-semibold text-accent hover:bg-surface2"
                      onClick={() => openTodo(sub.id)}
                    >
                      + Todo hier
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {protocols.length > 0 && (
            <div>
              <h3 className="mb-2 px-1 text-sm font-semibold text-dim">Protokolle</h3>
              <div className="card divide-y divide-line overflow-hidden">
                {protocols.map((p) => (
                  <Link key={p.id} href={`/meetings/${p.meetingId}`} className="flex items-center justify-between px-4 py-3 active:bg-surface2">
                    <span className="flex items-center gap-2 text-sm"><Icon name="pencil" size={15} className="text-dim" /> {p.titel}</span>
                    <span className="text-xs text-dim">{relTime(p.updatedAt)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-4">
          <CommentThread parentTyp="ressort" parentId={ressortId} />
        </div>
      )}

      <TodoFormModal
        key={createSeq}
        open={todoModal.open}
        onClose={() => setTodoModal({ open: false, subId: null })}
        ressortId={ressortId}
        subRessorts={subRessorts}
        defaultSubRessortId={todoModal.subId}
        onSaved={load}
      />
      <SubRessortModal open={subModalOpen} onClose={() => setSubModalOpen(false)} ressortId={ressortId} onSaved={load} />
      {editSub && (
        <SubRessortModal
          open
          sub={editSub}
          onClose={() => setEditSub(null)}
          ressortId={ressortId}
          onSaved={() => {
            setEditSub(null);
            load();
          }}
        />
      )}
      {deleteSub && (
        <Modal
          open
          onClose={() => setDeleteSub(null)}
          title={`Sub-Ressort „${deleteSub.name}" löschen?`}
          footer={
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setDeleteSub(null)}>
                Abbrechen
              </button>
              <button
                className="btn-danger flex-1"
                onClick={async () => {
                  await api.del(`/ressorts/sub-ressorts/${deleteSub.id}`);
                  setDeleteSub(null);
                  load();
                }}
              >
                Löschen
              </button>
            </div>
          }
        >
          <p className="text-sm text-dim">Die Todos dieses Sub-Ressorts bleiben im Ressort erhalten (ohne Zuordnung).</p>
        </Modal>
      )}
    </div>
  );
}

function SubRessortModal({
  open,
  onClose,
  ressortId,
  sub,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  ressortId: number;
  sub?: SubRessort | null;
  onSaved: () => void;
}) {
  const editing = !!sub;
  const [name, setName] = useState(sub?.name ?? "");
  const [beschreibung, setBeschreibung] = useState(sub?.beschreibung ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/ressorts/sub-ressorts/${sub!.id}`, { name: name.trim(), beschreibung });
      } else {
        await api.post(`/ressorts/${ressortId}/sub-ressorts`, { name: name.trim(), beschreibung });
        setName("");
        setBeschreibung("");
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Sub-Ressort bearbeiten" : "Neues Sub-Ressort"}
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            {editing ? "Speichern" : "Anlegen"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="z. B. Treppenhaus" />
        </div>
        <div>
          <label className="label">Beschreibung (optional)</label>
          <textarea className="input min-h-[70px] resize-y" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

// Verantwortliche des Ressorts wählen — offen für alle Mitglieder.
function LeadsModal({
  ressortId,
  initial,
  initialExtern,
  onClose,
  onSaved,
}: {
  ressortId: number;
  initial: number[];
  initialExtern: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<number[]>(initial);
  const [extern, setExtern] = useState(initialExtern);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/ressorts/${ressortId}`, { leadUserIds: selected, externeLeads: extern });
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
      title="Verantwortliche wählen"
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
      <div className="space-y-4">
        <AssigneePicker selected={selected} onChange={setSelected} />
        <div>
          <label className="label">Externe (ohne App-Konto)</label>
          <input
            className="input"
            value={extern}
            onChange={(e) => setExtern(e.target.value)}
            placeholder="z. B. Bäscht — mehrere mit Komma trennen"
          />
        </div>
        {error && <p className="err-box">{error}</p>}
      </div>
    </Modal>
  );
}
