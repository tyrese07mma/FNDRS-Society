# Arbeitsstand – 21. September 2026

Kein Release-Nachweis. Diese Datei dokumentiert den Zwischenstand und muss bei weiteren Änderungen aktualisiert werden.

## Fortschritt am 21. September

- Wissensbereich, Artikelansicht und Merkliste um DE/EN-Oberflächentexte ergänzt; redaktionelle Inhalte bleiben in ihrer Originalsprache.
- Fehlgeschlagene Erstabrufe zeigen einen Fehler mit Wiederholungsmöglichkeit statt einer irreführenden leeren Liste.
- Unbelegtes Copilot-Verfügbarkeitsversprechen im Artikel durch einen Hinweis zur Merkliste ersetzt.
- Supabase: zehn Migrationen sowie delete-account und copilot bereitgestellt; siehe DEPLOYMENT_STATUS.md. Kostenpflichtige KI bleibt auf Wunsch des Eigentümers zurückgestellt.
- Auth-Rückleitungen, SMTP und vollständige Tests mit echten Konten bleiben offen.

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
- Blockieren und Entblockieren in Profilen, Chats und Einstellungen; serverseitige Sperren für Folgen, Matching und Nachrichten in vorhandenen Chats. Bestehende Nachrichten bleiben erhalten.
- Kontobezogener JSON-Datenexport mit paginierten, authentifizierten Abrufen und Datei-Ausgabe für Web/iOS/Android. Umfang und Grenzen in PRIVACY_CONTROLS.md; native Ausgabe noch nicht auf Geräten geprüft.
- Zentrale Fehleranzeige mit freigegebenen DE/EN-Texten statt ungefilterter Provider-Meldungen.
- Onboarding, Profilansicht und Profilbearbeitung um DE/EN-Texte ergänzt. Unbelegte Demo-Versprechen zu garantierten Matches, Antwortquoten und Investor-Verteilung entfernt.
- Vorschau lokal gestartet und Startzustand im Browser visuell geprüft: ohne Supabase-Konfiguration erscheint der vorgesehene deutsche Verfügbarkeitshinweis. Authentifizierte Abläufe konnten damit noch nicht durchgeklickt werden.
- 32 lokale Tests bestanden; zusätzlich Export, Blockierungen, Fehlertexte, Wörterbucheinträge und Interpolationsplatzhalter geprüft. Diese Tests belegen keine vollständige Übersetzung aller Screens und ersetzen keine visuelle Prüfung.
- GitHub Actions für den ersten Entwicklungsimport erfolgreich, einschließlich Expo-Export für Web, Android und iOS. Neue Änderungen benötigen jeweils einen eigenen CI-Lauf.

## Noch erforderlich

- DE/EN-Übersetzung der übrigen Fachbereiche, Server-Benachrichtigungen und Fehlertexte vervollständigen; Sprachwechsel und Textlängen visuell prüfen.
- Einstellungssynchronisierung mit echten Konten auf mehreren Geräten sowie alle Profilfelder im UI prüfen.
- Kontolöschung, Blockierungen und Datenexport im Staging mit echten Diensten und Geräten prüfen.
- Push-Zustellung, Ereignis-Erinnerungen und Digest tatsächlich implementieren und testen; aktuelle Schalter allein belegen keine Zustellung.
- Gleichzeitige Checkout-Vorgänge zusätzlich gegen Stripe testen und weitere RPCs auf Datenschutz-/Parallelitätsfehler prüfen.
- Account-Wechsel bei laufenden mehrstufigen Mutationen im vollständigen Integrationstest prüfen.
- Native Käufe/App-Store-Anforderungen und Plattform-Icons abschließen.
- Vollständiger visueller Durchlauf aller Screens und Zustände, Web-/iOS-/Android-Integrationstests, finaler Build und Abhängigkeitsprüfung.
- Aktuelle Trending-Paginierung nach Zeit prüfen und gewünschte Rangfolge wiederherstellen.
- Anleitung für Betrieb, Monitoring, Backups, Wiederherstellung und verbindliche Datenschutz-/Anbieterdaten ergänzen.

## Externe Voraussetzungen

Supabase ist zugeordnet und das Datenbankschema bereitgestellt. Offen sind Domain/SMTP sowie gegebenenfalls Apple-/Google-Entwicklerkonten. Anthropic und Stripe bleiben zurückgestellt. Erfolgreiche vollständige Abläufe mit echten Konten sind noch nicht nachgewiesen.


Prüfung am 21. September: TypeScript, ESLint und alle 32 lokalen Tests bestanden. Die drei geänderten Ansichten wurden in diesem Durchlauf nicht visuell mit einem angemeldeten Konto geprüft.
