<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<title>Tsüridle</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #FFFFFF;
    --ink: #1A1A1B;
    --line: #D3D6DA;
    --correct: #3AA76D;
    --present: #F0A202;
    --absent: #86888C;
    --key-default: #D3D6DA;
    --cursor: #2F80ED;
    --tile-size: 62px;
    --tile-gap: 8px;
  }
  * { box-sizing: border-box; }
  button {
    -webkit-appearance: none;
    appearance: none;
    font: inherit;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: 'Space Grotesk', system-ui, sans-serif;
    height: 100%;
  }
  #app {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 12px 16px;
    max-width: 460px;
    margin: 0 auto;
    min-height: 100%;
  }
  #message {
    min-height: 22px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
    text-align: center;
  }
  #message.error { color: #B3261E; }
  #message.success { color: var(--correct); }
  #board {
    display: grid;
    grid-template-rows: repeat(6, var(--tile-size));
    gap: var(--tile-gap);
    margin-bottom: 22px;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(5, var(--tile-size));
    gap: var(--tile-gap);
  }
  .tile {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 28px;
    font-weight: 700;
    border: 2px solid var(--line);
    border-radius: 4px;
    background: #FFFFFF;
    text-transform: uppercase;
    transition: transform 0.15s ease;
  }
  .tile.filled { border-color: #A8A8A8; }
  .tile.cursor { background: var(--cursor); border-color: var(--cursor); }
  .tile.correct { background: var(--correct); border-color: var(--correct); color: #fff; }
  .tile.present { background: var(--present); border-color: var(--present); color: #fff; }
  .tile.absent { background: var(--absent); border-color: var(--absent); color: #fff; }
  .tile.pop { transform: scale(1.08); }
  .tile.shake { animation: shake 0.35s; }
  @keyframes shake {
    10%, 90% { transform: translateX(-2px); }
    20%, 80% { transform: translateX(4px); }
    30%, 50%, 70% { transform: translateX(-6px); }
    40%, 60% { transform: translateX(6px); }
  }
  #keyboard {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    max-width: 480px;
  }
  .kb-row {
    display: flex;
    justify-content: center;
    gap: 6px;
  }
  .key {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    min-width: 0;
    max-width: 40px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--key-default);
    border: none;
    outline: none;
    border-radius: 4px;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    font-size: 15px;
    color: var(--ink);
    cursor: pointer;
    user-select: none;
    transition: background 0.15s ease;
  }
  .key:active { background: #BBBEC2; }
  .key.wide { max-width: 62px; font-size: 10px; }
  .key.enter { background: var(--cursor); color: #fff; }
  .key.delete { background: #5F6368; color: #fff; }
  .key.correct { background: var(--correct); color: #fff; }
  .key.present { background: var(--present); color: #fff; }
  .key.absent { background: var(--absent); color: #fff; }
  footer {
    margin-top: 18px;
    font-size: 11px;
    color: #948F7E;
    text-align: center;
  }
  @media (max-width: 380px) {
    :root { --tile-size: 50px; --tile-gap: 6px; }
    .key { height: 42px; font-size: 13px; }
  }

  /* ---- Success-Dialog ---- */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 100;
    animation: fadeIn 0.2s ease;
  }
  .modal-overlay.hidden { display: none; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: #fff;
    border-radius: 12px;
    padding: 28px 24px 22px;
    max-width: 320px;
    width: 100%;
    text-align: center;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    animation: popIn 0.25s ease;
  }
  @keyframes popIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .modal h2 {
    font-size: 24px;
    margin: 0 0 6px;
  }
  .modal .modal-time {
    font-size: 14px;
    color: #6B6656;
    margin-bottom: 18px;
  }
  .modal .modal-time strong {
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .share-grid {
    font-size: 22px;
    line-height: 1.3;
    white-space: pre-line;
    margin-bottom: 20px;
    user-select: none;
  }
  .share-btn {
    -webkit-appearance: none;
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    border: none;
    outline: none;
    border-radius: 8px;
    background: #25D366;
    color: #fff;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    margin-bottom: 10px;
  }
  .share-btn:active { background: #1EBE5A; }
  .modal-close {
    -webkit-appearance: none;
    appearance: none;
    background: none;
    border: none;
    outline: none;
    color: #6B6656;
    font-size: 13px;
    cursor: pointer;
    text-decoration: underline;
  }
  .promo-banner {
    background: #FEF3C7;
    color: #92400E;
    font-size: 13px;
    font-weight: 600;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 16px;
    line-height: 1.4;
  }
</style>
</head>
<body>
<div id="app">
  <div id="message"></div>
  <div id="board"></div>
  <div id="keyboard"></div>
  <footer>Ein Spiel von Tsüri.ch</footer>
</div>

<div id="successModal" class="modal-overlay hidden">
  <div class="modal">
    <div class="promo-banner">Du bist eine Legende! Zur Feier des Tages schenken wir dir 10% Rabatt im Tsüri-Shop.</div>
    <h2 id="successTitle">Gschafft!</h2>
    <p class="modal-time">Gelöst in <strong id="successTime">0:00</strong></p>
    <div class="share-grid" id="shareGrid"></div>
    <button class="share-btn" id="shareWhatsapp">📤 Via WhatsApp teilen</button>
    <button class="modal-close" id="closeModal">Schliessen</button>
  </div>
</div>

<script>
// Frontend und Backend laufen auf derselben Cloudflare-Worker-URL,
// darum reichen relative Pfade – keine Konfiguration nötig.
const API_BASE = "";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const KEYBOARD_ROWS = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  ["ENTER", ..."ZXCVBNM".split(""), "DELETE"],
];

// 30 verschiedene Erfolgsmeldungen – bei jedem Sieg wird zufällig eine gezeigt
const SUCCESS_MESSAGES = [
  "Gschafft!", "Hammer gmacht!", "Mega stark!", "Sauglatt!", "Weltklasse!",
  "Bombig!", "Chapeau!", "Genial gmacht!", "Suuuper!", "Wahnsinn!",
  "Voll cool!", "Meisterhaft!", "Krass drauf!", "Es Träumli!", "Perfekt glöst!",
  "Huere guet!", "Gwaltig!", "Bravo!", "Fein gmacht!", "Absolute Klasse!",
  "Beeindruckend!", "Top Leistig!", "Sensationell!", "Yes, gschafft!", "Stark, stark!",
  "Nid schlecht!", "Volltreffer!", "Grandios!", "Zürcher Klasse!", "Tsüridle-Champion!",
];

let state = {
  wordId: null,
  attempt: 0,
  currentGuess: "",
  board: [], // Array von { letters, feedback }
  finished: false,
  keyStates: {}, // Buchstabe -> "correct" | "present" | "absent"
  startTime: null,
  elapsedMs: null,
};

const boardEl = document.getElementById("board");
const keyboardEl = document.getElementById("keyboard");
const messageEl = document.getElementById("message");
const modalEl = document.getElementById("successModal");
const successTitleEl = document.getElementById("successTitle");
const successTimeEl = document.getElementById("successTime");
const shareGridEl = document.getElementById("shareGrid");
const shareWhatsappBtn = document.getElementById("shareWhatsapp");
const closeModalBtn = document.getElementById("closeModal");

function storageKey(wordId) {
  return "tsuridle_state_" + wordId;
}

function loadLocalState(wordId) {
  try {
    const raw = localStorage.getItem(storageKey(wordId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveLocalState() {
  if (!state.wordId) return;
  localStorage.setItem(
    storageKey(state.wordId),
    JSON.stringify({
      attempt: state.attempt,
      board: state.board,
      finished: state.finished,
      keyStates: state.keyStates,
      startTime: state.startTime,
      elapsedMs: state.elapsedMs,
    })
  );
}

function setMessage(text, type) {
  messageEl.textContent = text || "";
  messageEl.className = type || "";
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < MAX_ATTEMPTS; r++) {
    const row = document.createElement("div");
    row.className = "row";
    const submitted = state.board[r];
    const isCurrent = r === state.attempt && !state.finished;
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      if (submitted) {
        tile.textContent = submitted.letters[c] || "";
        tile.classList.add("filled", submitted.feedback[c]);
      } else if (isCurrent) {
        const letter = state.currentGuess[c];
        if (letter) {
          tile.textContent = letter;
          tile.classList.add("filled");
        } else if (c === state.currentGuess.length) {
          // Cursor: zeigt an, wo der nächste Buchstabe hinkommt
          tile.classList.add("cursor");
        }
      }
      row.appendChild(tile);
    }
    boardEl.appendChild(row);
  }
}

function renderKeyboard() {
  keyboardEl.innerHTML = "";
  KEYBOARD_ROWS.forEach((rowKeys) => {
    const row = document.createElement("div");
    row.className = "kb-row";
    rowKeys.forEach((key) => {
      const btn = document.createElement("button");
      btn.className = "key" + (key.length > 1 ? " wide" : "");
      if (key === "ENTER") btn.classList.add("enter");
      if (key === "DELETE") btn.classList.add("delete");
      btn.textContent = key;
      const stateClass = state.keyStates[key];
      if (stateClass) btn.classList.add(stateClass);
      btn.addEventListener("click", () => handleKey(key));
      row.appendChild(btn);
    });
    keyboardEl.appendChild(row);
  });
}

function updateKeyStates(letters, feedback) {
  const priority = { absent: 0, present: 1, correct: 2 };
  letters.forEach((letter, i) => {
    const fb = feedback[i];
    const current = state.keyStates[letter];
    if (!current || priority[fb] > priority[current]) {
      state.keyStates[letter] = fb;
    }
  });
}

async function handleKey(key) {
  if (state.finished) return;
  if (key === "ENTER") {
    submitGuess();
  } else if (key === "DELETE") {
    state.currentGuess = state.currentGuess.slice(0, -1);
    renderBoard();
  } else if (/^[A-ZÄÖÜ]$/.test(key) && state.currentGuess.length < WORD_LENGTH) {
    if (state.startTime === null) state.startTime = Date.now(); // Timer startet beim 1. Buchstaben
    state.currentGuess += key;
    renderBoard();
  }
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m + ":" + String(s).padStart(2, "0");
}

function buildShareGrid() {
  const emojiMap = { correct: "🟩", present: "🟧", absent: "⬜" };
  return state.board
    .slice(0, state.attempt)
    .map((row) => row.feedback.map((f) => emojiMap[f]).join(" "))
    .join("\n");
}

function showSuccessModal() {
  const message = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
  successTitleEl.textContent = message;
  successTimeEl.textContent = state.elapsedMs !== null ? formatDuration(state.elapsedMs) : "–";
  const grid = buildShareGrid();
  shareGridEl.textContent = grid;

  const shareText =
    "Tsüridle ⏱ " + (state.elapsedMs !== null ? formatDuration(state.elapsedMs) : "?") +
    "\n" + grid + "\n\n" + window.location.href;
  shareWhatsappBtn.onclick = () => {
    window.open("https://wa.me/?text=" + encodeURIComponent(shareText), "_blank");
  };

  modalEl.classList.remove("hidden");
}

closeModalBtn.addEventListener("click", () => {
  modalEl.classList.add("hidden");
});

async function submitGuess() {
  if (state.currentGuess.length !== WORD_LENGTH) {
    setMessage("Zu wenig Buchstaben.", "error");
    shakeCurrentRow();
    return;
  }
  setMessage("");
  try {
    const res = await fetch(API_BASE + "/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: state.currentGuess, attempt: state.attempt + 1 }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Fehler bei der Anfrage.", "error");
      return;
    }
    if (!data.validWord) {
      setMessage("Kein gültiges Wort.", "error");
      shakeCurrentRow();
      return;
    }

    const letters = state.currentGuess.split("");
    state.board[state.attempt] = { letters, feedback: data.feedback };
    updateKeyStates(letters, data.feedback);
    state.attempt += 1;
    state.currentGuess = "";
    state.wordId = data.wordId;

    if (data.solved) {
      state.finished = true;
      state.elapsedMs = state.startTime !== null ? Date.now() - state.startTime : null;
      setMessage("");
      saveLocalState();
      renderBoard();
      renderKeyboard();
      showSuccessModal();
      return;
    } else if (state.attempt >= MAX_ATTEMPTS) {
      state.finished = true;
      setMessage(
        data.solution ? "Verloren – das Wort war: " + data.solution : "Verloren.",
        "error"
      );
    }

    saveLocalState();
    renderBoard();
    renderKeyboard();
  } catch (err) {
    setMessage("Verbindung zum Server fehlgeschlagen.", "error");
  }
}

function shakeCurrentRow() {
  const rows = boardEl.querySelectorAll(".row");
  const row = rows[state.attempt];
  if (!row) return;
  row.querySelectorAll(".tile").forEach((t) => t.classList.add("shake"));
  setTimeout(() => {
    row.querySelectorAll(".tile").forEach((t) => t.classList.remove("shake"));
  }, 350);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleKey("ENTER");
  else if (e.key === "Backspace") handleKey("DELETE");
  else if (/^[a-zA-ZäöüÄÖÜ]$/.test(e.key)) handleKey(e.key.toUpperCase());
});

async function init() {
  renderBoard();
  renderKeyboard();
  try {
    const res = await fetch(API_BASE + "/api/status");
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setMessage(data.error || "Aktuell ist kein Rätsel verfügbar.", "error");
      return;
    }
    state.wordId = data.wordId;
    const saved = loadLocalState(data.wordId);
    if (saved) {
      state.attempt = saved.attempt;
      state.board = saved.board;
      state.finished = saved.finished;
      state.keyStates = saved.keyStates || {};
      state.startTime = saved.startTime ?? null;
      state.elapsedMs = saved.elapsedMs ?? null;
      if (state.finished) {
        const last = state.board[state.board.length - 1];
        if (last && last.feedback.every((f) => f === "correct")) {
          showSuccessModal();
        } else {
          setMessage("Für heute schon gespielt.", "");
        }
      }
    }
    renderBoard();
    renderKeyboard();
  } catch (err) {
    setMessage("Verbindung zum Server fehlgeschlagen.", "error");
  }
}

init();
</script>
</body>
</html>
