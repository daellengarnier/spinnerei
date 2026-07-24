"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import {
  aufgaben,
  infos,
  schichten,
  schichtHelfer,
} from "@/lib/db/schema";

function str(formData: FormData, key: string) {
  const wert = formData.get(key);
  return typeof wert === "string" ? wert.trim() : "";
}

function num(formData: FormData, key: string) {
  const wert = Number(str(formData, key));
  return Number.isInteger(wert) ? wert : NaN;
}

// --- Aufgaben ---

export async function aufgabeErstellen(formData: FormData) {
  const anlassId = num(formData, "anlassId");
  const titel = str(formData, "titel");
  const zustaendig = str(formData, "zustaendig");
  if (!anlassId || !titel) return;
  await getDb().insert(aufgaben).values({
    anlassId,
    titel,
    zustaendig: zustaendig || null,
  });
  revalidatePath(`/anlass/${str(formData, "slug")}/aufgaben`);
}

export async function aufgabeUmschalten(formData: FormData) {
  const id = num(formData, "id");
  if (!id) return;
  const db = getDb();
  const [aufgabe] = await db.select().from(aufgaben).where(eq(aufgaben.id, id));
  if (!aufgabe) return;
  await db
    .update(aufgaben)
    .set({ erledigt: !aufgabe.erledigt })
    .where(eq(aufgaben.id, id));
  revalidatePath(`/anlass/${str(formData, "slug")}/aufgaben`);
}

export async function aufgabeLoeschen(formData: FormData) {
  const id = num(formData, "id");
  if (!id) return;
  await getDb().delete(aufgaben).where(eq(aufgaben.id, id));
  revalidatePath(`/anlass/${str(formData, "slug")}/aufgaben`);
}

// --- Schichten ---

export async function schichtErstellen(formData: FormData) {
  const anlassId = num(formData, "anlassId");
  const bereich = str(formData, "bereich");
  const zeitVon = str(formData, "zeitVon");
  const zeitBis = str(formData, "zeitBis");
  const plaetze = num(formData, "plaetze");
  if (!anlassId || !bereich || !zeitVon || !zeitBis || !plaetze || plaetze < 1)
    return;
  await getDb()
    .insert(schichten)
    .values({ anlassId, bereich, zeitVon, zeitBis, plaetze });
  revalidatePath(`/anlass/${str(formData, "slug")}/schichten`);
}

export async function schichtLoeschen(formData: FormData) {
  const id = num(formData, "id");
  if (!id) return;
  await getDb().delete(schichten).where(eq(schichten.id, id));
  revalidatePath(`/anlass/${str(formData, "slug")}/schichten`);
}

export async function helferEintragen(formData: FormData) {
  const schichtId = num(formData, "schichtId");
  const name = str(formData, "name");
  if (!schichtId || !name) return;
  const db = getDb();
  const [schicht] = await db
    .select()
    .from(schichten)
    .where(eq(schichten.id, schichtId));
  if (!schicht) return;
  const helfer = await db
    .select()
    .from(schichtHelfer)
    .where(eq(schichtHelfer.schichtId, schichtId));
  if (helfer.length >= schicht.plaetze) return;
  await db.insert(schichtHelfer).values({ schichtId, name });
  revalidatePath(`/anlass/${str(formData, "slug")}/schichten`);
}

export async function helferAustragen(formData: FormData) {
  const id = num(formData, "id");
  if (!id) return;
  await getDb().delete(schichtHelfer).where(eq(schichtHelfer.id, id));
  revalidatePath(`/anlass/${str(formData, "slug")}/schichten`);
}

// --- Infos ---

export async function infoErstellen(formData: FormData) {
  const anlassId = num(formData, "anlassId");
  const titel = str(formData, "titel");
  const text = str(formData, "text");
  const autor = str(formData, "autor");
  if (!anlassId || !titel || !text) return;
  await getDb()
    .insert(infos)
    .values({ anlassId, titel, text, autor: autor || null });
  revalidatePath(`/anlass/${str(formData, "slug")}/infos`);
}

export async function infoLoeschen(formData: FormData) {
  const id = num(formData, "id");
  if (!id) return;
  await getDb().delete(infos).where(eq(infos.id, id));
  revalidatePath(`/anlass/${str(formData, "slug")}/infos`);
}
