"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { mustChangePassword } = await login(email.trim(), password);
      router.replace(mustChangePassword ? "/passwort?forced=1" : "/");
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
          <img src="/pwa-192x192.png" alt="Spinnerei-Logo" className="mx-auto mb-4 h-20 w-20" />
          <p className="lbl mb-2">Orga</p>
          <h1 className="page-title text-5xl">Spinnerei</h1>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <a
            href="/api/auth/google"
            className="flex min-h-[48px] w-full items-center justify-center gap-3 border border-line2 bg-[#131314] px-4 text-[15px] font-semibold text-[#e3e3e3] transition hover:border-accent active:scale-[.98]"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Mit Google anmelden
          </a>
          <p className="-mt-1 text-center text-xs text-dim">Nur mit deinem @kulturspinnerei.ch-Konto</p>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[.14em] text-mute">
            <span className="h-px flex-1 bg-line2" />
            oder mit E-Mail
            <span className="h-px flex-1 bg-line2" />
          </div>

          <div>
            <label className="label" htmlFor="email">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@al-daellen.ch"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className=" bg-terra-light px-3 py-2 text-sm text-terra-dark">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Anmelden …" : "Anmelden"}
          </button>
          <p className="text-center text-sm text-dim">
            Noch kein Konto?{" "}
            <Link href="/register" className="font-medium text-accent">
              Registrieren
            </Link>
          </p>
          <p className="text-center text-xs text-dim">Angemeldet bleiben ist standardmässig aktiv.</p>
        </form>
      </div>
    </div>
  );
}
