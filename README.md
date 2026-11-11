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

`GoogleAppsScript.gs` enthält den Apps-Script-Endpunkt und die Tabellenformatierung. Für jede eingeladene Person wird einzeln „Kommt“ oder „Kommt nicht“ ausgewählt. Die Antworten werden im Tabellenblatt `Anmeldungen` mit einer Zeile pro Person gespeichert; Zu- und Absagen werden getrennt eingetragen, und die gemeinsame Nachricht sowie das persönliche Kennwort werden jeder Person zugeordnet. Ein persönliches Kennwort kann nur einmal Rückmeldungen speichern. Zur Korrektur löscht ihr alle zu diesem Kennwort gehörenden Zeilen in `Anmeldungen`; danach kann die Einladung erneut verwendet werden. Beim Einrichten werden eventuell noch vorhandene Zusatzspalten vor der Nachricht aus `Anmeldungen` entfernt. Das Blatt `Auswertung` zählt die Personen mit Zusage und Absage (Spalte `Anzahl Personen`) als feste Werte; dadurch sind die Zähler nicht von der Tabellensprache oder Formeltrennzeichen abhängig. Beim Einrichten, nach jeder neuen Rückmeldung sowie nach Änderungen und gelöschten Zeilen in `Anmeldungen` werden die Zähler aktualisiert.

1. Öffnet die Google-Tabelle und wählt **Erweiterungen > Apps Script**.
2. Fügt den Inhalt aus `GoogleAppsScript.gs` in das Skriptprojekt ein und speichert.
3. Wählt `setupRsvpSpreadsheet` aus und führt die Funktion aus. Bestätigt die Google-Berechtigungsabfrage. Dadurch werden die Tabellenblätter, Überschriften, Filter, Rahmen/Zeilenbänder, Zeitstempelformat und Zähler eingerichtet bzw. die Zähler aus vorhandenen Antworten neu berechnet. Bei einer bestehenden Tabelle führt die Funktion die Schema-Aktualisierung durch und ergänzt `Persönliches Kennwort` als letzte Spalte, ohne vorhandene Antworten zu löschen. Eventuell noch vorhandene Zusatzspalten zwischen Personenzahl und Nachricht werden wie bisher entfernt. Außerdem wird ein Änderungstrigger eingerichtet, der die Zähler nach Änderungen oder gelöschten Zeilen in `Anmeldungen` automatisch aktualisiert. Das Blatt `Auswertung` wird im vorgesehenen Bereich `A1:B3` aktualisiert.
4. Wählt `generatePersonalizationPasswords` aus und führt die Funktion einmal aus. Im Tabellenblatt `Personalisierung` müssen die Namen in Spalte A ab Zeile 5 stehen. Die Funktion schreibt die vierstelligen Passwörter nach Spalte B: direkt zusammenhängende Namen erhalten dasselbe Passwort, eine leere Namenszeile erhält den Hinweis „Kein Passwort benötigt“ und trennt die Passwortgruppen. B3 und B4 erhalten jeweils das Admin-Passwort `2702`. Bereits gültige Passwörter einer Gruppe bleiben erhalten; prüft anschließend Spalte B und teilt die Passwörter persönlich mit. Bei Namen mit mehreren Teilen wird der erste als Vorname und der Rest als Nachname angezeigt. Einteilige Namen werden als Vorname übernommen; das leere Nachnamenfeld wird im Formular ausgeblendet.
5. Wählt `setupPersonalizationEditTrigger` aus und führt die Funktion einmal aus. Bestätigt die Google-Berechtigungsabfrage. Damit wird ein installierbarer Bearbeitungstrigger eingerichtet und die Passwortspalte einmal mit den aktuellen Namen synchronisiert. Dafür ist keine neue Web-App-Bereitstellung nötig. Danach erzeugt eine Änderung oder Eingabe in `Personalisierung!A5:A` automatisch die passenden Passwörter in Spalte B. Zusammenhängende Gäste teilen weiterhin ein Passwort; eine leere Namenszeile trennt Gruppen und erhält den Hinweis „Kein Passwort benötigt“. Bestehende Gruppencodes bleiben bei Namenskorrekturen erhalten. Der Code liest den aktuellen Namen aus Spalte A, daher wird die korrigierte Schreibweise beim nächsten Anmelden direkt angezeigt. Admin-Codes in B3/B4 bleiben `2702`.
6. Wählt **Bereitstellen > Bereitstellungen verwalten**, bearbeitet die Web-App-Bereitstellung und veröffentlicht eine neue Version, wenn ihr `GoogleAppsScript.gs` ändert. Als Ausführungskonto wählt ihr euer eigenes Google-Konto. Der Zugriff muss für Websitebesucher möglich sein („Jeder“). Die Tabelle selbst sollte weiterhin nur mit den Personen geteilt werden, die die Anmeldungen verwalten.
7. Die Web-App-URL steht in `script.js` als `rsvpEndpoint`. Das Formular muss `method="post"` verwenden, da das Apps Script Passwortprüfung und Anmeldung über `doPost` verarbeitet. Die URL kann bei einer neuen Version gleich bleiben; falls ihr eine neue Bereitstellung erstellt, aktualisiert sie auf die URL, die auf `/exec` endet.
8. Veröffentlicht die aktualisierten Website-Dateien und testet einen gültigen und einen ungültigen Code sowie Zu- und Absagen für mehrere Personen. Nach gültigem Passwort werden die vollständigen Namen der zusammengehörigen Gäste jeweils in einem nicht veränderbaren Feld `Name` mit einem individuellen Ein/Aus-Schalter für „Kommt“ oder „Kommt nicht“ angezeigt. Die Anmeldung wird serverseitig gegen Passwort und geordnete Namensgruppe geprüft. In der Tabelle wird pro Gast eine Zeile mit der passenden Zusage oder Absage gespeichert; Vornamen, Nachnamen, die gemeinsame Nachricht und das persönliche Kennwort werden jeder Person zugeordnet. Das Kennwort verhindert serverseitig eine zweite Rückmeldung, auch wenn erneut auf „Rückmeldung absenden“ geklickt wird. Zur Freigabe nach einer notwendigen Korrektur löscht alle Zeilen mit diesem persönlichen Kennwort in der Spalte `Persönliches Kennwort`. Erst nach bestätigter Speicherung zeigt die Seite eine Erfolgsmeldung und lädt nach vier Sekunden neu; bei Fehlern bleibt die Meldung sichtbar und die Eingabe erhalten. Prüft, ob alle Zeilen in `Anmeldungen` erscheinen und die beiden Zähler aktualisiert werden.

Falls die Passwortabfrage fehlschlägt, führt `diagnosePersonalizationPasswordSetup` im Apps Script aus und prüft das Ausführungsprotokoll. Es zeigt den Namen der tatsächlich verwendeten Tabelle, ob sie zur im Editor geöffneten Tabelle passt, ob B3/B4 den Admin-Code enthalten und wie viele Gäste gültige Codes haben. Der Log enthält keine Passwörter. Die Passwortantwort enthält außerdem eine Versionskennung, damit eine veraltete Web-App-Bereitstellung erkennbar ist.

Für einen gezielten Test der Gruppe in den Zeilen 191 und 192 kann `diagnosePasswordLookupForRows191And192` im Editor ausgeführt werden. Die Funktion testet die Codes aus diesen Zeilen mit derselben Suche wie die Anmeldung und protokolliert nur Zeilennummern, Trefferzahl und Prüfresultate, niemals Namen oder Passwörter. Die Anmeldung ordnet alle Namen zu, deren Passwortzelle exakt denselben Code enthält; sie leitet die Gruppe nicht aus benachbarten Zeilen ab.

Die Passwortabfrage blendet die statische Website zunächst aus; sie ersetzt keine Zugriffssperre beim Hosting. Die Inhalte einer statisch veröffentlichten Website können weiterhin über den Seitenquelltext oder direkte Datei-URLs abgerufen werden. Für vertrauliche Inhalte muss zusätzlich beim Hosting-Anbieter ein echter Zugriffsschutz eingerichtet werden.

Bis die URL eingetragen ist, meldet das Formular ausdrücklich, dass die Antwort nicht gespeichert wurde. Der öffentliche Web-App-Endpunkt nimmt Formulareingaben entgegen, gibt aber keine Tabelleninhalte zurück. Da er öffentlich erreichbar sein muss, kann er dennoch Spam-Eingaben erhalten. Die Tabelle sollte nicht öffentlich geteilt werden.

## Eigene Domain und Veröffentlichung

Eine Domain (z. B. `pia-und-martin.de`) wird bei einem Domainanbieter registriert. Zusätzlich braucht ihr einen Webhosting-Anbieter oder einen statischen Hostingdienst, auf den ihr die Dateien hochladet. Die Dateien müssen gemeinsam online liegen; `index.html`, `styles.css` und `script.js` müssen im selben Website-Ordner bleiben. Wenn ihr das Foto nutzt, ladet auch den Ordner `images` mit hoch.

Vor dem Veröffentlichen:
- echte Orte, Uhrzeiten und Kontaktangaben eintragen,
- euer Foto ergänzen,
- Anmeldeformular mit Speicherung einrichten,
- Datenschutz- und Impressumsanforderungen für eure konkrete Website prüfen,
- Website auf Smartphone und PC testen.
