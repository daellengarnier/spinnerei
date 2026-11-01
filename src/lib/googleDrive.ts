// Belege im Google Drive ablegen. Ein Admin verbindet einmal ein Google-Konto
// mit Schreibrecht auf den Finanzen-Ordner (z. B. info@kulturspinnerei.ch);
// das Refresh-Token liegt in app_settings (nur auf dem Server, nie im Repo).
//
// Ablage: <Finanzen-Ordner>/<Jahr>/<Datum> <Anlass> <Kategorie> <Beschreibung> CHF <Betrag>.<ext>
// Der Jahresordner wird angelegt, falls er fehlt. Bereits abgelegte Belege
// (attachments.driveFileId) werden nie ein zweites Mal hochgeladen.
import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { anlaesse, appSettings, attachments, expenses, ressorts } from "@/lib/db/schema";
import { googleConfig } from "@/lib/google";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const TOKEN_KEY = "drive_refresh_token";
const KONTO_KEY = "drive_konto";
const FOLDER_MIME = "application/vnd.google-apps.folder";
// Überschreibbar nur für lokale Tests mit einem Mock-Server.
const BASIS = process.env.GOOGLE_DRIVE_API || "https://www.googleapis.com";
const API = `${BASIS}/drive/v3`;

// «4 Finanzen/ Admin» im Spinnerei-Drive; per DRIVE_BELEGE_ORDNER überschreibbar.
export function finanzenOrdnerId(): string {
  return process.env.DRIVE_BELEGE_ORDNER || "1V_DZwi29uBEg4_wBRs02xTIGGfIUl-K6";
}

async function setting(key: string): Promise<string | null> {
  const rows = await getDb().select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return rows[0]?.value || null;
}

async function setSetting(key: string, value: string) {
  await getDb()
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}

export async function driveStatus(): Promise<{ verbunden: boolean; konto: string | null }> {
  return { verbunden: !!(await setting(TOKEN_KEY)), konto: await setting(KONTO_KEY) };
}

export async function driveVerbindungSpeichern(refreshToken: string, konto: string) {
  await setSetting(TOKEN_KEY, refreshToken);
  await setSetting(KONTO_KEY, konto);
}

export async function driveTrennen() {
  await getDb().delete(appSettings).where(sql`${appSettings.key} in (${TOKEN_KEY}, ${KONTO_KEY})`);
}

async function accessToken(): Promise<string> {
  const refresh = await setting(TOKEN_KEY);
  if (!refresh) throw new Error("Google Drive ist nicht verbunden");
  const c = googleConfig();
  const res = await fetch(c.tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, refresh_token: refresh, grant_type: "refresh_token" }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Drive-Token: HTTP ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function driveFetch(token: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Drive: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const q = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

// Unterordner mit diesem Namen finden oder anlegen.
async function ordner(token: string, parentId: string, name: string): Promise<string> {
  const params = new URLSearchParams({
    q: `'${q(parentId)}' in parents and name = '${q(name)}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const found = (await driveFetch(token, `${API}/files?${params}`)) as { files: { id: string }[] };
  if (found.files[0]) return found.files[0].id;
  const created = (await driveFetch(token, `${API}/files?supportsAllDrives=true&fields=id`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  })) as { id: string };
  return created.id;
}

async function hochladen(token: string, parentId: string, name: string, mime: string, daten: Buffer): Promise<string> {
  const grenze = `beleg${Date.now()}`;
  const body = Buffer.concat([
    Buffer.from(`--${grenze}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parentId] })}\r\n`),
    Buffer.from(`--${grenze}\r\ncontent-type: ${mime}\r\n\r\n`),
    daten,
    Buffer.from(`\r\n--${grenze}--`),
  ]);
  const res = (await driveFetch(token, `${BASIS}/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id`, {
    method: "POST",
    headers: { "content-type": `multipart/related; boundary=${grenze}` },
    body,
  })) as { id: string };
  return res.id;
}

const sauber = (s: string) =>
  s
    .replace(/[\\/:*?"<>|\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function endung(filename: string, mime: string): string {
  const m = filename.match(/\.([A-Za-z0-9]{2,5})$/);
  if (m) return m[1].toLowerCase();
  return { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/heic": "heic", "image/webp": "webp" }[mime] ?? "bin";
}

export type AblageErgebnis = "abgelegt" | "schon_abgelegt" | "ohne_beleg" | "nicht_verbunden";

// Beleg einer Ausgabe ins Drive legen. Wirft bei Drive-Fehlern; die Ausgabe
// selbst bleibt davon unberührt.
export async function belegAblegen(expenseId: number): Promise<AblageErgebnis> {
  if (!(await setting(TOKEN_KEY))) return "nicht_verbunden";
  const db = getDb();
  const row = (
    await db
      .select({
        datum: expenses.datum,
        createdAt: expenses.createdAt,
        betragCents: expenses.betragCents,
        kategorie: expenses.kategorie,
        beschreibung: expenses.beschreibung,
        belegId: attachments.id,
        filename: attachments.filename,
        mime: attachments.mime,
        dataB64: attachments.dataB64,
        driveFileId: attachments.driveFileId,
        anlassName: anlaesse.name,
      })
      .from(expenses)
      .innerJoin(attachments, eq(attachments.id, expenses.belegId))
      .leftJoin(ressorts, eq(ressorts.id, expenses.ressortId))
      .leftJoin(anlaesse, eq(anlaesse.id, ressorts.anlassId))
      .where(eq(expenses.id, expenseId))
      .limit(1)
  )[0];
  if (!row) return "ohne_beleg";
  if (row.driveFileId) return "schon_abgelegt";

  const datum = row.datum ?? row.createdAt.toISOString().slice(0, 10);
  const betrag = (row.betragCents / 100).toFixed(2);
  const name = sauber(
    [datum, row.anlassName ?? "", row.kategorie, row.beschreibung.slice(0, 60), `CHF ${betrag}`].filter(Boolean).join(" "),
  );
  const token = await accessToken();
  const jahr = await ordner(token, finanzenOrdnerId(), datum.slice(0, 4));
  const id = await hochladen(token, jahr, `${name}.${endung(row.filename, row.mime)}`, row.mime, Buffer.from(row.dataB64, "base64"));
  await db.update(attachments).set({ driveFileId: id, driveAbgelegtAm: new Date() }).where(eq(attachments.id, row.belegId));
  return "abgelegt";
}

// Für after(): Fehler nur protokollieren, die Ausgabe ist ja gespeichert.
export async function belegAblegenStill(expenseId: number) {
  try {
    await belegAblegen(expenseId);
  } catch (e) {
    console.warn(`Beleg der Ausgabe ${expenseId} nicht im Drive abgelegt:`, e);
  }
}
