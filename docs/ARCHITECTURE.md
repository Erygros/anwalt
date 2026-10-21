# Architektur und Berechtigungen

## Anwendung

Next.js 16 App Router, React 19, TypeScript und Tailwind 4. Öffentliche Seiten und geschützte Bereiche werden serverseitig gerendert. Supabase SSR erneuert Sitzungen im Proxy; serverseitige Zugriffe prüfen den Nutzer über `auth.getUser()`. Pro Anfrage erzeugte CSP-Nonces schützen Script-Tags. Schriftarten liegen im Paket und werden vom eigenen Ursprung ausgeliefert.

`src/lib/content.ts` und `cms-schema.ts` liefern redaktionelle Grundinhalte. Veröffentlichte Einstellungen in `settings` ersetzen diese Inhalte. `getFirm()` enthält keine erfundenen Standardkontakte. `isFirmComplete()` und `readiness()` bestimmen die Freigabe. Die Live-Flag allein genügt nicht.

## Rollen

| Rolle          | Datenzugriff                                                                    | Fachliche Entscheidungen                                                     |
| -------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Mandant        | Eigene Akten, externe Nachrichten, Dokumente, Termine, Rechnungen               | Keine Kanzleientscheidungen                                                  |
| Assistenz      | Nur ausdrücklich freigegebene Akten; Aufgaben, Nachrichten und Terminverwaltung | Keine Konfliktfreigabe, Mandatsannahme oder Rechnungsfreigabe                |
| Anwalt         | Nur ausdrücklich freigegebene Akten; eigene Beratungsfenster                    | Konfliktprüfung, Mandatsentscheidung und Rechnungsfreigabe                   |
| Administration | Alle Akten, Konfiguration, Rollen, Datenschutz und Audit                        | Technisch einschließlich Mandatsentscheidung; nur befugten Personen zuweisen |

Rollen stammen ausschließlich aus `staff_members`, nie aus Registrierungs-Metadaten. Jede aktive Mitarbeiterrolle erfordert AAL2. Ein von Mandanten optional aktivierter Faktor wird ebenfalls durch Server und restriktive RLS-Policies erzwungen. Deaktivierte Mitarbeiter verlieren Aktenfreigaben sofort über die dynamische Rollenprüfung.

## Datenzugriff

Alle Anwendungstabellen haben RLS. Browserrollen erhalten nur SELECT-Rechte mit fallbezogenen Policies. Mutationen und RPCs für Buchungen, Übermittlung und Zahlung sind ausschließlich der Serverrolle zugänglich. Vor einer Mutation werden Sitzung, Rolle und Aktenzugriff geprüft. Die Serverrolle darf RLS umgehen und ist daher ein hochsensibles Betriebsgeheimnis.

Der globale PostgREST-Pre-Request-Hook protokolliert Data-API-Lesezugriffe auf sensible Tabellen ohne Queryparameter oder Inhalte. Für konkrete Aktenansichten und Downloads protokolliert die App zusätzlich die Objekt-ID. Infrastrukturzugriffe durch Datenbankadministratoren benötigen die separaten Audit-/Zugriffskontrollen des Betreibers. Supabase-Realtime ist nicht für Mandatsdaten freigegeben.

## Zustände

`draft → submitted → conflict_review → accepted → closed`; aus dem Eingang kann eine Anfrage abgelehnt werden. Die Datenbank lässt `accepted` nur mit dokumentiertem konfliktfreiem Prüfergebnis und verantwortlichem Nutzer zu. Die Prüfung ist eine menschliche Entscheidung, kein automatischer Namensabgleich. Kosten, konkrete Beauftragung und Mandatsunterlagen werden individuell geklärt.

Nachrichten mit `internal=true` sind nur für berechtigte Mitarbeiter sichtbar. Geschlossene und abgelehnte Akten nehmen über die App keine neuen Nachrichten oder Dokumente an. Verlaufseinträge zeigen den Stand des Mandats, Auditprotokolle die relevanten technischen Aktionen.

## Termine, Zahlung und Dateien

Buchungen sperren das Terminfenster transaktional und prüfen Nutzerdoppelbelegung. Überlappende Fenster desselben Anwalts werden per GiST-Exclusion-Constraint verhindert; ein partieller Unique-Index schützt die Belegung. Eine fehlgeschlagene Umbuchung rollt die Stornierung des alten Termins zurück.

Preise sind serverseitige Momentaufnahmen einer hinterlegten Leistung. Stripe nutzt Idempotency-Keys; Webhook-Ereignisse werden atomar dedupliziert. Die Datenbank prüft Session, Rechnungs-ID, Betrag und Währung. Es gibt keine automatische Abbuchung beim Anfrageversand.

Dateien werden auf erlaubten Inhalt, Größe und MIME-Typ geprüft. Erst ein positiver Malwarebefund mit passendem SHA256 erlaubt das Schreiben in den privaten Bucket. Downloads werden als Anhang mit kurzlebigem Link ausgeliefert. Ein Link ist für 60 Sekunden ein übertragbares Zugangsmerkmal und gehört nicht in E-Mails, Logs oder Tracking. Dateinamen können vertraulich sein und werden nur im Portal gezeigt.

## Benachrichtigung und Aufbewahrung

Die Anfrage erzeugt ihre Outbox-Nachricht in derselben Datenbanktransaktion. Resend erhält nur Empfänger, neutrale Mitteilung und gegebenenfalls die zufällige Vorgangsnummer. Erneuter Versand verwendet den gleichen Idempotency-Key. Datenbankseitige Rate Limits verwenden einen HMAC statt Klartextidentifikatoren.

Entwürfe ohne Löschsperre werden nach 30 Tagen bereinigt. Abgelehnte und abgeschlossene Akten brauchen ein ausdrücklich gesetztes, abgelaufenes Aufbewahrungsdatum. Laufende Mandate, gesperrte Akten und Akten mit Rechnungen werden nie automatisch gelöscht. Ein atomarer Löschanspruch verhindert Änderungen an Aufbewahrung oder Status während des Storage-Löschlaufs; Fehler werden beim nächsten Lauf erneut versucht. Kontoerasure erfordert dokumentierte Prüfung und ein Konto ohne verbleibende Akten, Rechnungen, Mitarbeiterrolle oder gebuchte Termine.
