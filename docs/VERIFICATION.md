# Verifikation

Stand: 21. Oktober 2026. Die Tests verwenden ausschließlich synthetische Testdatensätze und keine veröffentlichten Kanzleiidentitäten.

## Automatisiert

`npm test` führt echte PostgreSQL-Migrationen und RLS-Abfragen in einem isolierten PGlite-PostgreSQL-System aus. Nur die von Supabase bereitgestellten Auth-/Storage-Grundtabellen und JWT-Hilfsfunktionen werden für diesen Test nachgebildet; die Anwendungsmigrationen, Constraints und Berechtigungen werden unverändert angewendet.

Geprüft werden Fremdaktenzugriff, interne Notizen, unbestätigte/anonymous Konten, Mitarbeiter-AAL2, individuelle Aktenfreigaben, optionale Mandanten-MFA, Schreib-/Rolleneskalation, Doppelbuchung, fehlgeschlagene Umbuchung, überlappende Verfügbarkeiten, Konfliktprüfung vor Annahme, Service-Rollen-Funktionsrechte, Zahlungsmanipulation, Webhook-Idempotenz und atomare Anfragebestätigung. Weitere Tests prüfen MIME-Erkennung und Anfragenvalidierung.

`npm run test:scanner` prüft den mitgelieferten HTTP-/ClamAV-Adapter mit einer kontrollierten Protokoll-Gegenstelle: Authentifizierung, exakten Hash und Ablehnung eines infizierten Befunds. Dies ist **kein** Nachweis, dass eine produktive ClamAV-Installation läuft oder aktuelle Signaturen besitzt.

`npm run test:http` gegen eine laufende lokale Instanz prüft alle öffentlichen Seiten, geschützte Weiterleitungen, 404, Origin-Abweisung, Cron-Schutz, nicht signierte Webhooks, Verfügbarkeitsantwort und die Script-CSP. `npm run build` und `npm run typecheck` prüfen Build und TypeScript. CI führt die Datenbank-/Scanner-Tests und den Build bei Push/PR aus.

## Browser

Desktop- und Mobilprüfung bei 1440 bzw. 390 Pixeln Breite: Startseite, Navigation, Mandatsanfrage, FAQ, Kalender-Leerzustand und Anmeldung. Der automatisierte WCAG-A/AA-Scan wurde auf der Startseite und den wesentlichen öffentlichen Formularseiten ausgeführt. Ein bestandener Scan ist keine vollständige Barrierefreiheitszertifizierung. Visuelle Prüfung und manuelle Tastaturprüfung ergänzen ihn.

## Vor dem Livebetrieb zwingend am echten System prüfen

1. Migrationsanwendung im tatsächlichen Supabase-Projekt, PostgREST-Audit-Hook, Zugriffsverweigerung und privater Bucket; zwei getrennte Mandanten und Mitarbeiterkonten verwenden.
2. Registrierung, Bestätigungslink, Passwortreset und vollständige TOTP-Loginfolge mit dem eingerichteten SMTP-Dienst und der endgültigen Callback-Domain.
3. Anfrage mit Upload über den tatsächlich laufenden Scanner, Schadsoftware-Testdatei, abgewiesener MIME-Typ, überschrittene Dateigröße und abgelaufener Downloadlink.
4. Gleichzeitige Terminbuchungen über getrennte HTTP-Sitzungen, Umbuchung/Stornierung und echte Erinnerungszustellung. Der lokale Datenbanktest prüft die Sperr-/Constraint-Semantik; eine Supabase-Lastprüfung ist zusätzlich nötig.
5. Stripe-Testzahlung, abgebrochene und verzögerte Zahlung, wiederholte und falsche Webhook-Signatur, falsche Rechnung/Betrag/Währung und Session-Bindung.
6. Live-Mailversand ohne vertrauliche Inhalte, Ausfall-/Retry-Verhalten, Scanner-/Provider-Ausfall und Alarmierung für ausbleibende Cron-Jobs.
7. Konkrete Kanzlei-, Berufs-, Datenschutz-, Vertrags-, Widerrufs- und Gebührenangaben durch die befugten Verantwortlichen prüfen.
8. Wiederherstellung von Datenbank und Storage sowie Aufbewahrung, Löschsperren und konkrete Datenschutzanfragen in einer isolierten Umgebung durchspielen.

Diese externen Integrationsprüfungen konnten ohne die zugehörigen Zugangsdaten und Dienstkonfigurationen nicht ausgeführt werden. Ein erfolgreiches lokales Build wird nicht als geprüfte Produktivbereitstellung bezeichnet.
