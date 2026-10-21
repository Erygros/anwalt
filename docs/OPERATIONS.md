# Betrieb

## Regelmäßige Aufgaben

- Cron-Erfolg, fehlgeschlagene Mailzustellungen und ausstehende Outbox-Einträge überwachen. Nach 15 erfolglosen Versuchen bleibt ein Eintrag zur manuellen Prüfung stehen. Nach Behebung des Problems `attempts` im administrativen SQL-Werkzeug auf 0 setzen; keine Mailinhalte in Tickets kopieren.
- `GET /api/cron` ausschließlich mit `Authorization: Bearer CRON_SECRET` ausführen. Vercel fügt den Bearer-Wert für konfigurierte Cron-Jobs hinzu. Den Schlüssel niemals in URL-Parametern transportieren.
- Neue Eingänge und Fristen täglich persönlich prüfen. Erinnerungen sind eine Unterstützung, kein Ersatz für die organisatorische Fristenkontrolle. Die App verspricht keine ständige Erreichbarkeit.
- Scanner-Signaturen und Container aktualisieren. Bei Ausfall bleibt der Upload gesperrt; bestehende geprüfte Dokumente können weiter berechtigt heruntergeladen werden.
- Stripe-Zahlungen, Bankbelege, Erstattungen und Buchhaltung abstimmen. Rechnungsdokumente und gesetzlich erforderliche Angaben sind durch die Kanzlei zu erstellen und als Dokument beizufügen.
- Auditlogs, Datenbankgröße, Zahl der Entwürfe und Storageverbrauch prüfen. Auditlogs werden nicht ungeprüft automatisch gelöscht; eine eigene, fachlich begründete Audit-Aufbewahrungsregel einrichten.

## Aufbewahrung und Datenschutz

Aufbewahrungsfristen werden pro Akte festgelegt. Es gibt keine pauschale Annahme, dass jede Datei nach einer festen Zahl von Jahren gelöscht werden darf. Gesetzliche und vertragliche Pflichten, laufende Verfahren, Rechnungsunterlagen und sonstige Löschsperren individuell prüfen.

Datenschutzanfragen erscheinen unter `/admin/datenschutz`. Auskunft und Erasure werden begründet dokumentiert. Die Entscheidung ist von der tatsächlichen technischen Löschung getrennt. Bei Rechnungen verhindert die Anwendung eine automatische Akten-/Kontolöschung; nach Ablauf der einschlägigen Pflichten sind Zahlungsunterlagen in einem dokumentierten, kontrollierten Verfahren zu bereinigen. Ein Operator kann anschließend den normalen Löschlauf erneut ausführen. Keine Fremd- oder Kanzleidaten über einen Mandantenexport herausgeben. Der JSON-Selbstauskunftsexport ergänzt eine individuelle Auskunft und ersetzt deren Prüfung nicht.

Backups haben eigene Ablaufzeiten. Eine Löschung in der Live-Datenbank entfernt nicht sofort Kopien aus Sicherungen. Wiederherstellungen müssen eine Liste zwischenzeitlich wirksam gewordener Löschungen und Kontosperren erneut anwenden. Dritte Anbieter wie Stripe, Versand und Video sind in den Datenschutzprozess einzubeziehen.

## Sicherung und Wiederherstellung

Mit Supabase einen geeigneten Backup-/PITR-Tarif wählen und die Wiederherstellung regelmäßig in einer isolierten Umgebung prüfen. Datenbankbackup und Storage müssen gemeinsam gesichert werden; ein DB-Backup allein enthält nicht die Dokumentenbytes. Schlüssel getrennt verwalten. RLS, Rollen, Migrationsstand und private Bucket-Einstellungen nach jeder Wiederherstellung verifizieren.

Bei einem Sicherheitsvorfall den Livebetrieb mit `FIRM_LIVE=false` sperren, gefährdete Schlüssel rotieren, betreffende Sitzungen widerrufen und Mitarbeiter deaktivieren. Maßnahmen und gegebenenfalls notwendige Meldungen durch die zuständigen Verantwortlichen prüfen. Vertrauliche Payloads nicht in Anwendungs- oder Fehlertracking aktivieren. Access-Logs von Proxies dürfen Authorization-Header, Cookies und signierte Download-URLs nicht speichern.

## Zwei-Faktor-Wiederherstellung

Es gibt absichtlich keinen selbstgebauten AAL2-Bypass. Bei verlorenem Authenticator zuerst die Identität nach dem Kanzleiverfahren prüfen. Ein berechtigter Supabase-Administrator kann anschließend den betroffenen Faktor entfernen bzw. den Zugang wiederherstellen. Aktive Mitarbeiter bleiben bis zur erneuten Einrichtung durch die Rollenprüfung gesperrt. Nach einem Gerätewechsel erst einen funktionierenden neuen Faktor sicherstellen; Mitarbeiter niemals aus Bequemlichkeit in Mandantenkonten umstufen.

## Grenzen

Es sind keine beA-Übermittlung, automatische Konfliktentscheidung, vollständige Buchhaltung, qualifizierte Signatur, automatische Rückerstattung oder automatische Videoraumerstellung enthalten. Der Anbieterlink wird von einem berechtigten Mitarbeiter bereitgestellt. Juristische Prüfung, Mandatsvereinbarung und organisatorische Pflichten bleiben beim verantwortlichen Berufsträger. Die bereitgestellte Software und automatisierten Prüfungen ersetzen keine externe Sicherheits- oder Rechtsprüfung.
