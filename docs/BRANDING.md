# RECHTAVO: Brand-Assets und Integration

## Herkunft und Aufbereitung

Visuelle Grundlage sind ausschließlich die drei vom Auftraggeber bereitgestellten JPEG-Dateien in `branding-input/`. Der Hauptlogo-Dateiname enthält im Projekt keinen Zusatz `(1)`; das Motiv ist die bereitgestellte Hauptlogo-Übersicht. Die linke Variante enthält ein eingebranntes Schachbrett und keine Transparenz. Für die produktiven Varianten wurden deshalb die sauberen mittleren und rechten Bildbereiche verwendet.

`npm run branding:prepare` erzeugt die Assets reproduzierbar mit Sharp. Es findet keine Neugenerierung, kein Nachzeichnen und kein Ersetzen des Signets oder des Schriftzugs statt. Die Hintergründe werden anhand der ursprünglichen Randfarben zeilenweise entfernt. Antialiasing wird erhalten und an teiltransparenten Kanten vom ursprünglichen Hintergrund entmischt. Die Bildunterschriften und benachbarten Varianten werden vollständig abgeschnitten. Alle freigestellten PNGs enthalten einen echten Alphakanal. Proportionen bleiben erhalten; es wird nicht verzerrt oder über die Originalauflösung hinaus skaliert.

Die JPEG-Quellen sind keine Vektormaster. Leichte Kompressionsspuren und die begrenzte Ursprungsauflösung lassen sich ohne Veränderung des Zeichens nicht vollständig beseitigen. Die produktiven Dateien bewahren die vorhandenen metallischen Verläufe und Formen. Es werden keine neuen Logoformen erfunden. Die technische Freistellung wurde auf hellem und dunklem Hintergrund visuell geprüft. Die generierten Beschriftungen und das Schachbrett werden nicht ausgeliefert.

## Dateien

| Asset                                                          | Verwendung                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `public/branding/rechtavo-logo-dark.png`                       | Dunkelblau-/Silber-Logo mit Alpha für helle Hintergründe                |
| `public/branding/rechtavo-logo-light.png`                      | Weiß-/Silber-Logo mit Alpha für dunkle Hintergründe                     |
| `public/branding/rechtavo-logo-transparent.png`                | Transparente dunkle Variante für Weiterverwendung                       |
| `public/branding/rechtavo-signet-dark.png`                     | Dunkles Signet ohne Schriftzug, mit Alpha                               |
| `public/branding/rechtavo-signet-light.png`                    | Weiß-/Silber-Signet ohne Schriftzug, mit Alpha                          |
| `public/branding/rechtavo-signet-transparent.png`              | Transparente dunkle Signetvariante                                      |
| `public/branding/rechtavo-hero.webp`                           | Unverzerrtes Originalbanner, 2752 × 1536 Pixel, ca. 65 KB               |
| `public/favicon.ico`                                           | Neues Signet mit 16-, 32-, 48-, 64- und 256-Pixel-Frames                |
| `public/favicon-32x32.png`                                     | PNG-Favicon, 32 × 32 Pixel                                              |
| `public/apple-touch-icon.png`                                  | Apple-Touch-Icon, 180 × 180 Pixel                                       |
| `public/rechtavo-icon-192.png`, `public/rechtavo-icon-512.png` | PWA-Icons mit Signet auf Navy                                           |
| `public/branding/rechtavo-og.png`                              | Social-Media-Bild aus dem Originalbanner und extrahiertem Original-Logo |

Die Rohdateien bleiben zur Nachvollziehbarkeit im Repository, liegen aber außerhalb von `public/` und werden nicht als Website-Grafik ausgeliefert. Die Browserbilder werden zusätzlich über `next/image` in zur Darstellung passenden Auflösungen optimiert. Logo und Banner im sichtbaren Einstieg werden vorgeladen. Auf Smartphones wird das Banner vollständig und proportional im unteren Hero-Bereich gezeigt; die Texte bleiben auf einer kontrastreichen Navy-Fläche lesbar.

## Zentrale Identität

`src/lib/branding.ts` enthält den finalen Markennamen, die vier Markenfarben und alle öffentlichen Assetpfade. Der Root-Layout setzt daraus CSS-Variablen. Metadaten, Navigation, Footer, Portal-Signet, Ladezustand, E-Mail-Signatur und Manifest beziehen sich auf diese zentrale Identität. Der Name in den Kanzleieinstellungen ist als finale Marke schreibgeschützt; tatsächlicher Diensteanbieter, Berufsangaben und Kontaktdaten bleiben eigenständige, editierbare Kanzleidaten. Ein bestehender, abweichender Wert für den früheren Projektnamen in einer Datenbank überschreibt das finale sichtbare Branding nicht.

Alte Monogramme, die Aktenillustration, das bisherige SVG-App-Icon, die frühere Social-Grafik sowie Gold- und warme Papierfarben wurden aus dem produktiven Design entfernt. Funktionsicons und semantische Fehler-/Erfolgsfarben bleiben erhalten. Bestehende Vorgangsnummern, Datenbankobjekte, Rollen, Authentifizierung, Gebühren- und Mandatslogik werden nicht umbenannt oder migriert.

## Verifikation und bestehendes Deployment

Zusätzliche Tests prüfen Alphakanäle, transparente Ränder, ICO-Frames, Manifest und Assetpfade. Build, TypeScript, ESLint, bestehende Funktions-/Berechtigungstests und Browserprüfung ergänzen die Bildkontrolle.

Prüfstand 22. Oktober 2026: 21 Datenbank-, Validierungs- und Brandingtests sowie 3 Scanner-Adaptertests bestanden. Produktionsbuild, TypeScript, ESLint und Formatprüfung erfolgreich. Die Desktop- und Mobilansicht wurden bei 1440 beziehungsweise 390 Pixeln geprüft; auf 390 Pixeln entsteht kein horizontaler Seitenüberlauf. Die geprüften öffentlichen Seiten weisen im automatisierten WCAG-A/AA-Scan keine bestätigten Verstöße auf. Einzelne Kontraststellen über dem dekorativen Signet werden vom Scanner zur manuellen Sichtprüfung markiert. Login, vorausgewählte Mandatsanfrage, Navigation, FAQ und Kalender-Leerzustand werden zusätzlich im Browser geprüft. Unkonfigurierte externe Systeme werden dabei nicht mit erfundenen Konten oder Daten als aktiv vorgeführt.

Es wird ausschließlich das vorhandene GitHub-Repository und dessen bereits verbundene Vercel-Integration verwendet. Es wird kein neues Projekt angelegt. Bereits vor dem Rebranding meldete der Vercel-Status beim Commit `bf6421b` einen Deployment-Fehler mit Verweis auf die Tarifgrenzen für Cron Jobs. `vercel.json` enthält einen 15-Minuten-Zeitplan. Der Hobby-Tarif erlaubt nur tägliche Cron Jobs; häufigere Ausführung verlangt einen passenden Tarif oder einen separat konfigurierten Scheduler. Dieser Betriebszeitplan bleibt im Rebranding unverändert, damit Benachrichtigungs- und Erinnerungsabläufe nicht stillschweigend verändert werden. Grundlage: [Vercel-Dokumentation zu Cron-Tarifgrenzen](https://vercel.com/docs/cron-jobs/usage-and-pricing).
