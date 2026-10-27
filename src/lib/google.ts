// «Mit Google anmelden» (OpenID Connect, Authorization-Code-Flow) — ohne
// NextAuth, passend zu den eigenen Sessions in lib/auth.ts. Zugelassen sind
// nur Google-Konten der Workspace-Domain (Standard: kulturspinnerei.ch).
import "server-only";
import crypto from "node:crypto";

export const GOOGLE_STATE_COOKIE = "spinnerei_google_state";
export const GOOGLE_PENDING_COOKIE = "spinnerei_google_pending";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const appUrl = (process.env.APP_URL || "https://spinnerei.al-daellen.ch").replace(/\/$/, "");
  return {
    clientId,
    clientSecret,
    appUrl,
    domain: (process.env.GOOGLE_ALLOWED_DOMAIN || "kulturspinnerei.ch").toLowerCase(),
    redirectUri: `${appUrl}/api/auth/google/callback`,
    // Überschreibbar nur für lokale Tests mit einem Mock-Server.
    tokenEndpoint: process.env.GOOGLE_TOKEN_ENDPOINT || "https://oauth2.googleapis.com/token",
    eingerichtet: !!clientId && !!clientSecret,
  };
}

export function cookieSecure(): boolean {
  const env = process.env.COOKIE_SECURE ?? "auto";
  return env === "true" ? true : env === "false" ? false : process.env.NODE_ENV === "production";
}

export function authUrl(state: string): string {
  const c = googleConfig();
  const params = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    hd: c.domain, // Google zeigt nur Konten dieser Domain an (geprüft wird trotzdem serverseitig)
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export interface GoogleIdentitaet {
  sub: string;
  email: string;
  name: string;
}

export type GoogleFehler = "fehler" | "domain";

// Code gegen Tokens tauschen und die Identität aus dem ID-Token prüfen. Das
// ID-Token kommt direkt vom Token-Endpunkt (TLS, mit Client-Secret), daher
// genügt die Prüfung der Claims (OpenID Connect Core 3.1.3.7).
export async function identitaetAusCode(code: string): Promise<GoogleIdentitaet | GoogleFehler> {
  const c = googleConfig();
  let idToken: string | undefined;
  try {
    const res = await fetch(c.tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: c.clientId,
        client_secret: c.clientSecret,
        redirect_uri: c.redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn("Google-Token-Tausch fehlgeschlagen:", res.status);
      return "fehler";
    }
    idToken = ((await res.json()) as { id_token?: string }).id_token;
  } catch (e) {
    console.warn("Google-Token-Tausch fehlgeschlagen:", e);
    return "fehler";
  }
  if (!idToken) return "fehler";

  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8"));
  } catch {
    return "fehler";
  }
  const iss = String(claims.iss ?? "");
  const exp = Number(claims.exp ?? 0);
  if (claims.aud !== c.clientId || (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") || exp * 1000 < Date.now()) {
    return "fehler";
  }
  const email = String(claims.email ?? "").toLowerCase();
  const sub = String(claims.sub ?? "");
  if (!sub || !email || claims.email_verified !== true) return "fehler";
  // Nur Konten der Spinnerei-Domain: «hd» (Workspace) UND die E-Mail-Domain.
  if (String(claims.hd ?? "").toLowerCase() !== c.domain || !email.endsWith(`@${c.domain}`)) return "domain";
  return { sub, email, name: String(claims.name ?? "").trim() || email.split("@")[0] };
}

// Kurzlebiges, signiertes Cookie für «Wer bist du?» (Google-Konto noch ohne
// App-Profil). Signiert mit dem Client-Secret, das nur der Server kennt.
const PENDING_MINUTEN = 15;

function signatur(daten: string): string {
  return crypto.createHmac("sha256", googleConfig().clientSecret).update(daten).digest("base64url");
}

export function pendingWert(id: GoogleIdentitaet): string {
  const daten = Buffer.from(JSON.stringify({ ...id, exp: Date.now() + PENDING_MINUTEN * 60_000 })).toString("base64url");
  return `${daten}.${signatur(daten)}`;
}

export function pendingLesen(wert: string | undefined): GoogleIdentitaet | null {
  if (!wert || !googleConfig().eingerichtet) return null;
  const [daten, sig] = wert.split(".");
  if (!daten || !sig) return null;
  const erwartet = signatur(daten);
  if (sig.length !== erwartet.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(erwartet))) return null;
  try {
    const v = JSON.parse(Buffer.from(daten, "base64url").toString("utf8"));
    if (typeof v.exp !== "number" || v.exp < Date.now()) return null;
    return { sub: String(v.sub), email: String(v.email), name: String(v.name) };
  } catch {
    return null;
  }
}

export const PENDING_MAX_AGE = PENDING_MINUTEN * 60;
