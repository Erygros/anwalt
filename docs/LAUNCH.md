# Einrichtung und Freischaltung

## 1. Supabase

Ein Projekt in einer für die Kanzlei geprüften EU-Region erstellen. Auftragsverarbeitungsverträge, Unterauftragnehmer, Zugriffsregelungen und Aufbewahrung mit den tatsächlichen Kanzleivorgaben abstimmen. Das Repository enthält keine Zugangsdaten und keine Migration wird ungefragt gegen eine bestehende Datenbank ausgeführt.

Die sechs SQL-Dateien in `supabase/migrations/` in Dateinamen-Reihenfolge ausführen, z. B. mit der Supabase CLI (`supabase link`, anschließend `supabase db push`) oder einzeln im SQL-Editor. Jede Migration nur einmal anwenden. Bestehende Datenbanken vorher sichern. Migration 004 installiert einen PostgREST-Pre-Request-Hook für Zugriffsprotokolle und weigert sich, einen bestehenden Hook zu überschreiben. Bei einem vorhandenen Hook die Funktionen fachgerecht kombinieren. `NOTIFY pgrst, 'reload config'` lädt die Einstellung neu.

Im Auth-Dashboard:

- Site URL auf die endgültige HTTPS-Adresse setzen.
- Genau die freigegebenen Callback-Adressen aufnehmen, lokal `http://localhost:3000/auth/callback`, produktiv `https://EIGENE-DOMAIN/auth/callback` sowie dieselbe Adresse mit `?next=/mandantenbereich?reset=1` für die Passwortwiederherstellung. Keine offenen Domain-Wildcards.
- E-Mail-Bestätigung einschalten; mindestens 12 Zeichen Passwortlänge und den Schutz gegen bekannte kompromittierte Passwörter einstellen, soweit im gebuchten Tarif verfügbar.
- Einen eigenen SMTP-Anbieter konfigurieren. Supabase-Auth-Mails und die App-Outbox sind zwei getrennte Versandwege.
- TOTP-Einrichtung und Verifizierung aktivieren. Auth-Rate-Limits kontrollieren und bei öffentlicher Registrierung den von Supabase unterstützten Bot-Schutz ergänzen, falls durch die Bedrohungslage erforderlich.
- JWT- und Sitzungsdauer mit der Kanzlei abstimmen, z. B. kurze Zugriffstokens, Inaktivitätsbegrenzung und Sitzungswiderruf bei Mitarbeiterwechsel.

Die Uploadgrenze beträgt 3 MB je Datei, damit der serverseitig geprüfte Multipart-Upload innerhalb der Vercel-Requestgrenze bleibt. Größere Unterlagen vorab in sinnvoll getrennte PDFs aufteilen und keine externen ungeschützten Links als Ersatz verwenden.

Der private Bucket `case-documents` wird durch die Migration angelegt. **Keine öffentlichen Policies ergänzen.** Für Storage existieren absichtlich keine direkten Clientberechtigungen. Upload und Download erfolgen ausschließlich über die autorisierende Anwendung.

## 2. Ersten Administrator anlegen

Über `/mandantenbereich` ein Konto registrieren und die E-Mail-Adresse bestätigen. Die tatsächliche ID aus Supabase Auth verwenden. Ein Betreiber mit Datenbankzugriff führt einmalig aus:

```sql
insert into public.staff_members(user_id, role)
values ('DIE-TATSAECHLICHE-VERIFIZIERTE-USER-UUID', 'admin');
```

Danach erneut anmelden und den zweiten Faktor einrichten. Ohne AAL2 bleibt der Kanzleibereich gesperrt. Weitere bereits registrierte Konten werden unter `/admin/mitarbeiter` berechtigt. Anwaltsrollen nur an entsprechend befugte Berufsträger vergeben. Die technische Adminrolle umfasst alle Akten und die Mandatsentscheidung; auch sie darf für fachliche Entscheidungen nur von befugten Personen verwendet werden.

## 3. Umgebungsvariablen

| Variable                                     | Zweck                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`                       | Exakter Ursprung der Website, produktiv HTTPS, ohne abschließenden Slash |
| `NEXT_PUBLIC_SUPABASE_URL`                   | Projekt-URL, für den Browser sichtbar                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`              | Öffentlicher Supabase-Key; Sicherheit kommt aus RLS                      |
| `SUPABASE_SERVICE_ROLE_KEY`                  | Nur serverseitig; niemals `NEXT_PUBLIC_` voranstellen                    |
| `FIRM_LIVE`                                  | Standard `false`; erst nach vollständiger Freigabe `true`                |
| `RESEND_API_KEY`, `MAIL_FROM`                | App-Benachrichtigungen über einen verifizierten Absender                 |
| `RATE_LIMIT_SECRET`                          | Zufälliger HMAC-Schlüssel mit mindestens 32 Zeichen                      |
| `CRON_SECRET`                                | Langer zufälliger Bearer-Schlüssel für die Betriebsjobs                  |
| `MALWARE_SCAN_URL`, `MALWARE_SCAN_TOKEN`     | Optional gemeinsam; privater Scanner-Endpunkt, produktiv HTTPS           |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Optional gemeinsam; Checkout und Webhook-Signaturprüfung                 |
| `VIDEO_PROVIDER_HOST`                        | Optional; exakter Host eines von der Kanzlei geprüften Videoanbieters    |

Vertrauliche Werte ausschließlich im Hosting-/Secret-Manager und lokal in der ignorierten `.env.local` hinterlegen. Nach einer Änderung öffentlicher Next.js-Variablen neu bauen/deployen. `npm run check:env` zeigt nur Feldnamen und Status, keine Schlüsselwerte.

## 4. Kanzleiangaben und Inhalte

Unter `/admin/einstellungen` tatsächliche Kanzlei, Anschrift, Kontakt, befugte Berufsträger, Berufsbezeichnung, zuständige Kammer, Zulassungsstaat, Berufshaftpflicht und räumlichen Geltungsbereich eintragen. Geprüfte Pflichttexte, Vertragsinformationen und Versionen/Prüfdaten hinterlegen. Verantwortliche Person und mindestens ein tatsächlich tätiger Berufsträger müssen benannt sein.

FAQ und die vier Rechtsgebietsseiten sowie die Hero-Texte sind in derselben Verwaltung bearbeitbar. Fachanwaltstitel ausschließlich bei vorhandener Berechtigung. Leistungen mit genauer Beschreibung und **Gesamtpreis in Cent inklusive Umsatzsteuer** hinterlegen; ohne hinterlegte Leistungen werden keine Preise erfunden. Eine Änderung eines Leistungspreises ändert keine bestehenden Rechnungsbeträge.

Die Texte müssen auf die konkrete Kanzlei, Mandatsart, Anbieter und Abläufe geprüft werden. Insbesondere BRAO/BORA, RVG, DDG, DL-InfoV, DSGVO, Fernabsatz- und Widerrufsinformationen sowie gegebenenfalls steuerliche Rechnungspflichten berücksichtigen. Die Software behauptet keine automatische Rechtskonformität. Fachliche Grundlagen: [BRAO](https://www.gesetze-im-internet.de/brao/), [§ 34 RVG](https://www.gesetze-im-internet.de/rvg/__34.html), [Berufsrecht bei der BRAK](https://www.brak.de/anwaltschaft/berufsrecht/).

## 5. Dokumentenprüfung

`services/scanner/` enthält einen kleinen authentifizierten HTTP-Adapter für das ClamAV-INSTREAM-Protokoll. Lokal bzw. auf einem separaten Host:

```sh
# SCANNER_TOKEN sicher in der Umgebung setzen (mindestens 32 zufällige Zeichen)
docker compose -f services/scanner/compose.yaml up -d --build
```

Der Adapter bindet im Compose-Beispiel nur an `127.0.0.1:8788`. Signaturdatenbank-Updates und Betriebsüberwachung des ClamAV-Dienstes sicherstellen; beim ersten Start kann der Signaturdownload dauern. Für Vercel einen ausgehenden HTTPS-erreichbaren, zugriffsgeschützten Endpunkt bereitstellen. ClamAV niemals ungeschützt im Internet exponieren. Images für den eigenen Betrieb nach Prüfung auf einen Digest festlegen und regelmäßig aktualisieren.

Die App sendet rohe Bytes mit `Authorization: Bearer ...`. Der Scanner muss `{"clean":true,"sha256":"SHA256_DER_EXAKTEN_BYTES"}` liefern. Timeout, falscher Hash, Malwarefund und uneindeutige Antworten verhindern das Speichern. Als Funktionsprüfung eine harmlose Datei und die offizielle EICAR-Testdatei über den realen Scanner prüfen; keine echten Mandatsdaten für den Einrichtungstest verwenden.

## 6. Zahlung und Video

Stripe zuerst im Testmodus anbinden. Webhook-URL: `/api/payments/webhook`. Ereignisse `checkout.session.completed` und `checkout.session.async_payment_succeeded` freischalten. Den Endpunkt-Schlüssel als `STRIPE_WEBHOOK_SECRET` hinterlegen. Es werden nur bezahlte Sessions mit passendem Rechnungsbetrag, EUR-Währung und gebundener Session verarbeitet. Checkout nur für ausdrücklich angenommene Mandate und bestehende offene Zahlungsanforderungen. Erfolg im Browser markiert eine Rechnung nicht als bezahlt.

Für Video muss die Kanzlei einen geeigneten Anbieter tatsächlich beauftragen, dessen Datenschutzvorgaben prüfen und `VIDEO_PROVIDER_HOST` exakt setzen. Dann Videotermine freigeben und den vom Anbieter ausgestellten Raumlink im Kanzleibereich hinterlegen. Die App erzeugt keine unbeauftragten Videoräume und bettet keine fremde Kamera-/Trackingsoftware ein. Ohne Anbieter gibt es ausschließlich Telefontermine. Rückerstattungen und strittige Zahlungen werden über Stripe und die Kanzleibuchhaltung bearbeitet; automatische Erstattungen sind nicht implementiert.

## 7. Vercel

Das GitHub-Repository `Erygros/anwalt` in Vercel importieren, Next.js und Node 24 verwenden, die ENV-Werte für die gewählte Umgebung setzen und die gewünschte Region vertraglich und technisch prüfen. Das Projekt enthält `vercel.json`, aber keine fremde Projekt-ID. Cron läuft alle 15 Minuten; einen Tarif wählen, der diese Frequenz unterstützt, oder einen externen Scheduler mit demselben Bearer-Schlüssel verwenden. Ohne Cron werden keine App-Mails oder Erinnerungen verschickt. Preview-Deployments nicht mit produktiven Mandatsdaten verbinden.

Nach den Integrationsprüfungen aus `VERIFICATION.md` `FIRM_LIVE=true` setzen. Vollständige Pflichtdaten, DB/Auth, Versand und Rate-Limit-Schlüssel werden zusätzlich zur Flag geprüft. Uploads, Zahlungen und Video haben eigene Freigaben. `FIRM_LIVE=false` schaltet neue Anfragen und Buchungen wieder ab; das Portal für bestehende Konten bleibt erreichbar.
