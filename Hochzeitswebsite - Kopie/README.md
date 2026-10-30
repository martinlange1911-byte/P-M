# Pia & Martin – Hochzeitswebsite

Eine responsive Hochzeitswebsite mit einer eleganten, ruhigen Gestaltung: Salbeigrün, warmes Elfenbein und dezente Terrakotta-Akzente. Die Website ist für Desktop, Tablet und Smartphone ausgelegt.

## Dateien

- `index.html` – Seiteninhalt: Startseite, Countdown, Tagesablauf, Anmeldung, Geschenkwünsche, Dresscode, Anfahrt und FAQ.
- `styles.css` – Farben, Schriftbild, Abstände, Karten, Layout und mobile Darstellung.
- `script.js` – Countdown, mobile Navigation und Verhalten des Anmeldeformulars.
- `images/hochzeitspaar.jpg` – optional euer eigenes Foto. Legt dafür einen Ordner `images` neben `index.html` an.

## Website lokal ansehen

1. ZIP-Datei entpacken.
2. Den Ordner `pia-martin-hochzeitswebsite` öffnen.
3. `index.html` doppelklicken. Die Seite öffnet sich im Browser.
4. Für die Google Fonts ist eine Internetverbindung nötig; ohne Verbindung verwendet die Seite Ersatzschriftarten.

## Inhalte ändern

Öffnet `index.html` in einem Texteditor (z. B. Visual Studio Code oder Notepad++) und ändert die Texte, Zeiten, Adressen und FAQ direkt dort.

In `styles.css` könnt ihr die Gestaltung anpassen. Die zentralen Farben stehen am Anfang des Stylesheets unter `:root`.

In `script.js` steht das Hochzeitsdatum für den Countdown. JavaScript-Monate beginnen bei `0`: Mai ist daher `4`. Das Datum ist derzeit auf den 1. Mai 2027 eingestellt.

## Google-Sheets-Anmeldung einrichten

`GoogleAppsScript.gs` enthält den Apps-Script-Endpunkt und die Tabellenformatierung. Die Antworten werden zeilenweise im Tabellenblatt `Anmeldungen` gespeichert. E-Mail-Adressen werden nicht abgefragt oder gespeichert. Beim erneuten Ausführen von `setupRsvpSpreadsheet` wird die bisherige E-Mail-Spalte samt darin enthaltenen Adressen entfernt, ohne die übrigen Anmeldedaten zu löschen. Das Blatt `Auswertung` zählt die Personen mit Zusage und Absage (Spalte `Anzahl Personen`) als feste Werte; dadurch sind die Zähler nicht von der Tabellensprache oder Formeltrennzeichen abhängig. Beim Einrichten und nach jeder neuen Rückmeldung werden die Zähler aktualisiert.

1. Öffnet die Google-Tabelle und wählt **Erweiterungen > Apps Script**.
2. Fügt den Inhalt aus `GoogleAppsScript.gs` in das Skriptprojekt ein und speichert.
3. Wählt `setupRsvpSpreadsheet` aus und führt die Funktion einmal aus. Bestätigt die Google-Berechtigungsabfrage. Dadurch werden die Tabellenblätter, Überschriften, Filter, Rahmen/Zeilenbänder, Zeitstempelformat und Zähler eingerichtet bzw. die Zähler aus vorhandenen Antworten neu berechnet. Vorhandene Anmeldungszeilen bleiben erhalten. Die bisherige E-Mail-Spalte im Blatt `Anmeldungen` wird gelöscht. Das Blatt `Auswertung` wird im vorgesehenen Bereich `A1:B3` aktualisiert.
4. Wählt **Bereitstellen > Neue Bereitstellung > Web-App**. Als Ausführungskonto wählt ihr euer eigenes Google-Konto. Der Zugriff muss für Websitebesucher möglich sein („Jeder“). Die Tabelle selbst sollte weiterhin nur mit den Personen geteilt werden, die die Anmeldungen verwalten.
5. Die bereitgestellte Web-App-URL steht in `script.js` als `rsvpEndpoint`. Das Formular muss `method="post"` verwenden, da das Apps Script die Daten über `doPost` verarbeitet. Wenn ihr eine neue Bereitstellung erstellt, aktualisiert den Endpunkt mit der neuen URL, die auf `/exec` endet.
6. Veröffentlicht die aktualisierten Website-Dateien und testet je eine Zusage und Absage. Erst nach bestätigter Speicherung zeigt die Seite eine Erfolgsmeldung und lädt nach vier Sekunden neu; bei Fehlern bleibt die Meldung sichtbar und die Eingabe erhalten. Prüft, ob die Zeilen in `Anmeldungen` erscheinen und die beiden Zähler aktualisiert werden.

Nach Änderungen am Apps Script (einschließlich `doGet` und der `requestId`-Bestätigung) muss unter **Bereitstellen > Bereitstellungen verwalten** die Bereitstellung bearbeitet und eine neue Version veröffentlicht werden, damit die `/exec`-URL den aktualisierten Code ausführt. Die URL kann dabei gleich bleiben.

Bis die URL eingetragen ist, meldet das Formular ausdrücklich, dass die Antwort nicht gespeichert wurde. Der öffentliche Web-App-Endpunkt nimmt Formulareingaben entgegen, gibt aber keine Tabelleninhalte zurück. Da er öffentlich erreichbar sein muss, kann er dennoch Spam-Eingaben erhalten. Die Tabelle sollte nicht öffentlich geteilt werden; Unverträglichkeiten sollten nur zur nötigen Hochzeitsorganisation eingetragen werden.

## Eigene Domain und Veröffentlichung

Eine Domain (z. B. `pia-und-martin.de`) wird bei einem Domainanbieter registriert. Zusätzlich braucht ihr einen Webhosting-Anbieter oder einen statischen Hostingdienst, auf den ihr die Dateien hochladet. Die Dateien müssen gemeinsam online liegen; `index.html`, `styles.css` und `script.js` müssen im selben Website-Ordner bleiben. Wenn ihr das Foto nutzt, ladet auch den Ordner `images` mit hoch.

Vor dem Veröffentlichen:
- echte Orte, Uhrzeiten und Kontaktangaben eintragen,
- euer Foto ergänzen,
- Anmeldeformular mit Speicherung einrichten,
- Datenschutz- und Impressumsanforderungen für eure konkrete Website prüfen,
- Website auf Smartphone und PC testen.
