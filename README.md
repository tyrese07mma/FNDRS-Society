# FNDRS Society

Plattform für Founder, Mitgründer und Unternehmer. Diese Entwicklungsversion basiert auf dem gelieferten V2-Design (Expo SDK 57, React Native, TypeScript) und verwendet Supabase für echte Nutzerdaten. Es gibt keinen Demo-Login und keine simulierten Antworten.

**Status: in Entwicklung, noch nicht zur Veröffentlichung freigegeben.** Externe Dienstintegrationen, vollständige DE/EN-Übersetzung, native Kaufabwicklung und der vollständige Funktionstest sind offen. Siehe [Arbeitsstand](docs/IMPLEMENTATION_STATUS.md).

## Lokal starten

Node.js 24 oder neuer installieren. Im Projektordner `npm ci --ignore-scripts` ausführen und `.env.example` als `.env.local` kopieren. Dort die öffentliche Supabase-Projekt-URL und den öffentlichen Anon-Key des eigenen Projekts eintragen. Ohne Konfiguration zeigt die App einen Konfigurationshinweis; es werden keine Ersatzdaten erzeugt. Danach `npm start` oder `npm run web` starten.

Server-Secrets wie `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` und `STRIPE_SECRET_KEY` gehören ausschließlich in Supabase Edge Function Secrets, niemals in Expo-Umgebungsvariablen oder Git. Die öffentliche Projektkonfiguration ersetzt keine Row Level Security.

## Backend

Die Dateien unter `supabase/migrations/` bilden gemeinsam das Datenbankschema. Sie sind der einzige Schema-Einstiegspunkt; die alte doppelte `schema.sql` und das Demo-Seed wurden entfernt. Ein neues Supabase-Projekt verknüpfen und Migrationen in ihrer Reihenfolge mit der Supabase CLI anwenden (`supabase link`, anschließend `supabase db push`). Diese Befehle verändern das verknüpfte Projekt: die Ziel-ID vorher prüfen.

Edge Functions liegen unter `supabase/functions/`. Stripe-Webhook und Browser-Rückleitung prüfen kein Supabase-JWT; der Webhook prüft stattdessen die Stripe-Signatur. Die anderen Funktionen authentifizieren den Nutzer. Für Auth müssen die tatsächlich verwendeten Web-URLs und `fndrs://auth-callback` als Rückleitungen konfiguriert sein. SMTP, E-Mail-Bestätigung und Passwortwiederherstellung müssen am echten Projekt getestet werden.

KI benötigt zusätzlich `ANTHROPIC_API_KEY` und `AI_MODEL` als Supabase-Secrets. Die Modell-ID muss für das verwendete Anthropic-Konto verfügbar sein; ohne explizite Modellkonfiguration bleibt Copilot nicht verfügbar. Stripe benötigt `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL` und die in `.env.example` genannten Price-IDs. Test- und Live-Schlüssel dürfen nicht vermischt werden. Keine dieser externen Konfigurationen wurde durch das lokale Testsystem nachgewiesen.

## Prüfungen

```sh
npm run lint
npm run typecheck
npm test
npm run build
deno check --config supabase/functions/deno.json supabase/functions/*/index.ts
```

Die Datenbanktests verwenden PostgreSQL über PGlite und prüfen Migrationen, RLS und Geschäftsregeln. Supabase Auth, Storage, Realtime sowie Stripe und Anthropic laufen dabei nicht als echte Dienste. Ein Expo-Export ersetzt keinen signierten iOS-/Android-Build und keine Store-Prüfung.

GitHub Actions führt statische Prüfungen, Tests, Expo-Export und Deno-Prüfung aus. Änderungen werden auf `production-ready-v3` vorbereitet.
