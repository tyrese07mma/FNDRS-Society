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
- Kontolöschung mit Passwortbestätigung, Stripe-Kundenlöschung, Storage-Bereinigung und abschließender Auth-Löschung implementiert. Wiederholungen nach Fehlern sind vorgesehen; siehe ACCOUNT_DELETION.md.
- Checkout und Löschung über serverseitige Konto-Sperre serialisiert; frühere offene Checkouts werden geschlossen.
- Match-Filter, Theme, Haptik und Benachrichtigungen werden kontobezogen gespeichert. Offline-Änderungen bleiben lokal erhalten und werden erneut synchronisiert. Eigener Query-Cache pro Anmeldung; Mutationen prüfen vor dem Start die Kontoidentität.
- DE/EN-Sprachwahl mit Gerätevorgabe und Kontosynchronisierung. Willkommen, Anmeldung, Passwortabläufe, Kontoeinstellungen und Tab-Navigation übersetzt; Matching, Discovery, Feed und Chat um Oberflächenübersetzungen ergänzt. Dynamische Namen und Inhalte bleiben unverändert. Datums-/Zahlformatierung berücksichtigt die Sprache. Weitere Fachbereiche und serverseitige Texte sind noch zu bearbeiten.
- 25 lokale Tests bestanden; zusätzlich Wörterbucheinträge und Interpolationsplatzhalter geprüft. Diese Tests belegen keine vollständige Übersetzung aller Screens und ersetzen keine visuelle Prüfung.
- GitHub Actions für den ersten Entwicklungsimport erfolgreich, einschließlich Expo-Export für Web, Android und iOS. Neue Änderungen benötigen jeweils einen eigenen CI-Lauf.

## Noch erforderlich

- DE/EN-Übersetzung der übrigen Fachbereiche, Server-Benachrichtigungen und Fehlertexte vervollständigen; Sprachwechsel und Textlängen visuell prüfen.
- Einstellungssynchronisierung mit echten Konten auf mehreren Geräten sowie alle Profilfelder im UI prüfen.
- Kontolöschung im Staging mit echten Diensten testen; Datenexport und vollständige Blockieren-Oberfläche.
- Push-Zustellung, Ereignis-Erinnerungen und Digest tatsächlich implementieren und testen; aktuelle Schalter allein belegen keine Zustellung.
- Gleichzeitige Checkout-Vorgänge zusätzlich gegen Stripe testen und weitere RPCs auf Datenschutz-/Parallelitätsfehler prüfen.
- Account-Wechsel bei laufenden mehrstufigen Mutationen im vollständigen Integrationstest prüfen.
- Native Käufe/App-Store-Anforderungen und Plattform-Icons abschließen.
- Vollständiger visueller Durchlauf aller Screens und Zustände, Web-/iOS-/Android-Integrationstests, finaler Build und Abhängigkeitsprüfung.
- Aktuelle Trending-Paginierung nach Zeit prüfen und gewünschte Rangfolge wiederherstellen.
- Anleitung für Betrieb, Monitoring, Backups, Wiederherstellung und verbindliche Datenschutz-/Anbieterdaten ergänzen.

## Externe Voraussetzungen

Ein vom Eigentümer zugeordnetes Supabase-Projekt mit sicher hinterlegten Secrets, Anthropic-Zugang, Stripe-Testprodukte und Webhook, Domain/SMTP sowie gegebenenfalls Apple-/Google-Entwicklerkonten. Es sind noch keine erfolgreichen Live-Tests gegen diese Dienste dokumentiert.
