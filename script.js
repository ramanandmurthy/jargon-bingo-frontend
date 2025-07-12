
let board = [];
const boardSize = 4;
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
    cell.innerHTML = `${icon} <br>${phrase}`;
    boardDiv.appendChild(cell);
  });
}

function playSound() {
  const audio = new Audio("match.mp3");
  audio.play();
}

function checkWin() {
  const winPatterns = [];

  // Rows
  for (let r = 0; r < boardSize; r++) {
    winPatterns.push([...Array(boardSize).keys()].map(i => r * boardSize + i));
  }

  // Columns
  for (let c = 0; c < boardSize; c++) {
    winPatterns.push([...Array(boardSize).keys()].map(i => i * boardSize + c));
  }

  // Diagonals
  winPatterns.push([...Array(boardSize).keys()].map(i => i * (boardSize + 1)));
  winPatterns.push([...Array(boardSize).keys()].map(i => (i + 1) * (boardSize - 1)));

  return winPatterns.some(pattern => pattern.every(i => matched[i]));
}

function launchConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}

function markPhrase(transcript) {
  board.forEach((p, i) => {
    if (transcript.toLowerCase().includes(p)) {
      const cell = document.getElementById(`cell-${i}`);
      if (!cell.classList.contains("marked")) {
        cell.classList.add("marked");
        matched[i] = true;
        playSound();
        console.log(`✅ Matched: "${p}"`);
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

window.onload = createBoard;
