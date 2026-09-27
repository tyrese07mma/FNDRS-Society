# Release-Aufgaben – verbindliche Arbeitsliste

Stand 27.09.2026. Ergänzter technischer Auditauftrag: siehe CLOSED_BETA_AUDIT.md. Reihenfolge entspricht dem Audit. „Vorbereitet“ ist ausdrücklich kein abgeschlossener Live-Nachweis. Frühere Prozentschätzungen werden nicht durch bloß angelegte Dateien erhöht.

| Nr. | Aufgabe | Stand | Nächster konkreter Schritt / Blocker |
| --- | --- | --- | --- |
| 1 | Domain und Hosting | Web-Paket vorbereitet | `build:release` erstellt Kontolöschungsseite und Regeln für kompatible Hosts. `hosting:verify` prüft HTTPS-Routen, Bundle und Header. Finale Domain/Hosting-Zuordnung weiterhin ungeklärt. Sichtbare ältere FNDRS-Netlify-Seite wird nicht ohne Prüfung überschrieben. |
| 2 | Auth-Rückleitungen und SMTP | Plan-Generator und Tests fertig | `auth:plan` erzeugt exakte Web-/Native-Ziele aus der finalen Domain. Produktionsdomain, SMTP-Absender und Live-E-Mail-Test fehlen. Bestehende Anmeldung funktioniert lokal gegen Supabase. |
| 3 | Betreiber-/Rechtstexte | Veröffentlichung technisch gesperrt | Sechs Pflichtwerte fehlen. Öffentliche Löschanfrageseite wird nur mit konfiguriertem Support und Datenschutz erzeugt. Betreiber muss Texte/Kontakte bereitstellen und Mailbox betreiben. |
| 4 | Mehrkonten-/Datenschutztests | Lokale SQL-Tests grün, Browserprüfung fortgesetzt | Separate kontrollierte Testkonten/Staging für Schreiben, Echtzeit und Löschung fehlen. Kein bestehendes Nutzerkonto wird für destruktive Tests verwendet. |
| 5 | Moderation | Private Prüfwarteschlange implementiert und bereitgestellt | `review_report` und `moderation_queue` nur für Serverzugriff; Statusverlauf vorhanden. Verantwortliche, tatsächliche Inhaltsmaßnahmen und Bearbeitungsdurchlauf noch offen. Siehe MODERATION.md. |
| 6 | Monitoring / Backups / Restore | Runbook vorhanden | pg_dump/Docker hier nicht gefunden. Backup-Umfang im Projekt prüfen, getrenntes Restore-Ziel und Alarmempfänger festlegen; Restore noch nicht durchgeführt. |
| 7 | Sicherheitsprüfung | RLS-Tests erweitert; Paket-Audit ohne bekannte Meldungen | Saubere Neuinstallation und Kompatibilität geprüft; Live-Isolation weiterhin offen. Siehe DEPENDENCIES.md. |
| 8 | Übersetzung | Analytics, Challenges, Mentoren und Investoren ergänzt | Weitere Fachbereiche, Servertexte und vollständige DE/EN-Abnahme offen. |
| 9 | Geräteprüfungen | Web-Durchlauf teilweise | Reale iOS-/Android-Geräte und signierte Test-Builds fehlen. |
| 10 | Bedienbarkeit / Performance | Sichtbarer Tastaturfokus ergänzt | Screenreader, kleine Displays, Netzabbrüche und Lasttest noch nicht vollständig geprüft. |
| 11 | Beta-Abnahme | Offen | Erst nach 1–10 mit benannten Testnutzern, Fehlerliste und Freigabe durchführen. |
| 12 | Store-Veröffentlichung | Expo-Exports vorhanden | Entwicklerkonten, Signierung, Store-Datenschutzangaben, Screenshots und Review-Zugang fehlen. Keine Store-Einreichung erfolgt. |
| 13 | Externe Kontolöschungsanfrage | Generierung und Tests vorhanden | Öffentliche Seite unter `/account-deletion/` bereitstellen, Mailbox-Zustellung und sichere Identitätsprüfung testen. |
| 14 | KI | Auf Nutzerwunsch deaktiviert | Implementierter Serverpfad benötigt Anbieterzugang/Budget und Integrationstests vor Aktivierung. |
| 15 | Zahlungen | Auf Nutzerwunsch deaktiviert | Stripe-Konfiguration und gegebenenfalls Store-Kaufabwicklung plus Integrationstests vor Aktivierung. |
| 16 | Push / Erinnerungen / Digest | Nicht implementiert; UI kennzeichnet Nichtverfügbarkeit | Zustellbackend, Geräte-Token, Credentials, Einwilligungen, Wiederholungen und reale Zustellung testen; nicht als fertig bewerten. |

## Neue Werkzeuge

- `npm run auth:plan`: nur Konfigurationsplan, verändert Supabase nicht.
- `npm run hosting:verify`: nur lesende HTTP-Prüfung der konfigurierten Produktionsdomain; ersetzt keinen UI-/Login-Test.
- `npm run build:release`: verlangt vollständige Konfiguration und erzeugt zusätzlich die öffentliche Kontolöschungsseite sowie `_headers`/`_redirects`. Hosts ohne Unterstützung dieser Dateien benötigen gleichwertige Serverkonfiguration.

## Verifizierungsgrenzen

Ein funktionierender bestehender Login belegt keine erfolgreiche Neuregistrierung oder Passwort-E-Mail. Lokale PostgreSQL-Tests belegen keine gehostete Realtime-/Storage-Zustellung. Eine Moderationsentscheidung im Verlauf entfernt keinen Inhalt automatisch. Eine erzeugte Löschanfrageseite belegt keine Bearbeitung durch den Support. Exportdateien sind keine signierten Store-Binaries.
