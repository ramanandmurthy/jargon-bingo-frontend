let phrases = [];
let matchedPhrases = new Set();
let recognition;
let timerInterval;
let timeLeft = 120;
let bingoTriggered = false;

const board = document.getElementById("bingo-board");
const button = document.getElementById("start-button");
const waveform = document.getElementById("waveform");

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}
function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function phraseMatch(input, phrase) {
  const tokensInput = normalize(input).split(" ");
  const tokensPhrase = normalize(phrase).split(" ");
  const overlap = tokensPhrase.filter(t => tokensInput.includes(t)).length;
  return overlap >= Math.ceil(tokensPhrase.length * 0.6);
}
function createBoard() {
  board.innerHTML = '';
  matchedPhrases.clear();
  bingoTriggered = false;
  const selected = shuffle([...phrases]).slice(0, 9);
  selected.forEach((phrase) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.tabIndex = 0;
    cell.textContent = phrase;
    cell.dataset.phrase = phrase;
    board.appendChild(cell);
  });
  updateCounter();
}
async function fetchPhrases() {
  try {
    const res = await fetch("./phrases.json");
    phrases = await res.json();
  } catch {
    phrases = ["Synergy", "Circle back", "Touch base"];
  }
}
function startRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Your browser does not support speech recognition");
    return;
  }
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  waveform.style.display = "flex";

  recognition.onresult = (event) => {
    waveform.classList.add("active");
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      document.getElementById("transcript-log").textContent += transcript + "\n";
      matchAgainstBoard(transcript);
    }
    setTimeout(() => waveform.classList.remove("active"), 500);
  };

  recognition.onerror = (event) => {
    console.error("Speech error:", event.error);
    alert("Speech recognition error: " + event.error);
    stopGame();
  };

  recognition.onend = () => {
    waveform.style.display = "none";
  };

  recognition.start();
}
function stopRecognition() {
  if (recognition) recognition.stop();
  waveform.style.display = "none";
}
function updateCounter() {
  const counter = document.getElementById("counter");
  counter.textContent = `✅ ${matchedPhrases.size}/9 phrases matched`;
}
function matchAgainstBoard(transcript) {
  const cells = document.querySelectorAll(".cell");
  cells.forEach(cell => {
    const phrase = cell.dataset.phrase;
    if (!matchedPhrases.has(phrase) && phraseMatch(transcript, phrase)) {
      cell.classList.add("marked");
      matchedPhrases.add(phrase);
    }
  });
  updateCounter();

  const combos = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const combo of combos) {
    if (!bingoTriggered && combo.every(i => cells[i].classList.contains("marked"))) {
      bingoTriggered = true;
      launchConfetti();
    }
  }
}
function launchConfetti() {
  if (window.confetti) {
    window.confetti({ particleCount: 150, spread: 60, origin: { y: 0.6 } });
    const audio = document.getElementById("bingo-sound");
    if (audio) audio.play();
  }
}
function startTimer() {
  timeLeft = 120;
  const timer = document.getElementById("timer");
  timer.textContent = "⏳ 2:00";
  timerInterval = setInterval(() => {
    timeLeft--;
    const mins = Math.floor(timeLeft / 60);
    const secs = String(timeLeft % 60).padStart(2, '0');
    timer.textContent = `⏳ ${mins}:${secs}`;
    if (timeLeft <= 0) {
      stopGame();
    }
  }, 1000);
}
function stopTimer() {
  clearInterval(timerInterval);
}
function showSummary() {
  const summary = document.getElementById("summary");
  summary.innerHTML = "<h2>📝 Matched Phrases:</h2><ul>" +
    Array.from(matchedPhrases).map(p => `<li>${p}</li>`).join("") +
    "</ul><button onclick='location.reload()'>🔁 Play Again</button>";
}
function startGame() {
  fetchPhrases().then(() => {
    createBoard();
    startRecognition();
    startTimer();
    document.getElementById("transcript-log").textContent = "";
    button.textContent = "🛑 Stop Game";
    button.style.background = "#f44336";
    button.onclick = stopGame;
  });
}
function stopGame() {
  stopRecognition();
  stopTimer();
  showSummary();
  button.disabled = true;
}
button.onclick = startGame;