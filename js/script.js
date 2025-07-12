
const phraseStyles = {
  "circle back": { icon: "🔁", color: "#FFF9C4" },
  "synergy": { icon: "🤝", color: "#C8E6C9" },
  "move the needle": { icon: "📈", color: "#BBDEFB" },
  "deep dive": { icon: "🧠", color: "#F0F4C3" },
  "low-hanging fruit": { icon: "🍎", color: "#FFE0B2" },
  "value add": { icon: "💎", color: "#FFECB3" },
  "alignment": { icon: "🧭", color: "#F8BBD0" },
  "touch base": { icon: "📞", color: "#DCEDC8" },
  "win-win": { icon: "🏆", color: "#D1C4E9" }
};

const secureToken = "XYZ-12345-SECURE-TOKEN";
let matchedPhrases = [];
let transcriptLog = [];
let matched = Array(9).fill(false);
let hasStarted = false;
let timeLeft = 120;
let timerInterval = null;

function sanitize(text) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function updateTranscriptDisplay(text) {
  const log = document.getElementById("transcript-log");
  transcriptLog.push(text);
  if (log) log.textContent = transcriptLog.slice(-3).join("\n");
}

function updateCounterDisplay() {
  const counter = document.getElementById("counter");
  counter.textContent = `✅ ${matchedPhrases.length}/9 phrases matched`;
}

function playSound() {
  const audio = new Audio("assets/match.mp3");
  audio.play();
}

function markPhrase(transcript) {
  board.forEach((p, i) => {
    if (transcript.toLowerCase().includes(p)) {
      const cell = document.getElementById(`cell-${i}`);
      if (!cell.classList.contains("marked")) {
        cell.classList.add("marked");
        matched[i] = true;
        matchedPhrases.push(p);
        updateCounterDisplay();
        playSound();
        if (checkWin()) {
          confetti();
          setTimeout(() => alert("🎉 BINGO!"), 100);
        }
      }
    }
  });
}

function checkWin() {
  const winPatterns = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  return winPatterns.some(pattern => pattern.every(i => matched[i]));
}

function sendToServer(blob) {
  const formData = new FormData();
  formData.append("audio", blob, "audio.wav");
  const status = document.getElementById("status");
  status.textContent = "Transcribing...";

  fetch("https://jargon-bingo-backend.onrender.com/transcribe", {
    method: "POST",
    headers: {
      "X-Client-Token": secureToken
    },
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.transcript) {
      updateTranscriptDisplay(data.transcript);
      markPhrase(data.transcript);
      status.textContent = "Listening...";
    } else {
      status.textContent = "Error transcribing";
    }
  })
  .catch(err => {
    console.error(err);
    status.textContent = "Server error";
  });
}

function startGame() {
  navigator.permissions.query({ name: 'microphone' }).then(result => {
    if (result.state === 'denied') {
      alert("🎤 Microphone permission is blocked. Please allow mic access in browser settings.");
      return;
    }

    navigator.mediaDevices.getUserMedia({
      audio: true
    }).then(stream => {
      document.getElementById("start-button").disabled = true;
      hasStarted = true;
      timeLeft = 120;
      updateCounterDisplay();
      timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById("timer").textContent = `⏱️ Time left: ${timeLeft}s`;
        if (timeLeft <= 0) {
          endGame();
        }
      }, 1000);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => {
        const blob = new Blob([e.data], { type: 'audio/wav' });
        sendToServer(blob);
      };
      mediaRecorder.start();
      setInterval(() => {
        if (mediaRecorder.state === "recording") mediaRecorder.stop();
        if (mediaRecorder.state !== "inactive") mediaRecorder.start();
      }, 5000);
    });
  });
}

function endGame() {
  clearInterval(timerInterval);
  document.getElementById("timer").textContent = "⏹️ Game Over";
  const summary = document.getElementById("summary");
  summary.innerHTML = "<h3>You matched:</h3><ul>" +
    matchedPhrases.map(p => `<li>✅ ${sanitize(p)}</li>`).join("") +
    "</ul><p>Games played: " + (parseInt(localStorage.getItem("games") || 0) + 1) + "</p>";
  localStorage.setItem("games", (parseInt(localStorage.getItem("games") || 0) + 1).toString());
}

window.onload = () => {
  window.board = Object.keys(phraseStyles).slice(0, 9);
  const boardContainer = document.getElementById("bingo-board");
  board.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "bingo-cell";
    div.id = `cell-${i}`;
    div.style.backgroundColor = phraseStyles[p].color;
    div.innerHTML = `${phraseStyles[p].icon}<br>${p}`;
    boardContainer.appendChild(div);
  });
  document.getElementById("start-button").addEventListener("click", startGame);
};
