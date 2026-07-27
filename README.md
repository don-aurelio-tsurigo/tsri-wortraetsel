# Tsüri Worträtsel – Setup-Anleitung

Alles läuft auf **einer einzigen Plattform: Cloudflare Workers**. Ein Deploy
liefert sowohl das Spiel (HTML) als auch die API aus – keine zweite Plattform,
kein CORS-Setup nötig.

Struktur:
```
worker/
  src/index.js     -> API-Logik (Notion-Abfrage, Wortvalidierung, Feedback)
  src/words.json    -> deutsche Wortliste zur Validierung
  public/index.html -> das Spiel selbst (wird als Static Asset ausgeliefert)
  wrangler.toml     -> Konfiguration
```

## 1. Notion einrichten

1. Gehe zu https://www.notion.so/my-integrations → **New integration** → einen Namen geben
   (z.B. "Tsüri Worträtsel") → **Submit**. Kopiere das **Internal Integration Secret**
   (beginnt mit `secret_` oder `ntn_`) – das brauchst du gleich als `NOTION_TOKEN`.
2. Öffne die bestehende Datenbank **"ADMIN alle Einträge"** → **... (oben rechts)**
   → **Connections** → deine Integration ("Tsüri Worträtsel") hinzufügen, damit sie
   Zugriff hat.
3. Die **Database ID** dieser Datenbank ist:
   `28ce29f5-f081-80b0-8c89-e01d1704dd87`
   (das ist der `NOTION_DATABASE_ID`-Wert, den du gleich als Secret setzt).

**So bestimmst du das Wort des Tages:** In der Datenbank hat jeder Eintrag mit
`Datenbanktyp = ZüriBriefing` ein Feld **"Wordle"**. Trage dort für den
entsprechenden Tages-Eintrag (Feld "Datum") ein 5-Buchstaben-Wort (A-Z, ohne
Umlaute) ein. Der Worker nimmt automatisch den **neuesten Eintrag mit Datum ≤
heute, dessen Wordle-Feld ausgefüllt ist**. Lässt du das Feld für den
heutigen Eintrag leer, bleibt automatisch das Wort vom letzten Tag aktiv, an
dem eines eingetragen wurde – es ändert sich also nur, wenn du es aktiv
einträgst.

## 2. Deployen (Frontend + Backend zusammen)

```bash
cd worker
npm install
npx wrangler login          # einmalig, öffnet Browser-Login
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put NOTION_DATABASE_ID
npx wrangler deploy
```

Nach dem Deploy zeigt dir wrangler eine URL wie:
`https://tsri-wortraetsel.<dein-account>.workers.dev`

Das ist gleichzeitig die URL für die API **und** für das eingebettete Spiel.
Fertig – kein separater Schritt fürs Frontend nötig.

## 3. Einbetten auf tsri.ch

```html
<iframe
  src="https://tsri-wortraetsel.<dein-account>.workers.dev"
  width="100%"
  height="640"
  style="border:none; max-width:460px;"
  title="Tsüri Worträtsel"
></iframe>
```

## Kosten

Cloudflare Workers Free-Plan deckt 100'000 Requests/Tag ab – für ein
Newsletter-Spiel auf tsri.ch mehr als genug. Falls ihr darüber hinauswachst,
kostet der Workers-Paid-Plan 5 USD/Monat für 10 Mio. Requests. Zum Vergleich
zu den ~200 EUR/Monat für puzzel.org ein Bruchteil.

Optional: Falls ihr eine eigene Subdomain wollt (z.B. `wordle.tsri.ch` statt
`<konto>.workers.dev`), braucht es dafür, dass die DNS-Zone von tsri.ch (oder
zumindest die Subdomain) über Cloudflare läuft – auch das ist im Free-Plan
möglich (Cloudflare Custom Domains für Workers).

## Activity-Stats

Der Worker loggt bei jedem abgeschlossenen Spiel (gewonnen oder nach 6 Versuchen
verloren) eine Zeile in eine Cloudflare-D1-Datenbank – ganz ohne persönliche
Daten, nur: Datum, gewonnen/verloren, Anzahl Versuche, Zeit in Sekunden, und
der anonyme Wort-Hash (gleicher, den auch das Frontend kennt).

Die Datenbank (`tsri-wortraetsel-stats`) ist bereits angelegt und in
`wrangler.toml` verknüpft – beim nächsten Deploy übernimmt Cloudflare das
automatisch, ohne dass du etwas tun musst.

**Stats abrufen:** Öffne im Browser
`https://tsri-wortraetsel.<dein-konto>.workers.dev/api/stats`

Antwort z.B.:
```json
{
  "ok": true,
  "days": [
    { "date": "2026-07-27", "spiele": 214, "siege": 167, "avg_versuche": 3.4, "avg_zeit_sekunden": 51.2 },
    { "date": "2026-07-26", "spiele": 198, "siege": 151, "avg_versuche": 3.6, "avg_zeit_sekunden": 58.0 }
  ]
}
```
Mit `?days=7` (oder einer anderen Zahl, max. 90) kannst du den Zeitraum
eingrenzen, z.B. `/api/stats?days=7`.

Dieser Endpoint ist aktuell **nicht durch ein Passwort geschützt** – jede:r
mit der URL kann die aggregierten Zahlen sehen (keine persönlichen Daten,
nur Tageszahlen). Falls du das absichern willst, sag Bescheid, dann bauen
wir einen einfachen Zugriffsschlüssel ein.

**Später nach Airtable ziehen:** Da die Antwort normales JSON ist, lässt
sich das genau gleich wie eure bestehenden Google-Apps-Script-Syncs
periodisch abrufen und in eine Airtable-Tabelle schreiben.

## Wie es funktioniert



- **Wortliste zur Validierung:** `worker/src/words.json` enthält 8'851 gültige
  deutsche 5-Buchstaben-Wörter (zusammengeführt aus drei Quellen: einer
  Wordle-spezifischen Liste, der Scrabble-tauglichen Tanglet-Wortliste und der
  deutschen Hunspell/wngerman-Rechtschreibliste – alle auf reine A-Z-Wörter
  ohne Umlaute/ß gefiltert und dedupliziert). Das deckt deutlich mehr gültige
  Wortformen ab als die ursprüngliche Liste. Du kannst die Datei jederzeit
  weiter erweitern oder eigene Wörter ergänzen (einfaches JSON-Array).
- **Das Lösungswort selbst** wird nie ans Frontend geschickt – der Worker
  vergleicht serverseitig und schickt nur grün/gelb/grau zurück. Erst wenn
  das Spiel vorbei ist (gelöst oder 6 Versuche aufgebraucht), wird die Lösung
  mitgeschickt.
- **Caching:** Der Worker fragt Notion höchstens alle 60 Sekunden neu ab
  (nicht bei jedem einzelnen Rateversuch), das reicht locker für normalen
  Traffic und schont die Notion-API-Limits.
- **Spielstand:** Wird lokal im Browser (localStorage) pro Rätselwort
  gespeichert, damit ein Reload den Fortschritt nicht verwirft. Ändert sich
  das Wort (neuer Notion-Eintrag), startet automatisch eine neue Runde.
- **Static Assets:** Cloudflare liefert `public/index.html` direkt aus;
  Anfragen an `/api/...` werden automatisch an `src/index.js` weitergereicht
  (steht so in `wrangler.toml` unter `[assets]`).

## Bekannte Einschränkung

Der `attempt`-Zähler wird vom Frontend mitgeschickt und ist theoretisch
manipulierbar (z.B. via Browser-Devtools), wodurch jemand die Lösung früher
als nach 6 Versuchen erzwingen könnte. Für ein öffentliches Spass-Tool auf
einem Stadtmagazin ist das ein vernachlässigbares Risiko – falls gewünscht,
kann das mit serverseitigem Session-Tracking (z.B. Cloudflare KV) später
gehärtet werden.
