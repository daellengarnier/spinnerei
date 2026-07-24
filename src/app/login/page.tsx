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
