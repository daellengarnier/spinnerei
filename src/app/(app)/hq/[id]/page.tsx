"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/apiClient";
import { Avatar, EmptyState, Spinner } from "@/components/Ui";
import { TodoRow } from "@/components/TodoRow";
import { TodoFormModal } from "@/components/TodoFormModal";
import { CommentThread } from "@/components/CommentThread";
import { Sitzungen } from "@/components/Sitzungen";
import { Booking } from "@/components/Booking";
import type { Ressort, Todo } from "@/lib/uiTypes";

// Vereinsressort im HQ: bewusst anders als die Anlass-Ressorts (hell, ruhig,
// ohne Tab-Leiste). Sitzungen zeigen das Sitzungsbuch, Booking die Anfragen,
// alle anderen ihre Todos und die Pinnwand nebeneinander.
export default function HqRessortPage() {
  const ressortId = Number(useParams<{ id: string }>().id);
  const [data, setData] = useState<{ ressort: Ressort; todos: Todo[] } | null>(null);
  const [error, setError] = useState("");
  const [todoOpen, setTodoOpen] = useState(false);
  const [createSeq, setCreateSeq] = useState(0);

  const load = useCallback(() => {
    api
      .get<{ ressort: Ressort; todos: Todo[] }>(`/ressorts/${ressortId}`)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [ressortId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="hq-light -mx-4 -mt-4 -mb-24 min-h-[100dvh] px-4 pb-28 pt-5 lg:m-0 lg:min-h-0 lg:rounded-3xl lg:px-8 lg:pb-8 lg:pt-7">
      {error ? (
        <p className="err-box">{error}</p>
      ) : !data ? (
        <Spinner label="Lade …" />
      ) : (
        <>
          <header className="mb-5 px-1">
            <Link href="/hq" className="text-sm text-dim hover:text-ink">
              ← HQ
            </Link>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">{data.ressort.name}</h1>
            {data.ressort.beschreibung && <p className="mt-1 text-sm text-dim">{data.ressort.beschreibung}</p>}
            {(data.ressort.leads.length > 0 || data.ressort.externeLeads) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-dim">
                Verantwortlich:
                {data.ressort.leads.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1">
                    <Avatar name={u.name} color={u.avatarColor} size={18} userId={u.id} showName={false} /> {u.name}
                  </span>
                ))}
                {data.ressort.externeLeads && <span>{data.ressort.externeLeads}</span>}
              </div>
            )}
          </header>

          {data.ressort.hatSitzungen ? (
            <Sitzungen ressortId={ressortId} />
          ) : data.ressort.hatBooking ? (
            <Booking ressortId={ressortId} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <section>
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="lbl">Todos</h2>
                  <button
                    className="text-xs font-semibold text-ink hover:underline"
                    onClick={() => {
                      setCreateSeq((s) => s + 1);
                      setTodoOpen(true);
                    }}
                  >
                    + Todo
                  </button>
                </div>
                {data.todos.length === 0 ? (
                  <EmptyState title="Noch keine Todos" hint="Leg das erste an." />
                ) : (
                  <div className="card divide-y divide-line overflow-hidden">
                    {data.todos.map((t) => (
                      <TodoRow key={t.id} todo={t} onChanged={load} onDeleted={load} />
                    ))}
                  </div>
                )}
              </section>
              <section>
                <h2 className="lbl mb-2 px-1">Pinnwand</h2>
                <div className="card p-4">
                  <CommentThread parentTyp="ressort" parentId={ressortId} />
                </div>
              </section>
            </div>
          )}

          <TodoFormModal key={createSeq} open={todoOpen} onClose={() => setTodoOpen(false)} ressortId={ressortId} subRessorts={[]} onSaved={load} />
        </>
      )}
    </div>
  );
}
