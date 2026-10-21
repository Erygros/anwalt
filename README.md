# Digitaler Anwalt

Eigenständige deutschsprachige Kanzleiwebsite mit Next.js App Router, TypeScript, Tailwind CSS und Supabase. Dunkelblau, Papierweiß und zurückhaltendes Gold; lokal ausgelieferte Schriftarten und eine in CSS gestaltete Aktenillustration. Keine Stockfotos, Bewertungen, erfundenen Kanzleidaten oder vorgetäuschten Termine.

## Starten

```sh
npm ci
npm run dev
```

Die Website läuft unter `http://localhost:3000`. Ohne Zugangsdaten funktioniert die öffentliche Vorschau; Mandatsübermittlung, Buchung, Upload und Zahlung bleiben gesperrt. `.env.example` nach `.env.local` kopieren und die eigenen Dienste konfigurieren. **Keine Geheimnisse committen.**

```sh
npm test
npm run test:scanner
npm run typecheck
npm run build
npm run check:env
```

`check:env` soll bei einem nicht eingerichteten System fehlschlagen. Der normale Build benötigt keine Zugangsdaten. Ein PostgreSQL-Testsystem startet für die Datenbanktests isoliert im Arbeitsspeicher über PGlite; produktive Datenbanken werden nicht berührt.

## Enthalten

- Startseite und eigenständige Seiten für Strafrecht, Steuerrecht, IT-Recht und Online-Betrug; Kanzlei, Ablauf, Kosten, FAQ, Kontakt, Termine und Pflichttexte.
- Sechsstufige Mandatsanfrage mit vorausgewähltem Rechtsgebiet, Fristen, Beteiligten, optionalen geprüften Unterlagen und Zusammenfassung. Bestätigte E-Mail-Adresse vor der Übermittlung. Atomare Speicherung von Anfrage, Audit, Verlauf und Eingangsbestätigung.
- Supabase-Anmeldung, E-Mail-Verifizierung, Passwortwiederherstellung und TOTP. Für Mitarbeiter verpflichtend; auch direkte Datenbankabfragen beachten den zweiten Faktor.
- Mandantenportal mit Akten, geschützten Nachrichten, Dokumenten, Terminen, Zahlungsstand, Mitteilungen, Stammdaten und Datenschutzanfragen.
- Kanzleibereich mit rollenabhängigen Aktenfreigaben, manueller Interessenkonfliktprüfung, Annahme/Ablehnung, Mandantenverwaltung, internen Notizen, Fristen, Wiedervorlagen, Leistungen, Inhalten, Gebühren und Auditprotokollen.
- Freigegebene Beratungsfenster, variable Dauer, Telefon/optional Video, Umbuchung und Stornierung. Eine Datenbanktransaktion und Exclusion-/Unique-Constraints verhindern Doppelbuchungen.
- Optionaler Stripe Checkout; ausschließlich serverseitige Rechnungsbeträge. Signierte, an Rechnung, Session, Betrag und Währung gebundene sowie idempotente Webhooks.
- Private Dokumentenablage mit Dateiprüfung und verpflichtender Malwareprüfung. Download nur nach Berechtigungsprüfung und Audit über einen 60 Sekunden gültigen Link. Ein ClamAV-Adapter mit Docker-Konfiguration ist enthalten.
- Benachrichtigungen über eine transaktionale Outbox; Erinnerungen, Wiederholungsversuche und geprüfte Aufbewahrungs-/Löschläufe über einen geschützten Cron-Endpunkt.
- Nonce-basierte Script-CSP, Origin-Prüfung bei Mutationen, verteiltes Rate Limiting, keine Falldetails in Anwendungslogs oder E-Mails, keine Analyse-/Werbetracker.

## Einrichtung und Betrieb

- [Einrichtung und Freischaltung](docs/LAUNCH.md)
- [Architektur und Berechtigungen](docs/ARCHITECTURE.md)
- [Betrieb, Aufbewahrung und Wiederherstellung](docs/OPERATIONS.md)
- [Durchgeführte Prüfungen und Prüfgrenzen](docs/VERIFICATION.md)

Noch nicht eingerichtet sind die konkrete Kanzleiidentität, Supabase, Versand, Scanner, Stripe, Videoanbieter und ein Vercel-Projekt. Es wurden keine externen Ressourcen oder kostenpflichtigen Konten angelegt. Die Software schaltet unkonfigurierte Funktionen nicht als aktiv frei. Ein produktiver Start setzt die im Einrichtungsdokument genannten Integrationsprüfungen und die fachliche Freigabe der tatsächlichen Kanzlei voraus.

Rechnungspositionen im Portal sind Zahlungsanforderungen. Formgerechte Rechnungen und vereinbarte Mandatsunterlagen werden von der Kanzlei zur Akte hochgeladen; die Software ersetzt keine Buchhaltung, kein beA und keine qualifizierte elektronische Signatur.
