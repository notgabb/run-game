const canvasWidth = 500;
const canvasHeight = 350;

const startLine = canvasWidth * 0.1;
const finishLine = canvasWidth * 0.95;

const borderWidth = 50;
const borderHeight = 20;
const padding = 5;

const carsPositions = []

const cars = 4;
const carSpacing = 15;
const carSize = 40;

let winner = -1;
let carImg;

let quizData = [];
let currentQuestion = null;
let currentTopic = "";
let quizAnswered = false;
let quizShown = false;

async function setup() {
  createCanvas(canvasWidth, canvasHeight);
  carImg = await loadImage("car.png");

  // carichiamo le domande da data.json
  await loadQuizData();

  document.getElementById("quiz-restart").addEventListener("click", restartRace);

  // crediti a geppeto, senza questo la macchina è sgranata
  drawingContext.imageSmoothingEnabled = false;

  frameRate(40);

  // tutte le macchine iniziano da 0
  for (let i = 0; i < cars; i++) {
    carsPositions.push(0)
  }
}

function draw() {
  background(40);

  drawStartLine();
  drawFinishLine();
  drawLateralBorders();

  if (winner == -1) {
    moveCars();
  }
  drawCars();

  if (winner != -1) {
    drawWinner();
    // quando una macchina vince, mostra una domanda a caso (una sola volta)
    if (!quizShown) {
      quizShown = true;
      askRandomQuestion();
    }
  }
}

function moveCars() {
  for (let i = 0; i < cars; i++) {
    let move = random(1, 5)

    carsPositions[i] = carsPositions[i] + move;

    if (carsPositions[i] + carSize > finishLine) {
      winner = i;
    }
  }
}

function drawStartLine() {
  fill(255, 255, 255);
  rect(startLine, 0, 5, height);
}

function drawFinishLine() {
  fill(255, 255, 255);
  rect(finishLine, 0, 5, height);
}

function drawLateralBorders() {
  for (let x = 0; x < width / borderWidth; x++) {
    if (x % 2 == 1)
      fill(255, 59, 59)
    else
      fill(255)

    rect(x * borderWidth, 0, borderWidth, borderHeight)
    rect(x * borderWidth, height - borderHeight, borderWidth, borderHeight)
  }
}

function getLaneCenterY(idx) {
  const trackTop = borderHeight + padding;
  const trackBottom = height - borderHeight - padding;
  const laneHeight = (trackBottom - trackTop) / cars;
  return trackTop + laneHeight * idx + laneHeight / 2;
}

function drawCars() {
  for (let i = 0; i < cars; i++) {
    drawCar(carsPositions[i], i)
  }
}

function drawCar(x, idx) {
  let halfCar = carSize / 2;
  let carCenterX = startLine - halfCar - padding + x;
  let carCenterY = getLaneCenterY(idx);

  // scritta del topic al centro della corsia (dietro la macchina)
  if (quizData.length > 0) {
    push();
    
    fill(255, 255, 255, 160);
    noStroke();
    
    textSize(12);
    textAlign(CENTER, CENTER);
    
    let label = `${idx + 1}: ${quizData[idx % quizData.length].topic}`;
    let labelX = (startLine + finishLine) / 2;
    
    text(label, labelX, carCenterY);
    pop();
  }

  // senza push e pop dovrei fare il translate e rotate di nuovo
  push();

  translate(carCenterX, carCenterY);
  rotate(PI / 2);

  imageMode(CENTER);
  image(carImg, 0, 0, carSize, carSize);

  pop();
}

function drawWinner() {
  push();
  
  noFill();
  stroke(255, 0, 0); // rosso
  strokeWeight(2);
  rectMode(CENTER);

  let halfCar = carSize / 2;
  let winningCenterX = startLine - halfCar - padding + carsPositions[winner];
  let winningCenterY = getLaneCenterY(winner);
  
  rect(winningCenterX, winningCenterY, carSize + padding * 2, carSize + padding);
  
  pop();
}

async function loadQuizData() {
  try {
    const res = await fetch("data.json");
    quizData = await res.json();
  } catch (e) {
    console.error("Impossibile caricare data.json", e);
    quizData = [];
  }
}

function askRandomQuestion() {
  if (!quizData || quizData.length === 0) {
    return;
  }

  // ogni macchina corrisponde a un topic: macchina 0 -> topic 0, ecc.
  // se ci sono più macchine che topic, si ricomincia da capo con il modulo
  const topicIndex = winner % quizData.length;
  const chosenTopic = quizData[topicIndex];
  const randomSet = random(chosenTopic.sets);

  currentTopic = chosenTopic.topic;
  // mescoliamo le risposte ogni volta così la corretta non è sempre allo stesso posto
  currentQuestion = shuffleAnswers(randomSet);
  quizAnswered = false;

  showQuestion();
}

// preso e modificato da https://stackoverflow.com/a/2450976
function shuffleAnswers(q) {
  const order = q.answers.map((_, i) => i);

  // algoritmo di Fisher-Yates
  let currentIndex = array.length;
  while (currentIndex != 0) {
    const j = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    title: q.title,
    answers: order.map((idx) => q.answers[idx]),
    correct: order.indexOf(q.correct),
  };
}

function showQuestion() {
  document.getElementById("quiz-winner").textContent =
    `Ha vinto la macchina ${winner + 1} (${currentTopic})! 🏁`;
  document.getElementById("quiz-topic").textContent =
    `Domanda bonus — ${currentTopic}`;
  document.getElementById("quiz-question").textContent =
    currentQuestion.title;

  const answersDiv = document.getElementById("quiz-answers");
  answersDiv.innerHTML = "";

  currentQuestion.answers.forEach((ans, i) => {
    const btn = document.createElement("button");
    btn.textContent = ans;
    btn.className = "quiz-answer";
    btn.addEventListener("click", () => checkAnswer(i, btn));
    answersDiv.appendChild(btn);
  });

  document.getElementById("quiz-feedback").textContent = "";
  document.getElementById("quiz-overlay").classList.remove("hidden");
}

function checkAnswer(i) {
  if (quizAnswered || !currentQuestion) {
    return;
  }
  quizAnswered = true;

  const buttons = document.querySelectorAll(".quiz-answer");
  const correctIndex = currentQuestion.correct;
  const feedback = document.getElementById("quiz-feedback");

  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === correctIndex) {
      btn.classList.add("correct");
    } else if (idx === i) {
      btn.classList.add("wrong");
    }
  });

  if (i === correctIndex) {
    feedback.textContent = "Risposta corretta! 🎉";
    feedback.className = "correct-text";
  } else {
    feedback.textContent =
      `Risposta sbagliata! Quella giusta era: "${currentQuestion.answers[correctIndex]}"`;
    feedback.className = "wrong-text";
  }
}

function restartRace() {
  for (let i = 0; i < cars; i++) {
    carsPositions[i] = 0;
  }
  winner = -1;
  currentQuestion = null;
  quizAnswered = false;
  quizShown = false;
  document.getElementById("quiz-overlay").classList.add("hidden");
}
