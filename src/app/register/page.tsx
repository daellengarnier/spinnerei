"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { InstallInstructions } from "@/components/InstallInstructions";

interface Profile { id: number; name: string; avatarColor: string }

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [choice, setChoice] = useState(""); // "" = noch nichts, "__new__" = neuer Name, sonst Profilname
  const [newName, setNewName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/unclaimed")
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((d: { profiles: Profile[] }) => setProfiles(d.profiles ?? []))
      .catch(() => setProfiles([]));
  }, []);

  const isNew = choice === "__new__" || profiles.length === 0;
  const name = isNew ? newName : choice;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Bitte deinen Namen wählen oder eingeben.");
    if (password.length < 6) return setError("Passwort muss mindestens 6 Zeichen haben.");
    if (password !== confirm) return setError("Die beiden Passwörter stimmen nicht überein.");
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, code: code.trim() || undefined });
      router.replace("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pwa-192x192.png" alt="Spinnerei-Logo" className="mx-auto mb-4 h-16 w-16" />
          <p className="lbl mb-2">Orga-App der Spinnerei</p>
          <h1 className="page-title text-4xl">Konto erstellen</h1>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          {profiles.length > 0 && (
            <div>
              <label className="label" htmlFor="choice">Dein Name</label>
              <select id="choice" className="input" value={choice} onChange={(e) => setChoice(e.target.value)} required>
                <option value="" disabled>
                  Wähle deinen Namen …
                </option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
                <option value="__new__">Ich bin nicht in der Liste …</option>
              </select>
              <p className="mt-1 text-xs text-dim">Wähle dein vorbereitetes Profil – dir zugeteilte Todos bleiben erhalten.</p>
            </div>
          )}
          {isNew && (
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Vorname" required />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.ch"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mind. 6 Zeichen"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Passwort bestätigen</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="code">Einladungscode <span className="font-normal text-dim">(falls vorhanden)</span></label>
            <input id="code" className="input" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          {error && <p className=" bg-terra-light px-3 py-2 text-sm text-terra-dark">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Konto wird erstellt …" : "Registrieren"}
          </button>
          <p className="text-center text-sm text-dim">
            Schon ein Konto?{" "}
            <Link href="/login" className="font-medium text-accent">
              Anmelden
            </Link>
          </p>
        </form>

        <details className="card mt-4 p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-ink">App auf den Homebildschirm legen</summary>
          <div className="mt-3">
            <InstallInstructions />
          </div>
        </details>
      </div>
    </div>
  );
}
