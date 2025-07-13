let phrases = [];
let matchedPhrases = new Set();
const board = document.getElementById("bingo-board");
const button = document.getElementById("start-button");

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
  const selected = shuffle([...phrases]).slice(0, 9);
  selected.forEach((phrase) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = phrase;
    cell.dataset.phrase = phrase;
    board.appendChild(cell);
  });
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
    alert("Speech recognition not supported in this browser.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  document.getElementById("waveform").style.display = "flex";
  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      matchAgainstBoard(transcript);
    }
  };
  recognition.start();
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
  const combos = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const combo of combos) {
    if (combo.every(i => cells[i].classList.contains("marked"))) {
      launchConfetti();
      break;
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
button.addEventListener("click", async () => {
  if (phrases.length === 0) await fetchPhrases();
  createBoard();
  startRecognition();
});