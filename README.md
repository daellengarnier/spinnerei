# Spinnerei

Organisations-App der Spinnerei. Läuft auf https://spinnerei.al-daellen.ch.

## Stack

- **Next.js 16** (App Router, Standalone Output) + **React 19**
- **Tailwind CSS v4**
- **Postgres 16** + **Drizzle ORM**
- **Docker** + **GitHub Actions** für Auto-Deploy
- Reverse-Proxy: **Caddy** (zentral im `ambardaellen-app`-Stack auf demselben VPS)

## So arbeitest du dran (ohne Terminal)

1. Repo auf github.com öffnen, Punkttaste `.` drücken → VS Code im Browser (github.dev)
2. Änderungen mit Codex/ChatGPT machen, einfügen
3. Source-Control → Commit-Message → Sync-Button
4. ~2 Min später live auf https://spinnerei.al-daellen.ch

## Schema-Änderungen

1. `src/lib/db/schema.ts` editieren
2. `npm run db:generate` → erzeugt Migration in `drizzle/`
3. Committen + pushen → wird beim Deploy automatisch migriert
