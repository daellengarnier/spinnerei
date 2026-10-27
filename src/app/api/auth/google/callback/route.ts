import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { SESSION_COOKIE, createSession, getCurrentUser, sessionCookieOptions } from "@/lib/auth";
import {
  GOOGLE_PENDING_COOKIE,
  GOOGLE_STATE_COOKIE,
  PENDING_MAX_AGE,
  cookieSecure,
  googleConfig,
  identitaetAusCode,
  pendingWert,
} from "@/lib/google";

// Rückkehr von Google: Identität prüfen, dann
// 1. Konto mit dieser Google-Kennung → anmelden,
// 2. Konto mit gleicher E-Mail → verknüpfen und anmelden,
// 3. sonst → «Wer bist du?» (vorbereitetes Profil übernehmen oder neu).
// Im Modus «verknuepfen» wird das eingeloggte Konto mit Google verbunden.
export async function GET(request: Request) {
  const c = googleConfig();
  const ziel = (pfad: string) => {
    const res = NextResponse.redirect(new URL(pfad, c.appUrl));
    res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return res;
  };
  if (!c.eingerichtet) return ziel("/login?google=nicht_eingerichtet");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const [erwartet, modus] = ((await cookies()).get(GOOGLE_STATE_COOKIE)?.value ?? "").split(".");
  const stateOk =
    !!erwartet && erwartet.length === state.length && crypto.timingSafeEqual(Buffer.from(erwartet), Buffer.from(state));
  if (url.searchParams.get("error")) return ziel("/login?google=abgebrochen");
  if (!code || !stateOk) return ziel("/login?google=fehler");

  const id = await identitaetAusCode(code);
  if (id === "domain") return ziel(modus === "verknuepfen" ? "/?google=domain" : "/login?google=domain");
  if (id === "fehler") return ziel(modus === "verknuepfen" ? "/?google=fehler" : "/login?google=fehler");

  const db = getDb();
  const mitSub = (await db.select().from(users).where(eq(users.googleSub, id.sub)).limit(1))[0];

  if (modus === "verknuepfen") {
    const ich = await getCurrentUser();
    if (!ich) return ziel("/login");
    if (mitSub && mitSub.id !== ich.id) return ziel("/?google=schon_vergeben");
    await db.update(users).set({ googleSub: id.sub }).where(eq(users.id, ich.id));
    return ziel("/?google=verknuepft");
  }

  const anmelden = async (userId: number) => {
    const res = ziel("/");
    res.cookies.set(SESSION_COOKIE, await createSession(userId), sessionCookieOptions());
    return res;
  };

  if (mitSub) return mitSub.active ? anmelden(mitSub.id) : ziel("/login?google=inaktiv");

  const mitEmail = (await db.select().from(users).where(eq(users.email, id.email)).limit(1))[0];
  if (mitEmail && mitEmail.claimed) {
    if (mitEmail.googleSub) return ziel("/login?google=schon_vergeben");
    if (!mitEmail.active) return ziel("/login?google=inaktiv");
    await db.update(users).set({ googleSub: id.sub }).where(eq(users.id, mitEmail.id));
    return anmelden(mitEmail.id);
  }

  // Noch kein Konto: Auswahl «Wer bist du?» mit kurzlebigem, signiertem Cookie.
  const res = ziel("/login/google");
  res.cookies.set(GOOGLE_PENDING_COOKIE, pendingWert(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: PENDING_MAX_AGE,
  });
  return res;
}
