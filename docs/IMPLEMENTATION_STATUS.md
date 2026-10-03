# Arbeitsstand – 22. September 2026

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
- Trending-Rangfolge mit gleichzeitig eintreffenden Likes im gehosteten Mehrkonten-Test prüfen.
- Anleitung für Betrieb, Monitoring, Backups, Wiederherstellung und verbindliche Datenschutz-/Anbieterdaten ergänzen.

## Externe Voraussetzungen

Supabase ist zugeordnet und das Datenbankschema bereitgestellt. Offen sind Domain/SMTP sowie gegebenenfalls Apple-/Google-Entwicklerkonten. Anthropic und Stripe bleiben zurückgestellt. Erfolgreiche vollständige Abläufe mit echten Konten sind noch nicht nachgewiesen.


Prüfung am 21. September: TypeScript, ESLint und alle 32 lokalen Tests bestanden. Die drei geänderten Ansichten wurden in diesem Durchlauf nicht visuell mit einem angemeldeten Konto geprüft.

## Fortschritt am 22. September 2026

- Trending-Feed mit Like-Rangfolge und zusammengesetztem Cursor implementiert und gegen private Beiträge sowie Gleichstände getestet. Migration 202609210001_ranked_feed.sql am 21. September bereitgestellt (insgesamt elf Migrationen). Sich während des Blätterns ändernde Like-Zahlen können die Live-Rangfolge verändern.
- KI und kostenpflichtige Pläne standardmäßig deaktiviert. Die Oberfläche erklärt ihre Nichtverfügbarkeit. Zahlungs-Rückleitungen behaupten keine Freischaltung, bevor der Backend-Status sie bestätigt. Native Zahlungsangebote bleiben deaktiviert.
- Startup-, Angebots- und Community-Oberflächen sowie Benachrichtigungsnavigation um DE/EN-Texte ergänzt. Nutzerinhalte und serverseitige Benachrichtigungstexte sind nicht automatisch übersetzt.
- Ladefehler der Listen und Community-Beiträge mit Wiederholungsmöglichkeit ergänzt; Beitrittsschaltflächen zeigen laufende Vorgänge an.
- Fehlgeschlagene Auth-Rückleitung führt angemeldete Personen zurück zur App.
- release:check / build:release verhindern Freigabe mit fehlenden öffentlichen Pflichtangaben, Vorschau-Konfiguration oder öffentlich benannten Server-Secrets. Dies prüft Konfiguration, keine rechtliche Freigabe oder Erreichbarkeit der Seiten.
- TypeScript, ESLint und 34 lokale Tests bestanden. Export für Web/Android/iOS einschließlich der Community-Änderungen am 22. September erfolgreich. Keine signierten Store-Builds.
- npm audit vom 21. September: 15 moderate Meldungen, keine hohen/kritischen. Verbleibende transitive decode-uri-component-/uuid-Meldungen nicht durch riskante Paket-Downgrades kaschiert.
- Release weiterhin gesperrt: produktive Domain, Support-Adresse und veröffentlichte Nutzungsbedingungen/Datenschutz/Impressum fehlen. Community-Richtlinien sind ebenfalls noch ein Entwurf. Auth-Redirect-Freigabe, SMTP, Zwei-Konten-/Gerätetests, Push und Store-Vorbereitung bleiben offen.

Die älteren Prüfangaben oben sind historische Zwischenstände. Dieser Abschnitt ersetzt deren Test- und Migrationszahlen; die übrigen offenen Aufgaben bleiben bestehen.

## Weitere Release-Arbeiten am 22. September

- Hilfe auf DE/EN umgestellt und auf die tatsächlich verfügbaren Funktionen beschränkt. Unbelegte Pro-Vorteile, XP-Sichtbarkeitsversprechen und garantierte Support-Antwortzeiten entfernt.
- Support-Adresse wird nur aus der Konfiguration übernommen; ohne bestätigten Kontakt gibt es keinen Link an einen erfundenen Empfänger. Fehler beim Öffnen des E-Mail-Programms werden angezeigt.
- Ereignis-Erinnerungen und Digest erscheinen ausdrücklich als noch nicht verfügbar. Ihre funktionslosen Schalter wurden entfernt; dies implementiert noch keine Zustellung. Aktive In-App-Kategorien bleiben einstellbar.
- Rechtstext-Konfiguration um Community-Richtlinien ergänzt; auch diese benötigen vor einem Release eine veröffentlichte Seite.
- Manueller Workflow `release-candidate.yml` prüft Produktionsvariablen, statische Prüfungen, Tests, Edge Functions und Expo-Export vor dem Artefakt-Upload. Kein automatisches Deployment. YAML lokal geparst; der neue Workflow wurde noch nicht auf GitHub ausgeführt.
- RELEASE_RUNBOOK.md beschreibt Release, Zwei-Konten-Prüfungen, Betrieb und Wiederherstellung. Die dort aufgeführten externen Tests und Betriebsnachweise sind noch auszuführen.
- TypeScript, ESLint und alle 34 lokalen Tests erneut bestanden. Release-Konfigurationsprüfung scheitert erwartungsgemäß an sechs noch fehlenden Betreiberangaben.
- Auch der erneute Expo-Export für Web, Android und iOS war erfolgreich; keine signierten Store-Binaries und kein gehosteter End-to-End-Nachweis.

## Fortschritt am 26./27. September 2026

- Ergänzter Closed-Beta-Auftrag erfasst: CLOSED_BETA_AUDIT.md enthält Befunde, Priorität und noch fehlende Nachweise. Vorhandenes Design bleibt erhalten.
- Zwölfte Migration für private Moderationswarteschlange mit Statusverlauf bereitgestellt; Berechtigungen lokal geprüft.
- Release-Web-Paket mit Kontolöschungsseite, Hosting-Prüfung und Auth-Konfigurationsplan vorbereitet; noch nicht öffentlich bereitgestellt.
- Decoder-/UUID-Abhängigkeiten kompatibel aktualisiert: frische Installation und Kompatibilitätstests bestanden, npm meldete null bekannte Sicherheitslücken.
- Analytics, Challenges, Mentoren und Investoren um Übersetzungen/Fehlerzustände ergänzt; erfundene Analytics-Aktivität und unbelegte Inhaltsversprechen entfernt.
- Profil-/Startup-/Kalenderlinks zentral validiert und Öffnungsfehler abgefangen. Chat-Doppeltippen gesperrt, fehlgeschlagene Entwürfe bleiben erhalten. Serverseitige Versand-Idempotenz weiterhin offen.
- TypeScript, ESLint und 43 lokale Tests am 27. September bestanden. Erneuter Export des aktuellen Standes für Web, Android und iOS ebenfalls bestanden.
- Konstruktorfehler und gemeldetes blaues Zahnrad noch nicht eindeutig reproduziert; keine Behauptung einer Behebung.

## Nachrichtenabsicherung – 27. September

- Dreizehnte Migration `202609270001_idempotent_messages.sql` nach Dry-Run bereitgestellt. Serverseitige Wiederholungen derselben Sendekennung liefern dieselbe Nachricht; gefälschte Zeitstempel sind gesperrt.
- Chat gleicht HTTP und Realtime nach Kennung ab und sortiert chronologisch. Fehlgeschlagene Versuche behalten ihre Kennung innerhalb des geöffneten Chats. Kein persistenter Offline-Ausgangskorb; siehe MESSAGING_VERIFICATION.md.
- Zusätzliche Matching-/XP-Tests prüfen doppelte Matches, Belohnungen durch Beitritt/Austritt und direkte Score-Manipulation. TypeScript, ESLint und alle 47 lokalen Tests bestanden.
- GitHub-Prüflauf für den vorigen Stand a433858 war erfolgreich; die aktuellen Änderungen benötigen einen eigenen Lauf.
- Auch der aktuelle Expo-Export für Web, Android und iOS ist erfolgreich; kein signierter Store-Build.

## Persistenter Sendeversuch – 2. Oktober 2026

- Der letzte Sendeversuch je Konto und Chat wird vor der Übertragung gespeichert und nach erneutem Öffnen wiederhergestellt. Gleicher Text verwendet dieselbe Sendekennung. Gesendete Inhalte werden lokal durch einen Bestätigungsstatus ohne Nachrichtentext ersetzt.
- Native Speicherung nutzt SecureStore, Web den vorhandenen lokalen Browserspeicher. Kein automatisches Senden und keine Warteschlange mehrerer Nachrichten. Unversendete Tastatureingaben werden nicht gesichert.
- Speicherfehler verhindern den Versand ohne gesicherte Kennung. Verspätete Bestätigungen dürfen einen neueren Entwurf nicht löschen. Konten sind getrennt.
- TypeScript, ESLint und alle 49 lokalen Tests bestanden. Reale Geräte-/Mehrkontenprüfung bleibt offen; siehe MESSAGING_VERIFICATION.md.
- Expo-Export des korrigierten Standes für Web, Android und iOS ebenfalls bestanden.

## Wiederverbindung – 2. Oktober 2026

- Chat, Postfach und Benachrichtigungen laden nach erfolgreicher Echtzeit-Wiederverbindung erneut. Der Chat verwirft den veralteten lokalen Lesestatus zugunsten eines frischen Gesprächsabrufs.
- Verbindungsunterbrechung wird angezeigt; Nachrichtenhistorie kann nach Ladefehler manuell wiederholt werden. Zwei verbliebene englische Chat-Leerzustände übersetzt.
- TypeScript, ESLint und alle 50 lokalen Tests bestanden. Physische Netzabbruch-/Mehrkonten-Tests bleiben offen.
- Auch der aktuelle Web-/Android-/iOS-Export war erfolgreich.

## Update — 3 October 2026

The hosted two-account check on 2 October passed 11 checks and deployed migration `202610020001_post_returning_visibility.sql` (14 total). It fixes authenticated post INSERT RETURNING while preserving private-community and block policies. See LIVE_VERIFICATION_2026-10-02.md.

The extended 3 October run verified the exact inbox RPC and notification query with actor joins, plus marking notifications read. First run hit a Realtime delivery timeout before those assertions; all fixtures were deleted. The second run passed all 13 checks with cleanup complete. This intermittent timeout is not considered resolved.

For the reported notification/inbox screen error, relative timestamp formatting now supports runtimes without Intl.RelativeTimeFormat; invalid dates are guarded. Inbox query failures now show a translated retry state instead of an empty list. Typecheck, lint and all 53 local tests pass. The user's specific UI error/platform has not yet been confirmed, so this is not a verified resolution of their report. Device/UI confirmation remains required.

## 3 October — confirmed device fix and subscription readiness

Owner confirmed the notification/inbox error is gone on their phone in Expo Go. This closes that specific reported error, not the full iOS/Android acceptance criterion.

Further live testing reproduced the initial Realtime delivery timeout. Installed realtime-js documents that default SUBSCRIBED can precede the database change subscription. Chat, inbox and notifications now request postgres_changes_options.wait=true, so lifecycle resync follows database readiness. No access policies or message content were changed.

The expanded test deliberately removes a subscription, sends a message during the gap, subscribes again, checks persisted history and receives a subsequent live message. An intermediate assertion incorrectly treated a buffered older event as the new event; the test now waits for the intended message. Final live run: 15 passed, zero failed; both synthetic accounts deleted. Report directory: work/live-verification-2026-10-03-ready-run2. This verifies controlled resubscription, not airplane mode, app suspension or all possible transport failures.

Release score remains 10/20 (50%) using the original equal-weight rubric. Hosted checks improve evidence within partial criteria; they do not complete whole UI, email, security, privacy or device acceptance. Fresh release:check still rejects missing public origin, terms, privacy, imprint, guidelines and support address. AI and payments remain deferred.

## Auth update — 3 October

See AUTH_VERIFICATION_2026-10-03.md: confirmation resend and request guards implemented; 7 hosted Auth checks passed; exact native/local callback allowlist deployed and rechecked. Owner mailbox resend accepted, delivery and Expo Go return unverified. Production SMTP/domain remain open.

## Password policy follow-up — 3 October

Found a mismatch: signup/reset UI required 12 characters but hosted Auth accepted a minimum of 6. Reviewed a minimal config diff and deployed only auth.minimum_password_length=12. An authenticated attempt to change the synthetic account password to 9 characters was rejected with weak_password. All 8 hosted Auth checks then passed, and the synthetic account was removed. Existing user passwords were not changed.

Signup now requires repeating the password; too-short passwords no longer receive a misleading strength label. Confirmation copy avoids asserting delivery, and explains the sign-in/reset path for existing accounts. Email receipt and the exact Expo Go return address are still pending owner feedback. No additional emails were sent in this follow-up.
