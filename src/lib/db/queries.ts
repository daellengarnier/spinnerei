import { asc, eq } from "drizzle-orm";
import { getDb } from "./client";
import { anlaesse } from "./schema";

export async function alleAnlaesse() {
  return getDb().select().from(anlaesse).orderBy(asc(anlaesse.datum));
}

export async function anlassBySlug(slug: string) {
  const [anlass] = await getDb()
    .select()
    .from(anlaesse)
    .where(eq(anlaesse.slug, slug));
  return anlass ?? null;
}
