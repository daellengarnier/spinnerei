<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Stack

- **Datenbank**: Postgres 16 im Docker-Container auf eigenem VPS
- **ORM**: **Drizzle** — Schema in `src/lib/db/schema.ts`
- **Auth**: bei Bedarf mit eigenen Sessions + bcrypt bauen (kein Supabase, kein NextAuth)
- **Deploy**: Push auf `main` → GitHub Actions baut Docker-Image → SSH-Deploy zum VPS
- **Live-URL**: https://spinnerei.al-daellen.ch

## Schema-Änderungen

1. Tabellen in `src/lib/db/schema.ts` definieren (drizzle-orm Syntax)
2. `npm run db:generate` → erzeugt SQL-Migration in `drizzle/`
3. In der App: `import { getDb } from "@/lib/db/client"` → Drizzle-Queries
4. Committen & pushen → Migration läuft beim Deploy automatisch
