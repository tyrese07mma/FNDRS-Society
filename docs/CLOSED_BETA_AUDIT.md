# Closed-Beta-Audit – 27. September 2026

Der ergänzte Nutzerauftrag wird innerhalb der vorhandenen Expo-/Supabase-Architektur umgesetzt. UI, Navigation, Produktidee und bestehende Funktionen bleiben erhalten. Die Release-Liste in RELEASE_TASKS.md bleibt bestehen; für technische Korrekturen gilt jetzt die Priorität des neuen Auftrags.

## 1. Nachgewiesener Stand

- 43 lokale Tests bestanden, einschließlich SQL/RLS, gegenseitigem Matching, Ausschluss fremder Chatteilnehmer, Blockierungen, Kontodatenexport, Moderationsberechtigungen und Linkfehlern. TypeScript und ESLint bestanden.
- Frische Installation mit `npm ci --ignore-scripts` in einem getrennten Ordner und drei Kompatibilitätstests bestanden. Paketprüfung am 26. September ohne bekannte Sicherheitsmeldungen. Dies ist keine vollständige Sicherheitsfreigabe.
- Web-/Android-/iOS-Export am 26. September erfolgreich; keine signierten Geräte-Binaries. Auch der neue Stand vom 27. September wurde für Web, Android und iOS erfolgreich exportiert.
- Im Browser am 26. September bestehende Supabase-Sitzung, Startseite, Analytics und Communities geprüft; ungültiger Auth-Link zeigt Fehler und führt über die Schaltfläche zurück zur App.
- Zwölf Migrationen einschließlich privater Moderationswarteschlange bereitgestellt. Keine produktiven Daten zurückgesetzt.

## 2. Teilweise implementiert

Auth-Lebenszyklus, persistente Profile, Feed, Chat, Matching, Datenexport und Löschung existieren. Lokale SQL-Tests ersetzen nicht den vollständigen gehosteten Zwei-Konten-Durchlauf mit E-Mail, Realtime, Storage und Neustart. Auth-Domain/SMTP und kontrollierte Testkonten fehlen.

Moderation hat Meldungen, private Warteschlange, Status und Verlauf. Inhaltsmaßnahmen und verantwortliche Bearbeitung sind noch offen. Benachrichtigungen sind in der Datenbank und innerhalb der App vorhanden; Push-Zustellung ist nicht fertig.

DE/EN wurde für Analytics, Challenges, Mentoren und Investoren ergänzt, einschließlich Ladefehlern und Wiederholung. Vollständige visuelle Abnahme, Servertexte, Geräte-/Tastatur-/Screenreader-Tests bleiben offen.

## 3. Konkrete Fehler und aktuelle Korrekturen

- Profil-/Startup-/Kalenderlinks hatten unbehandelte Öffnungsfehler. Zentraler Web-Link-Öffner prüft Schema, Zugangsdaten und URL-Form; Fehler werden übersetzt angezeigt. Tests decken ungültige Links, Provider-Ablehnung und fehlerhafte URL-Erzeugung ab. Erreichbarkeit beliebiger Nutzer-Websites kann dadurch nicht garantiert werden.
- Chat konnte bei schnellem Doppeltippen mehrere Requests starten; ein fehlgeschlagener Versand löschte den Entwurf. Synchroner Sendeschutz und Erhalt des Entwurfs ergänzt. Netzwerkantwortverlust nach erfolgreicher Speicherung benötigt weiterhin serverseitige Idempotenz; diese Änderung behauptet keine Exactly-once-Zustellung.
- Neue Übersetzungsplatzhalter auf das vorhandene Format `{{name}}` korrigiert. Vorher hätten einzelne Texte Platzhalter angezeigt.
- Analytics zeigte erfundene Besucherrollen und unbelegte Steigerungsversprechen; entfernt. Challenges versprachen pauschal neue Inhalte jeden Montag; ersetzt durch einen ehrlichen Leerzustand. Investorenansicht bietet bei deaktiviertem Billing keine Upgrade-Aktion mehr an.
- Der gemeldete Fehler „undefined cannot be used as a constructor“ ist noch nicht reproduziert. Ursache nicht belegt, deshalb ausdrücklich offen. Stacktrace/betroffene Plattform und Geräteprüfung erforderlich.
- Das blaue schwebende Zahnrad ist noch nicht eindeutig zugeordnet. Lokale Vorschau ist bereits durch `__DEV__`, Web-Plattform, Vorschauflag und fehlendes Backend abgesichert. Expo-Web-DevTools sind upstream an Nicht-Produktion gebunden. Das beweist noch nicht, dass das konkret beobachtete Zahnrad von dort stammt; Produktions-Browserprüfung bleibt offen.

## 4. Mocking und externe Dienste

Die explizite lokale Designvorschau enthält keine echten Konten oder sozialen Aktivitäten und ist kein Produktionsnachweis. Der produktive Adapter arbeitet mit Supabase. Simulierte KI-Antworten sind entfernt. Copilot benötigt serverseitige Anbieter-Konfiguration und echte Integrationstests. KI und Zahlungen bleiben entsprechend der Nutzerentscheidung deaktiviert.

Stripe-Serverpfade und Berechtigungsprüfung existieren. Kauf, Kündigung, Wiederherstellung und Store-Käufe sind nicht vollständig geprüft/abgeschlossen. Keine Aktivierung kostenpflichtiger Anbieter oder neuer Zahlungsarchitektur durch dieses Audit.

## 5. Sicherheit

RLS-Tests verhindern unter anderem fremde Profiländerungen, Selbstverifizierung, fremden Nachrichtenzugriff, private Community-Leaks und Client-Aufruf interner Quotenfunktionen. Server-Secrets gehören nicht in Expo-Public-Variablen; Release-Prüfung sperrt entsprechende Konfigurationen. Private Standortdaten sind getrennt.

Die bekannten transitiven Decoder-/UUID-Meldungen wurden kompatibel behoben. Weitere offene Prüfungen: gehostete Realtime-/Storage-Isolation, gesamter Auth-Lebenszyklus, XP-Spam, Founder-Score-Manipulation und Account-Wechsel während mehrstufiger Requests.

## 6. Datenbank-/Schemafragen

Keine destruktive Migration erforderlich oder durchgeführt. Nachrichten besitzen persistente IDs, Mitgliedschaftsregeln und paginierte Historie; stabile clientseitige Versand-ID beziehungsweise idempotentes RPC fehlt. Bestehende XP-Trigger und Score-Berechnung sind beizubehalten und systematisch auf wiederholbare Belohnungen zu prüfen. Ein Bewertungsverlauf allein setzt noch keine Moderationsentscheidung durch.

## 7. Reihenfolge der weiteren Umsetzung

1. Laufzeitfehler reproduzieren, Produktions-Debug-Oberfläche verifizieren, Linkprüfung abschließen.
2. Chat-Idempotenz, Reihenfolge, Wiederverbindung/Lesestatus und Zwei-Konten-Durchlauf.
3. Smart Match einschließlich Profilkriterien, Duplikaten und Wiederanmeldung.
4. Lade-/Fehler-/Offline-Zustände, vollständige Auth-/RLS-/Storage-Prüfung.
5. Restliche Sprache und Gerätebedienung; Founder Score und XP-Anti-Spam.
6. Vorhandene KI-/Pro-Pfade prüfen, deaktivierte Dienste ehrlich kennzeichnen.
7. Meldungen/Blockierungen/Moderation und Benachrichtigungen vervollständigen.
8. Release-Aufgaben, Monitoring/Restore und geschlossene Beta mit dokumentierten echten Testergebnissen abschließen.

Keiner dieser offenen Nachweise wird allein durch einen erfolgreichen Build als erledigt markiert.

## Nachtrag: Nachrichten und Matching

Der zuvor offene serverseitige Schutz gegen wiederholtes Senden wurde mit Migration 202609270001 bereitgestellt und lokal getestet. Kennungen bleiben bei Wiederholung im geöffneten Chat erhalten; sie überleben noch keinen Neustart. Details und Grenzen: MESSAGING_VERIFICATION.md. Zusätzliche Matching-/XP-Prüfungen bestehen; insgesamt 47 lokale Tests. Die übrigen offenen Auditpunkte bleiben bestehen.

## Nachtrag vom 2. Oktober

Der letzte fehlgeschlagene Sendeversuch wird jetzt kontobezogen dauerhaft gespeichert und bei erneutem Öffnen wiederhergestellt. Die unveränderte Wiederholung behält ihre Sendekennung. Speicheradapter-Tests bestehen, reale Neustart-/Gerätetests noch offen. Es handelt sich nicht um eine automatische Offline-Warteschlange.
