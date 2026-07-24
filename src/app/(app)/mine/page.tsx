"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { EmptyState, MentionText, Spinner } from "@/components/Ui";
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
    </div>
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
