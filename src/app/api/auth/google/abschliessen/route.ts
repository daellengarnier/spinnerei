import crypto from "node:crypto";
import { and, count, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createSession, hashPassword, jsonError, setSessionCookie } from "@/lib/auth";
import { GOOGLE_PENDING_COOKIE, pendingLesen } from "@/lib/google";

const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#ec4899"];

// «Wer bist du?»: Google-Konto ohne App-Profil.
// GET  → Google-Identität + noch nicht übernommene, vorbereitete Profile.
// POST → { profilId } übernimmt ein vorbereitetes Profil, { neu: true, name } legt ein Konto an.
export async function GET() {
  const id = pendingLesen((await cookies()).get(GOOGLE_PENDING_COOKIE)?.value);
  if (!id) return jsonError("Google-Anmeldung abgelaufen — bitte nochmals mit Google anmelden.", 401);
  const profile = await getDb()
    .select({ id: users.id, name: users.name, avatarColor: users.avatarColor })
    .from(users)
    .where(eq(users.claimed, false))
    .orderBy(users.name);
  return Response.json({ email: id.email, name: id.name, profile });
}

export async function POST(request: Request) {
  const store = await cookies();
  const id = pendingLesen(store.get(GOOGLE_PENDING_COOKIE)?.value);
  if (!id) return jsonError("Google-Anmeldung abgelaufen — bitte nochmals mit Google anmelden.", 401);
  const body = await request.json().catch(() => ({}));
  const db = getDb();

  // Doppelklick/zweiter Tab: Google-Kennung oder E-Mail inzwischen vergeben?
  if ((await db.select({ id: users.id }).from(users).where(eq(users.googleSub, id.sub)).limit(1))[0]) {
    return jsonError("Dieses Google-Konto ist bereits verknüpft — bitte neu anmelden.", 409);
  }
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const ersterAccount = (await db.select({ c: count() }).from(users).where(eq(users.claimed, true)))[0].c === 0;
  const zufallsPasswort = hashPassword(crypto.randomBytes(24).toString("hex")); // Anmeldung nur über Google

  let userId: number;
  if (body?.profilId) {
    const profil = (
      await db
        .select({ id: users.id, rolle: users.rolle })
        .from(users)
        .where(and(eq(users.id, Number(body.profilId)), eq(users.claimed, false)))
        .limit(1)
    )[0];
    if (!profil) return jsonError("Dieses Profil ist schon vergeben.", 409);
    const emailBelegt = (
      await db.select({ id: users.id }).from(users).where(and(eq(users.email, id.email), ne(users.id, profil.id))).limit(1)
    )[0];
    if (emailBelegt) return jsonError("Diese E-Mail gehört bereits zu einem anderen Konto.", 409);
    const admin = profil.rolle === "admin" || ersterAccount || adminEmails.includes(id.email);
    await db
      .update(users)
      .set({
        email: id.email,
        googleSub: id.sub,
        passwordHash: zufallsPasswort,
        claimed: true,
        active: true,
        mustChangePassword: false,
        rolle: admin ? "admin" : "mitglied",
      })
      .where(eq(users.id, profil.id));
    userId = profil.id;
  } else if (body?.neu) {
    const name = String(body?.name ?? id.name).trim().slice(0, 60);
    if (!name) return jsonError("Name erforderlich", 400);
    if ((await db.select({ id: users.id }).from(users).where(eq(users.email, id.email)).limit(1))[0]) {
      return jsonError("Diese E-Mail gehört bereits zu einem anderen Konto.", 409);
    }
    const inserted = await db
      .insert(users)
      .values({
        name,
        email: id.email,
        googleSub: id.sub,
        passwordHash: zufallsPasswort,
        rolle: ersterAccount || adminEmails.includes(id.email) ? "admin" : "mitglied",
        avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
      })
      .returning({ id: users.id });
    userId = inserted[0].id;
  } else {
    return jsonError("profilId oder neu erforderlich", 400);
  }

  await setSessionCookie(await createSession(userId));
  store.delete(GOOGLE_PENDING_COOKIE);
  return Response.json({ ok: true });
}
