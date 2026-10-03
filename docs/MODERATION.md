# Moderation: interner Bearbeitungsweg

Die Migration 202609260001 ergänzt einen internen Status und einen Verlauf für gemeldete Inhalte. Normale Nutzer können weder die Warteschlange lesen noch Meldungen als erledigt markieren. Es wurden keine neuen Moderatorenrollen an App-Konten vergeben.

Im geschützten Supabase SQL-Editor können berechtigte Betreiber offene Meldungen ansehen:

```sql
select * from public.moderation_queue('open', 50);
```

Eine konkrete Meldung wird nach Sichtung mit `public.review_report(report_uuid, status, note, operator_label)` dokumentiert. Erlaubte Statuswerte: `reviewing`, `resolved`, `dismissed`. Notiz und verantwortlicher Bearbeiter sind Pflicht. Die Funktion schreibt Status und Verlauf in einer Transaktion. Der Bearbeitername ist eine vom vertrauenswürdigen Operator übergebene Dokumentation, kein kryptografischer Identitätsnachweis.

- `reviewing`: Prüfung läuft; Sachverhalt und erforderliche nächste Schritte knapp dokumentieren.
- `resolved`: nur verwenden, nachdem die tatsächliche Maßnahme ausgeführt und geprüft wurde.
- `dismissed`: Prüfung ohne bestätigten Verstoß abgeschlossen; Grund dokumentieren.

**Diese Funktion entfernt oder sperrt nichts automatisch.** Die konkrete Inhalts-/Kontomaßnahme muss separat durch einen berechtigten Betreiber erfolgen. Ein vollständiges Moderations-UI, Einspruchsprozess, Inhaltsfilter und überprüfte Durchsetzung sind noch nicht implementiert. Keine Inhalte allein aufgrund einer ungeprüften Meldung löschen.

Die Warteschlange liefert maximal 100 Einträge pro Aufruf, älteste zuerst. Nach Bearbeitung verlassen sie den offenen Stapel. Verlauf und Review sind an die Meldung gebunden und werden mit deren Löschung entfernt. Service-Zugriff bleibt hochprivilegiert; kein Server-Key darf im Client, Browser-Speicher oder Repository stehen. Verlauf ist keine manipulationssichere externe Protokollierung.

Vor dem Start muss der Betreiber Verantwortliche, Prüfhäufigkeit, Eskalationsweg und Kontakt für Betroffene festlegen und einen echten Bearbeitungsfall im Staging testen. Keine Reaktionsfrist gegenüber Nutzern versprechen, solange der Betrieb sie nicht leisten kann.
