# Veröffentlichung und Betrieb

Stand: 22. September 2026. Noch keine Freigabe. Der manuelle Workflow erstellt ein Artefakt; er veröffentlicht keine Website und signiert keine mobilen Apps.

## Angaben des Betreibers

Eine kontrollierte HTTPS-Domain, Support-Adresse und freigegebene öffentliche Seiten für Nutzungsbedingungen, Datenschutz, Impressum und Community-Richtlinien bereitstellen. `.env.example` benennt die Variablen. Die Prüfung kontrolliert deren Format, nicht Eigentum, Inhalt oder Erreichbarkeit. Keine erfundenen Kontaktdaten übernehmen.

Die öffentlichen Werte als GitHub-Variablen des Environments `production` eintragen. Dort niemals einen Supabase-Service-Key verwenden. KI und Zahlungen bleiben für diesen Release-Kandidaten ausgeschaltet.

## Release-Kandidat

1. Commit und zugehörigen grünen FNDRS-checks-Lauf auswählen. Arbeitsbaum und Abhängigkeiten prüfen.
2. `npm ci --ignore-scripts`, `npm run typecheck`, `npm run lint`, `npm test` und `npm run build:release` ausführen. Alternativ den Workflow `FNDRS release candidate` für den geprüften Branch starten. GitHub muss die Workflow-Datei auf dem Standardbranch kennen, bevor sie dort manuell gestartet werden kann.
3. Artefakt und Commit gemeinsam dokumentieren. Ein gewöhnliches CI-Artefakt ohne Produktionsvariablen ist kein veröffentlichungsfertiger Build.
4. Web-Artefakt bei dem vom Betreiber gewählten Host bereitstellen. Bei `web.output: single` müssen unbekannte App-Pfade auf `index.html` zurückfallen; vorhandene Assets unverändert ausliefern. HTTPS und die Routen `/auth-callback`, `/legal` und einen direkten Profil-/Startup-Link prüfen.
5. Supabase Site URL und exakt benötigte Redirect URLs auf die tatsächliche Domain ausrichten. Wildcards vermeiden. E-Mail-Bestätigung und Passwort-Reset mit dem tatsächlich verwendeten SMTP-Absender prüfen. Keine Token/Links in Protokolle kopieren.
6. Zunächst in Staging mit zwei kontrollierten Konten testen. Erst nach dokumentiertem Erfolg veröffentlichen. Signierte iOS-/Android-Binaries und Store-Einreichungen sind eigene Schritte mit den jeweiligen Entwicklerkonten.

## Noch auszuführende Integrationstests

| Ablauf | Erwartung |
| --- | --- |
| Registrierung / Bestätigung / Passwort-Reset | E-Mail erreicht Empfänger; Rückleitung führt nur zum vorgesehenen Ziel; ungültige Links zeigen einen Fehler |
| Zwei Konten / Match / Chat | Ein gegenseitiges Match; Nachrichten kommen in Echtzeit an; drittes Konto kann den Chat nicht lesen |
| Private Community / blockiertes Mitglied | Keine privaten Beiträge über Feed oder direkte Abrufe; Blockierung verhindert neue Kontaktaufnahme |
| Kontowechsel während Datenabruf | Keine vorherigen privaten Daten im neuen Konto; Einstellungen korrekt getrennt |
| Datenexport / Kontolöschung | Vollständiger eigener Export; Löschung eines ausdrücklich freigegebenen Testkontos einschließlich Storage; Wiederholung nach Fehler möglich |
| DE/EN / hell/dunkel / kleine Displays | Keine abgeschnittenen Aktionen, korrekte Fehlermeldungen und Bedienbarkeit |
| Optionen deaktiviert | Kein Checkout, keine fingierte KI-Antwort; Hinweise auf Nichtverfügbarkeit |

Der lokale SQL-Test ersetzt diese Abläufe nicht. Keine echte Kontolöschung ohne ausdrückliche Freigabe des betreffenden Testkontos.

## Betrieb und Wiederherstellung

- Vor Schemaänderungen Ziel-Projekt-ID und Migrations-Dry-Run prüfen. Bestehende angewendete Migrationen nicht nachträglich umschreiben. Reversible Erweiterungen bevorzugen.
- Vor Veröffentlichung den tatsächlich verfügbaren Supabase-Backup-Umfang und Aufbewahrung prüfen. Datenbank-Backups allein belegen keine Sicherung der Storage-Dateien. Separate Sicherung und Wiederherstellung von Avataren dokumentieren.
- Wiederherstellung zunächst in einem getrennten Projekt üben; danach Schema, RLS, Auth, Storage und die obigen Abläufe prüfen. Kein ungeprüftes Restore über das Produktivprojekt.
- Backend-Fehlerraten, Auth-/SMTP-Zustellung, Quoten und Edge-Function-Ausfälle überwachen. Keine Passwörter, Tokens, privaten Chat-Inhalte oder vollständigen KI-Eingaben protokollieren. Zuständigkeit und Alarmkanal durch den Betreiber festlegen.
- Für einen Frontend-Rollback das letzte geprüfte Artefakt mit seinen damaligen öffentlichen Variablen verwenden. Vorher Rückwärtskompatibilität mit dem aktuellen Schema prüfen. Datenbankänderungen durch eine neue korrigierende Migration beheben; keine Tabellen zur Fehlerbehebung löschen.
- Vorhandene moderate Abhängigkeitsmeldungen erneut prüfen und einzeln beheben. Ein erzwungenes Paket-Downgrade ist kein Sicherheitsnachweis.

## Aktuelle Grenzen

Push-Zustellung, Ereignis-Erinnerungen und Digest sind noch nicht implementiert. Native Käufe, optionale KI und Zahlungen sind nicht freigegeben. Weitere Fachbereiche und serverseitige Texte benötigen Übersetzungen. Monitoring, Backups, SMTP und vollständige Live-/Gerätetests sind noch nicht nachgewiesen. Diese Punkte verhindern weiterhin die Behauptung, der gesamte ursprüngliche Produktionsauftrag sei abgeschlossen.
