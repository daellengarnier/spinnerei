// Google-Drive-Lookup (nur lesend, per API-Key) für die öffentliche Share-Seite:
// findet im Drive-Ordner eines Anlasses bzw. Acts den „Riders“-Unterordner,
// damit externe Ton-/Technik-Leute direkt dort landen.
//
// Struktur im Drive: Anlass-Ordner → Act-Ordner (Name ≈ Act-Name) → „Riders“.
// Funktioniert nur für Ordner, die per Link lesbar sind („Jeder mit dem Link“).
// Ohne GOOGLE_API_KEY oder bei Fehlern wird einfach nichts gefunden — die
// Seite fällt dann auf den bisherigen Drive-Link zurück.

type DriveFolder = { id: string; name: string };

const FOLDER_MIME = "application/vnd.google-apps.folder";
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; folders: DriveFolder[] }>();

export function folderIdFromUrl(url: string): string | null {
  const m = url.match(/\/folders\/([\w-]{10,})/) ?? url.match(/[?&]id=([\w-]{10,})/);
  return m ? m[1] : null;
}

export function folderUrl(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}

async function listSubfolders(parentId: string): Promise<DriveFolder[]> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return [];
  const hit = cache.get(parentId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.folders;

  const params = new URLSearchParams({
    q: `'${parentId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id,name)",
    pageSize: "100",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    key,
  });
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      console.warn(`Drive-Lookup ${parentId}: HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as { files?: DriveFolder[] };
    const folders = data.files ?? [];
    cache.set(parentId, { at: Date.now(), folders });
    return folders;
  } catch (e) {
    console.warn(`Drive-Lookup ${parentId} fehlgeschlagen:`, e);
    return [];
  }
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isRiderFolder = (f: DriveFolder) => /rider/i.test(f.name);

function matchesAct(folderName: string, actName: string): boolean {
  const a = norm(folderName);
  const b = norm(actName);
  if (a.length < 3 || b.length < 3) return false;
  return a === b || a.includes(b) || b.includes(a);
}

async function riderIn(folderId: string): Promise<string | null> {
  const rider = (await listSubfolders(folderId)).find(isRiderFolder);
  return rider ? folderUrl(rider.id) : null;
}

/**
 * Link zum Rider-Ordner eines Acts. Sucht zuerst im eigenen Act-Ordner
 * (falls verlinkt), sonst im Anlass-Ordner nach dem Unterordner des Acts und
 * darin nach „Riders“; zuletzt nach einem „Riders“-Ordner direkt im Anlass.
 */
export async function findRiderFolder(opts: {
  actName: string;
  actDrivelink: string;
  anlassDrivelink: string;
}): Promise<string | null> {
  const actFolderId = folderIdFromUrl(opts.actDrivelink);
  if (actFolderId) {
    const found = await riderIn(actFolderId);
    if (found) return found;
  }

  const anlassFolderId = folderIdFromUrl(opts.anlassDrivelink);
  if (!anlassFolderId) return null;
  const children = await listSubfolders(anlassFolderId);
  const actFolder = children.find((f) => !isRiderFolder(f) && matchesAct(f.name, opts.actName));
  if (actFolder) {
    const found = await riderIn(actFolder.id);
    if (found) return found;
  }
  const direct = children.find(isRiderFolder);
  return direct ? folderUrl(direct.id) : null;
}
