"use client";

// «Wer bist du?» — nach der ersten Google-Anmeldung, wenn es noch kein Konto
// mit dieser E-Mail gibt: vorbereitetes Profil übernehmen oder neu anlegen.
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { Avatar, Spinner } from "@/components/Ui";

interface Daten {
  email: string;
  name: string;
  profile: { id: number; name: string; avatarColor: string }[];
}

export default function GoogleProfilPage() {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Daten>("/auth/google/abschliessen")
      .then((d) => {
        setDaten(d);
        setName(d.name);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const abschliessen = async (payload: { profilId: number } | { neu: true; name: string }) => {
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/google/abschliessen", payload);
      window.location.replace("/");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-bg flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <p className="lbl mb-2">Willkommen</p>
          <h1 className="page-title text-4xl">Wer bist du?</h1>
        </div>

        <div className="card space-y-4 p-6">
          {!daten ? (
            error ? (
              <>
                <p className="err-box">{error}</p>
                <Link href="/login" className="btn-primary w-full">
                  Zur Anmeldung
                </Link>
              </>
            ) : (
              <Spinner />
            )
          ) : (
            <>
              <p className="text-sm text-dim">
                Angemeldet als <span className="text-ink">{daten.email}</span>. Für diese Adresse gibt es noch kein Profil in der App.
              </p>

              {daten.profile.length > 0 && (
                <div>
                  <p className="label">Dein vorbereitetes Profil</p>
                  <div className="grid grid-cols-2 gap-2">
                    {daten.profile.map((p) => (
                      <button
                        key={p.id}
                        disabled={busy}
                        onClick={() => abschliessen({ profilId: p.id })}
                        className="flex min-h-[44px] items-center gap-2 border border-line2 px-3 text-left text-sm font-semibold text-ink hover:border-accent"
                      >
                        <Avatar name={p.name} color={p.avatarColor} size={24} showName={false} />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[.14em] text-mute">
                <span className="h-px flex-1 bg-line2" />
                {daten.profile.length > 0 ? "oder neu" : "Neues Profil"}
                <span className="h-px flex-1 bg-line2" />
              </div>

              <div>
                <label className="label" htmlFor="name">
                  Name in der App
                </label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <button className="btn-primary w-full" disabled={busy || !name.trim()} onClick={() => abschliessen({ neu: true, name: name.trim() })}>
                {busy ? "Einen Moment …" : "Neues Profil anlegen"}
              </button>
              {error && <p className="err-box">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
