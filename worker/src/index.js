import wordList from "./words.json";

// Set für schnelle Lookups (ist der Rateversuch ein gültiges Wort?)
const VALID_WORDS = new Set(wordList);
const WORD_LENGTH = 5;

// einfacher In-Memory-Cache pro Worker-Instanz, damit nicht bei jedem
// Rateversuch neu bei Notion angefragt werden muss
let cache = { word: null, fetchedAt: 0 };
const CACHE_TTL_MS = 60 * 1000; // 60 Sekunden

function corsHeaders(origin, env) {
  const allowed = env.ALLOWED_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": allowed === "*" ? "*" : allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

// holt das aktuell aktive Wort aus der bestehenden Notion-Datenbank
// "ADMIN alle Einträge": nimmt den neuesten ZüriBriefing-Eintrag (Datum <= heute),
// dessen "Wordle"-Feld nicht leer ist. So bleibt das alte Wort aktiv, bis jemand
// beim aktuellen (oder einem neuen) Tageseintrag ein neues Wort einträgt.
function todayZurichISODate() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // ergibt z.B. "2026-07-27"
}

async function getActiveWord(env) {
  const now = Date.now();
  if (cache.word && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.word;
  }

  const res = await fetch(
    `https://api.notion.com/v1/databases/${env.NOTION_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          and: [
            { property: "Datenbanktyp", select: { equals: "ZüriBriefing" } },
            { property: "Datum", date: { on_or_before: todayZurichISODate() } },
            { property: "Wordle", rich_text: { is_not_empty: true } },
          ],
        },
        sorts: [{ property: "Datum", direction: "descending" }],
        page_size: 1,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Notion-Anfrage fehlgeschlagen (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const page = data.results && data.results[0];
  if (!page) {
    throw new Error(
      "Kein ZüriBriefing-Eintrag mit ausgefülltem Wordle-Feld gefunden (Datum <= heute)."
    );
  }

  const rawWord = (page.properties?.Wordle?.rich_text || [])
    .map((t) => t.plain_text)
    .join("")
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{5}$/.test(rawWord)) {
    throw new Error(
      `Ungültiges Wort im Wordle-Feld gefunden: "${rawWord}". Erwartet werden genau 5 Buchstaben A-Z.`
    );
  }

  cache = { word: rawWord, fetchedAt: now };
  return rawWord;
}

// kurzer, nicht umkehrbarer Hash des Wortes, damit das Frontend erkennen kann
// "hat sich das Wort geändert?", ohne das Wort selbst zu verraten
async function getWordId(word) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(word));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 12);
}

// klassischer Zwei-Pass-Wordle-Vergleich (behandelt doppelte Buchstaben korrekt)
function evaluateGuess(guess, answer) {
  const result = new Array(WORD_LENGTH).fill("absent");
  const answerLetters = answer.split("");
  const guessLetters = guess.split("");

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessLetters[i] === answerLetters[i]) {
      result[i] = "correct";
      answerLetters[i] = null;
      guessLetters[i] = null;
    }
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessLetters[i] === null) continue;
    const idx = answerLetters.indexOf(guessLetters[i]);
    if (idx !== -1) {
      result[i] = "present";
      answerLetters[idx] = null;
    }
  }
  return result;
}

// schreibt eine Zeile pro abgeschlossenem Spiel (Sieg oder Verlust) für die Stats.
// Läuft "fire and forget" via waitUntil, damit die Antwort ans Frontend nicht wartet.
async function logGameResult(env, ctx, { won, attempts, elapsedSeconds, wordId }) {
  if (!env.DB) return; // falls D1 mal nicht gebunden ist, einfach überspringen
  const promise = env.DB.prepare(
    "INSERT INTO game_results (date, won, attempts, time_seconds, word_id) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(todayZurichISODate(), won ? 1 : 0, attempts, elapsedSeconds ?? null, wordId)
    .run()
    .catch((err) => console.error("Stats-Logging fehlgeschlagen:", err));
  if (ctx?.waitUntil) ctx.waitUntil(promise);
  else await promise;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = corsHeaders(request.headers.get("Origin"), env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // GET /api/status -> nur unkritische Infos fürs Frontend beim Laden
    if (url.pathname === "/api/status" && request.method === "GET") {
      try {
        const word = await getActiveWord(env); // stellt sicher, dass ein gültiges Wort existiert
        const wordId = await getWordId(word);
        return jsonResponse(
          { ok: true, wordLength: WORD_LENGTH, maxAttempts: 6, wordId },
          200,
          headers
        );
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message }, 503, headers);
      }
    }

    // POST /api/guess -> { guess: string, attempt: number }
    if (url.pathname === "/api/guess" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Ungültiger Request-Body." }, 400, headers);
      }

      const guess = String(body.guess || "").trim().toUpperCase();
      const attempt = Number(body.attempt) || 1;
      const elapsedSeconds = Number.isFinite(Number(body.elapsedSeconds))
        ? Math.round(Number(body.elapsedSeconds))
        : null;

      if (!/^[A-Z]{5}$/.test(guess)) {
        return jsonResponse(
          { error: "Rateversuch muss aus genau 5 Buchstaben (A-Z) bestehen." },
          400,
          headers
        );
      }

      if (!VALID_WORDS.has(guess)) {
        return jsonResponse({ error: "Kein gültiges Wort.", validWord: false }, 200, headers);
      }

      let answer;
      try {
        answer = await getActiveWord(env);
      } catch (err) {
        return jsonResponse({ error: err.message }, 503, headers);
      }

      const feedback = evaluateGuess(guess, answer);
      const solved = feedback.every((f) => f === "correct");
      const finished = solved || attempt >= 6;
      const wordId = await getWordId(answer);

      if (finished) {
        await logGameResult(env, ctx, { won: solved, attempts: attempt, elapsedSeconds, wordId });
      }

      const response = {
        validWord: true,
        feedback,
        solved,
        wordId,
        // Lösung wird erst verraten, wenn das Spiel vorbei ist
        solution: finished ? answer : undefined,
      };

      return jsonResponse(response, 200, headers);
    }

    // GET /api/stats -> einfache Tages-Statistiken (Spiele, Siege, Ø Versuche/Zeit)
    if (url.pathname === "/api/stats" && request.method === "GET") {
      if (!env.DB) {
        return jsonResponse({ error: "Keine Datenbank gebunden." }, 503, headers);
      }
      try {
        const days = Math.min(Number(url.searchParams.get("days")) || 30, 90);
        const { results } = await env.DB.prepare(
          `SELECT
             date,
             COUNT(*) AS spiele,
             SUM(won) AS siege,
             ROUND(AVG(attempts), 2) AS avg_versuche,
             ROUND(AVG(time_seconds), 1) AS avg_zeit_sekunden
           FROM game_results
           WHERE date >= date('now', ?)
           GROUP BY date
           ORDER BY date DESC`
        )
          .bind(`-${days} days`)
          .all();

        return jsonResponse({ ok: true, days: results }, 200, headers);
      } catch (err) {
        return jsonResponse({ error: err.message }, 500, headers);
      }
    }

    return jsonResponse({ error: "Not found" }, 404, headers);
  },
};
