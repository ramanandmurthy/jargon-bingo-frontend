
let board = [];
const boardSize = 3;
let matched = Array(boardSize * boardSize).fill(false);

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function createBoard() {
  const phrases = Object.keys(phraseStyles);
  shuffle(phrases);
  board = phrases.slice(0, boardSize * boardSize);
  const boardDiv = document.getElementById("bingo-board");
  boardDiv.innerHTML = "";
  matched.fill(false);
  board.forEach((phrase, index) => {
    const { icon, color } = phraseStyles[phrase];
    const cell = document.createElement("div");
    cell.className = "bingo-cell";
    cell.id = `cell-${index}`;
    cell.style.backgroundColor = color;
    cell.innerHTML = `<div class='checkmark'>✅</div>${icon} <br>${phrase}`;
    boardDiv.appendChild(cell);
  });
}

function playSound() {
  const audio = new Audio("match.mp3");
  audio.play();
}

function checkWin() {
  const winPatterns = [];

  for (let r = 0; r < boardSize; r++) {
    winPatterns.push([...Array(boardSize).keys()].map(i => r * boardSize + i));
  }

  for (let c = 0; c < boardSize; c++) {
    winPatterns.push([...Array(boardSize).keys()].map(i => i * boardSize + c));
  }

  winPatterns.push([...Array(boardSize).keys()].map(i => i * (boardSize + 1)));
  winPatterns.push([...Array(boardSize).keys()].map(i => (i + 1) * (boardSize - 1)));

  return winPatterns.some(pattern => pattern.every(i => matched[i]));
}

function launchConfetti() {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

function markPhrase(transcript) {
  board.forEach((p, i) => {
    if (transcript.toLowerCase().includes(p)) {
      const cell = document.getElementById(`cell-${i}`);
      if (!cell.classList.contains("marked")) {
        cell.classList.add("marked");
        matched[i] = true;
        playSound();
        if (checkWin()) {
          launchConfetti();
          setTimeout(() => alert("🎉 BINGO!"), 200);
        }
      }
    }
  });
}

async function sendToServer(blob) {
  const formData = new FormData();
  formData.append("audio", blob, "audio.wav");
  const status = document.getElementById("status");
  status.textContent = "Status: Transcribing...";

  try {
    const response = await fetch("https://jargon-bingo-backend.onrender.com/transcribe", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    if (data.transcript) {
      markPhrase(data.transcript);
      status.textContent = "Status: Listening...";
    } else {
      status.textContent = "Status: Error during transcription.";
    }
  } catch (err) {
    console.error("Error:", err);
    status.textContent = "Status: Failed to reach server.";
  }
}

function toggleRecording() {
  const waveform = document.getElementById("waveform-container");
  if (window.recording) {
    window.mediaRecorder.stop();
    window.recording = false;
    waveform.style.visibility = "hidden";
    document.getElementById("status").textContent = "Status: Stopped";
  } else {
    navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
    }).then(stream => {
      waveform.style.visibility = "visible";
      window.mediaRecorder = new MediaRecorder(stream);
      window.audioChunks = [];
      window.mediaRecorder.ondataavailable = event => window.audioChunks.push(event.data);
      window.mediaRecorder.onstop = () => {
        const blob = new Blob(window.audioChunks, { type: "audio/wav" });
        window.audioChunks = [];
        sendToServer(blob);
        if (window.recording) window.mediaRecorder.start();
        setTimeout(() => {
          if (window.recording) window.mediaRecorder.stop();
        }, 5000);
      };
      window.recording = true;
      window.mediaRecorder.start();
      document.getElementById("status").textContent = "Status: Listening...";
      setTimeout(() => {
        if (window.recording) window.mediaRecorder.stop();
      }, 5000);
    }).catch(err => {
      console.error("Mic access denied:", err);
      document.getElementById("status").textContent = "Status: Mic access denied.";
    });
  }
}

window.onload = () => {
  createBoard();
  const guideline = document.createElement("div");
  guideline.id = "guidelines";
  guideline.innerHTML = "🏆 Get BINGO by matching a full row, column, or diagonal of corporate jargon.";
  document.body.appendChild(guideline);
};

let timerInterval;
let timeLeft = 120;
let matchedPhrases = [];

function updateTimerDisplay() {
  const timerEl = document.getElementById("timer");
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  timerEl.textContent = `⏱️ Time Left: ${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function endGame() {
  window.recording = false;
  clearInterval(timerInterval);
  document.getElementById("waveform-container").style.visibility = "hidden";
  document.getElementById("timer").textContent = "";
  document.getElementById("status").textContent = "⏹ Game Over";

  const summaryDiv = document.getElementById("summary");
  summaryDiv.innerHTML = "<h2>⏳ Time’s Up!</h2><p>You matched the following phrases:</p>";
  const ul = document.createElement("ul");
  matchedPhrases.forEach(phrase => {
    const li = document.createElement("li");
    li.textContent = "✅ " + phrase;
    ul.appendChild(li);
  });
  summaryDiv.appendChild(ul);
  const btn = document.createElement("button");
  btn.textContent = "🔁 Play Again";
  btn.onclick = () => location.reload();
  summaryDiv.appendChild(btn);
  summaryDiv.style.display = "block";
}

function startGame() {
  matchedPhrases = [];
  timeLeft = 120;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
  toggleRecording();
}

function markPhrase(transcript) {
  board.forEach((p, i) => {
    if (transcript.toLowerCase().includes(p)) {
      const cell = document.getElementById(`cell-${i}`);
      if (!cell.classList.contains("marked")) {
        cell.classList.add("marked");
        matched[i] = true;
        matchedPhrases.push(p);
        playSound();
        if (checkWin()) {
          launchConfetti();
          setTimeout(() => alert("🎉 BINGO!"), 200);
        }
      }
    }
  });
}

let micAccessGranted = false;
let hasStarted = false;

function showError(message) {
  const errorDiv = document.getElementById("error-message");
  errorDiv.textContent = message;
}

function clearError() {
  const errorDiv = document.getElementById("error-message");
  errorDiv.textContent = "";
}

async function startGame() {
  if (!hasStarted) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });
      micAccessGranted = true;
      clearError();
      document.getElementById("start-button").textContent = "⏹ Stop Game";
      document.getElementById("start-button").classList.add("stop");
      hasStarted = true;
      timeLeft = 120;
      updateTimerDisplay();
      timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
          endGame();
        }
      }, 1000);
      toggleRecordingWithStream(stream);
    } catch (err) {
      micAccessGranted = false;
      showError("🚫 Microphone access is required to play.");
    }
  } else {
    endGame();
  }
}

function toggleRecordingWithStream(stream) {
  const waveform = document.getElementById("waveform-container");
  waveform.style.visibility = "visible";
  window.mediaRecorder = new MediaRecorder(stream);
  window.audioChunks = [];
  window.mediaRecorder.ondataavailable = event => window.audioChunks.push(event.data);
  window.mediaRecorder.onstop = () => {
    const blob = new Blob(window.audioChunks, { type: "audio/wav" });
    window.audioChunks = [];
    sendToServer(blob);
    if (window.recording) window.mediaRecorder.start();
    setTimeout(() => {
      if (window.recording) window.mediaRecorder.stop();
    }, 5000);
  };
  window.recording = true;
  window.mediaRecorder.start();
  document.getElementById("status").textContent = "Status: Listening...";
  setTimeout(() => {
    if (window.recording) window.mediaRecorder.stop();
  }, 5000);
}

function endGame() {
  window.recording = false;
  clearInterval(timerInterval);
  document.getElementById("waveform-container").style.visibility = "hidden";
  document.getElementById("timer").textContent = "";
  document.getElementById("status").textContent = "⏹ Game Over";
  document.getElementById("start-button").textContent = "▶️ Start Game";
  document.getElementById("start-button").classList.remove("stop");
  hasStarted = false;

  const summaryDiv = document.getElementById("summary");
  summaryDiv.innerHTML = "<h2>⏳ Time’s Up!</h2><p>You matched the following phrases:</p>";
  const ul = document.createElement("ul");
  matchedPhrases.forEach(phrase => {
    const li = document.createElement("li");
    li.textContent = "✅ " + phrase;
    ul.appendChild(li);
  });
  summaryDiv.appendChild(ul);
  const btn = document.createElement("button");
  btn.textContent = "🔁 Play Again";
  btn.onclick = () => location.reload();
  summaryDiv.appendChild(btn);
  summaryDiv.style.display = "block";
}

function updateCounterDisplay() {
  const counter = document.getElementById("counter");
  counter.textContent = `✅ ${matchedPhrases.length}/9 phrases matched`;
}

function showOnboarding() {
  const div = document.createElement("div");
  div.id = "onboarding";
  div.innerHTML = "🎙 Speak during your next meeting. Match buzzwords to win!<br><em>(Allow mic access to play)</em>";
  document.body.insertBefore(div, document.getElementById("start-button"));
  setTimeout(() => div.remove(), 5000);
}

function markPhrase(transcript) {
  board.forEach((p, i) => {
    if (transcript.toLowerCase().includes(p)) {
      const cell = document.getElementById(`cell-${i}`);
      if (!cell.classList.contains("marked")) {
        cell.classList.add("marked");
        matched[i] = true;
        matchedPhrases.push(p);
        playSound();
        updateCounterDisplay();
        if (checkWin()) {
          launchConfetti();
          setTimeout(() => alert("🎉 BINGO!"), 200);
        }
      }
    }
  });
}

window.onload = () => {
  createBoard();
  showOnboarding();
  const counter = document.createElement("div");
  counter.id = "counter";
  counter.textContent = "✅ 0/9 phrases matched";
  document.getElementById("timer").after(counter);
  const guideline = document.createElement("div");
  guideline.id = "guidelines";
  guideline.innerHTML = "🏆 Get BINGO by matching a full row, column, or diagonal of corporate jargon.";
  document.body.appendChild(guideline);
};
