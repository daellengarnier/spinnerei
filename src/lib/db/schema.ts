// Drizzle-Schema für Spinnerei.
// Schema-Änderungen:
// 1. Hier definieren (drizzle-orm/pg-core Syntax)
// 2. `npm run db:generate` → erzeugt SQL-Migration in drizzle/
// 3. Committen + pushen → wird beim Deploy automatisch angewendet

import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Ein Anlass = ein Event in der Spinnerei (Hausfest, Konzert, Kinderdisco, …)
export const anlaesse = pgTable("anlaesse", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  datum: date("datum").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aufgaben = pgTable("aufgaben", {
  id: serial("id").primaryKey(),
  anlassId: integer("anlass_id")
    .notNull()
    .references(() => anlaesse.id, { onDelete: "cascade" }),
  titel: text("titel").notNull(),
  zustaendig: text("zustaendig"),
  erledigt: boolean("erledigt").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schichten = pgTable("schichten", {
  id: serial("id").primaryKey(),
  anlassId: integer("anlass_id")
    .notNull()
    .references(() => anlaesse.id, { onDelete: "cascade" }),
  bereich: text("bereich").notNull(), // z.B. Bar, Eingang, Küche
  zeitVon: text("zeit_von").notNull(), // z.B. "22:00"
  zeitBis: text("zeit_bis").notNull(), // z.B. "00:00"
  plaetze: integer("plaetze").default(2).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schichtHelfer = pgTable("schicht_helfer", {
  id: serial("id").primaryKey(),
  schichtId: integer("schicht_id")
    .notNull()
    .references(() => schichten.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const infos = pgTable("infos", {
  id: serial("id").primaryKey(),
  anlassId: integer("anlass_id")
    .notNull()
    .references(() => anlaesse.id, { onDelete: "cascade" }),
  titel: text("titel").notNull(),
  text: text("text").notNull(),
  autor: text("autor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
