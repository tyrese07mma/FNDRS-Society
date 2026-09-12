# Arbeitsstand – 12. September 2026

Kein Release-Nachweis. Diese Datei dokumentiert den Zwischenstand und muss bei weiteren Änderungen aktualisiert werden.

## Implementiert und lokal geprüft

- Demo-Backend, Demo-Zugänge und simulierte Copilot-Antworten entfernt.
- Session-Speicher, Auth-Rückleitung, Passwort-Reset, E-Mail-/Passwortänderung und Sperre bei fehlender Backend-Konfiguration.
- Versionierte Migrationen; private Community-Posts geschützt; verifizierte Investor-Rolle für private Beitritte erforderlich; blockierte Chat-Anfragen abgelehnt.
- Versteckter Standort in privater Tabelle; eigener Profilabruf erhält den Standort zur Bearbeitung.
- Serverquoten, RSVP-Kapazitätsprüfung, Match-Transaktionen, stabile Feed-/Chat-Paginierung.
- Optionale Benachrichtigungskategorien werden serverseitig berücksichtigt. Theme und Benachrichtigungseinstellungen werden synchronisiert.
- Copilot-SSE mit serverseitiger Authentifizierung, Einwilligung, Tageslimits und Verbrauchsprotokollierung.
- Stripe-Checkout, Kundenportal und signierter Webhook mit Preiszuordnung, Ereignis-Deduplizierung und zeitlich begrenzten Berechtigungen.
- 18 lokale Tests bestanden; Geschäftsregeln, Auth-URL-/SSE-Parser und Migrationen mit PostgreSQL-RLS. Deno-Typprüfung der fünf Edge Functions bestanden.

## Noch erforderlich

- Vollständiger DE/EN-Textbestand, Datums-/Zahlenformatierung und Sprachwahl.
- Match-Filter dauerhaft mit dem Konto synchronisieren; alle Einstellungen und Profilfelder im UI prüfen.
- Kontolöschung mit Stripe-/Storage-Bereinigung statt direkter SQL-Löschung; Datenexport und vollständige Blockieren-Oberfläche.
- Push-Zustellung, Ereignis-Erinnerungen und Digest tatsächlich implementieren und testen; aktuelle Schalter allein belegen keine Zustellung.
- Gleichzeitige Checkout-Vorgänge und weitere RPCs auf Datenschutz-/Parallelitätsfehler prüfen.
- Account-Wechsel bei laufenden Mutationen und Einstellungen weiter absichern.
- Native Käufe/App-Store-Anforderungen und Plattform-Icons abschließen.
- Vollständiger visueller Durchlauf aller Screens und Zustände, Web-/iOS-/Android-Integrationstests, finaler Build und Abhängigkeitsprüfung.
- Aktuelle Trending-Paginierung nach Zeit prüfen und gewünschte Rangfolge wiederherstellen.
- Anleitung für Betrieb, Monitoring, Backups, Wiederherstellung und verbindliche Datenschutz-/Anbieterdaten ergänzen.

## Externe Voraussetzungen

Ein vom Eigentümer zugeordnetes Supabase-Projekt mit sicher hinterlegten Secrets, Anthropic-Zugang, Stripe-Testprodukte und Webhook, Domain/SMTP sowie gegebenenfalls Apple-/Google-Entwicklerkonten. Es sind noch keine erfolgreichen Live-Tests gegen diese Dienste dokumentiert.
