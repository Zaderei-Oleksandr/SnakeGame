const GRID_SIZE = 20;
const BASE_SPEED_MS = 160;
const MIN_SPEED_MS = 75;
const SPEED_STEP_MS = 4;
const STORAGE_KEY = "snake-high-score";

const MODE_SINGLE = "single";
const MODE_TWO = "two";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const controlsHintEl = document.getElementById("controlsHint");

const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlayTitle");
const overlayTextEl = document.getElementById("overlayText");
const overlayButtonEl = document.getElementById("overlayButton");
const modeButtonsEl = document.getElementById("modeButtons");
const onePlayerBtn = document.getElementById("onePlayerBtn");
const twoPlayerBtn = document.getElementById("twoPlayerBtn");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const touchButtons = Array.from(document.querySelectorAll("[data-dir]"));

const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let gameMode = null;
let snakeOne = [];
let snakeTwo = [];
let currentDirectionOne = directions.right;
let nextDirectionOne = directions.right;
let currentDirectionTwo = directions.left;
let nextDirectionTwo = directions.left;
let food = null;

let playerOneScore = 0;
let playerTwoScore = 0;
let totalScore = 0;
let highScore = 0;

let gameLoopId = null;
let currentSpeed = BASE_SPEED_MS;
let isRunning = false;
let isPaused = false;
let overlayAction = null;

function isTwoPlayerMode() {
  return gameMode === MODE_TWO;
}

function cellsEqual(a, b) {
  return Boolean(a && b) && a.x === b.x && a.y === b.y;
}

function snakeHasCell(snake, cell) {
  return snake.some((segment) => cellsEqual(segment, cell));
}

function createSingleSnake() {
  const center = Math.floor(GRID_SIZE / 2);
  return [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];
}

function createTwoPlayerSnakeOne() {
  const y = Math.floor(GRID_SIZE / 2);
  return [
    { x: 5, y },
    { x: 4, y },
    { x: 3, y },
  ];
}

function createTwoPlayerSnakeTwo() {
  const y = Math.floor(GRID_SIZE / 2);
  return [
    { x: GRID_SIZE - 6, y },
    { x: GRID_SIZE - 5, y },
    { x: GRID_SIZE - 4, y },
  ];
}

function createFood() {
  const occupiedCells = [...snakeOne, ...snakeTwo];
  if (occupiedCells.length >= GRID_SIZE * GRID_SIZE) {
    return null;
  }

  let nextFood = null;
  do {
    nextFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snakeHasCell(occupiedCells, nextFood));
  return nextFood;
}

function readHighScore() {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function setHighScore(newHighScore) {
  highScore = newHighScore;
  highScoreEl.textContent = String(highScore);
  try {
    localStorage.setItem(STORAGE_KEY, String(highScore));
  } catch {
    // Ignore localStorage write errors in restrictive environments.
  }
}

function updateTotalScore() {
  totalScore = playerOneScore + playerTwoScore;
  scoreEl.textContent = String(totalScore);
  if (totalScore > highScore) {
    setHighScore(totalScore);
  }
}

function setControlsHint() {
  if (gameMode === MODE_SINGLE) {
    controlsHintEl.textContent = "Стрілки / WASD, пробіл для паузи";
    return;
  }
  if (gameMode === MODE_TWO) {
    controlsHintEl.textContent = "P1: WASD, P2: стрілки, пробіл для паузи";
    return;
  }
  controlsHintEl.textContent = "Обери режим гри: 1 player або 2 players";
}

function showOverlay({
  title,
  text,
  buttonText = "",
  showButton = false,
  showModeButtons = false,
  action = null,
}) {
  overlayTitleEl.textContent = title;
  overlayTextEl.textContent = text;

  overlayButtonEl.textContent = buttonText;
  overlayButtonEl.classList.toggle("hidden", !showButton);
  modeButtonsEl.classList.toggle("hidden", !showModeButtons);
  overlayAction = action;
  overlayEl.classList.remove("hidden");
}

function hideOverlay() {
  overlayAction = null;
  overlayEl.classList.add("hidden");
}

function stopGameLoop() {
  if (gameLoopId !== null) {
    clearInterval(gameLoopId);
    gameLoopId = null;
  }
}

function startGameLoop() {
  stopGameLoop();
  gameLoopId = setInterval(tick, currentSpeed);
}

function resetPreviewState() {
  snakeOne = createSingleSnake();
  snakeTwo = [];
  currentDirectionOne = directions.right;
  nextDirectionOne = directions.right;
  currentDirectionTwo = directions.left;
  nextDirectionTwo = directions.left;
  playerOneScore = 0;
  playerTwoScore = 0;
  updateTotalScore();
  currentSpeed = BASE_SPEED_MS;
  food = createFood();
}

function resetStateForMode(mode) {
  gameMode = mode;

  if (mode === MODE_TWO) {
    snakeOne = createTwoPlayerSnakeOne();
    snakeTwo = createTwoPlayerSnakeTwo();
    currentDirectionOne = directions.right;
    nextDirectionOne = directions.right;
    currentDirectionTwo = directions.left;
    nextDirectionTwo = directions.left;
  } else {
    snakeOne = createSingleSnake();
    snakeTwo = [];
    currentDirectionOne = directions.right;
    nextDirectionOne = directions.right;
    currentDirectionTwo = directions.left;
    nextDirectionTwo = directions.left;
  }

  playerOneScore = 0;
  playerTwoScore = 0;
  updateTotalScore();
  currentSpeed = BASE_SPEED_MS;
  food = createFood();
  setControlsHint();
}

function showModeSelection() {
  isRunning = false;
  isPaused = false;
  pauseBtn.textContent = "Pause";
  stopGameLoop();
  gameMode = null;
  setControlsHint();
  resetPreviewState();
  draw();
  showOverlay({
    title: "Обери режим",
    text: "Як хочеш грати: 1 player чи 2 players?",
    showModeButtons: true,
  });
}

function startGameWithMode(mode) {
  resetStateForMode(mode);
  isRunning = true;
  isPaused = false;
  pauseBtn.textContent = "Pause";
  hideOverlay();
  startGameLoop();
  draw();
}

function pauseGame() {
  if (!isRunning) {
    return;
  }

  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "Resume" : "Pause";
  if (isPaused) {
    stopGameLoop();
    showOverlay({
      title: "Paused",
      text: "Натисни Resume або пробіл, щоб продовжити.",
      buttonText: "Resume",
      showButton: true,
      action: "resume",
    });
    return;
  }

  hideOverlay();
  startGameLoop();
}

function restartGame() {
  showModeSelection();
}

function finishSinglePlayerGame() {
  isRunning = false;
  isPaused = false;
  pauseBtn.textContent = "Pause";
  stopGameLoop();
  showOverlay({
    title: "Game Over",
    text: `Твій результат: ${totalScore}`,
    buttonText: "Нова гра",
    showButton: true,
    action: "mode-select",
  });
}

function finishTwoPlayerGame(playerOneDead, playerTwoDead) {
  isRunning = false;
  isPaused = false;
  pauseBtn.textContent = "Pause";
  stopGameLoop();

  let resultText = "";
  if (playerOneDead && playerTwoDead) {
    resultText = `Нічия. Обидві змійки зіткнулися. Сумарні очки: ${totalScore}`;
  } else if (playerOneDead) {
    resultText = `P1 програв. Переміг P2. Сумарні очки: ${totalScore}`;
  } else {
    resultText = `P2 програв. Переміг P1. Сумарні очки: ${totalScore}`;
  }

  showOverlay({
    title: "Round Over",
    text: resultText,
    buttonText: "Нова гра",
    showButton: true,
    action: "mode-select",
  });
}

function finishFullBoardGame() {
  isRunning = false;
  isPaused = false;
  pauseBtn.textContent = "Pause";
  stopGameLoop();

  const title = isTwoPlayerMode() ? "Поле заповнене" : "Перемога";
  const text = isTwoPlayerMode()
    ? `Нічия. Поле повністю заповнене. Сумарні очки: ${totalScore}`
    : `Ти заповнив усе поле. Результат: ${totalScore}`;

  showOverlay({
    title,
    text,
    buttonText: "Нова гра",
    showButton: true,
    action: "mode-select",
  });
}

function trySetDirection(playerId, direction) {
  if (!direction || !isRunning || isPaused) {
    return;
  }

  if (playerId === 1) {
    const isReverse =
      direction.x === -currentDirectionOne.x && direction.y === -currentDirectionOne.y;
    if (!isReverse) {
      nextDirectionOne = direction;
    }
    return;
  }

  if (!isTwoPlayerMode()) {
    return;
  }

  const isReverse =
    direction.x === -currentDirectionTwo.x && direction.y === -currentDirectionTwo.y;
  if (!isReverse) {
    nextDirectionTwo = direction;
  }
}

function keyToSingleDirection(event) {
  if (event.code === "ArrowUp" || event.code === "KeyW") return directions.up;
  if (event.code === "ArrowDown" || event.code === "KeyS") return directions.down;
  if (event.code === "ArrowLeft" || event.code === "KeyA") return directions.left;
  if (event.code === "ArrowRight" || event.code === "KeyD") return directions.right;

  const normalized = typeof event.key === "string" ? event.key.toLowerCase() : "";
  if (normalized === "arrowup" || normalized === "w") return directions.up;
  if (normalized === "arrowdown" || normalized === "s") return directions.down;
  if (normalized === "arrowleft" || normalized === "a") return directions.left;
  if (normalized === "arrowright" || normalized === "d") return directions.right;
  return null;
}

function keyToPlayerOneDirection(event) {
  if (event.code === "KeyW") return directions.up;
  if (event.code === "KeyS") return directions.down;
  if (event.code === "KeyA") return directions.left;
  if (event.code === "KeyD") return directions.right;

  const normalized = typeof event.key === "string" ? event.key.toLowerCase() : "";
  if (normalized === "w") return directions.up;
  if (normalized === "s") return directions.down;
  if (normalized === "a") return directions.left;
  if (normalized === "d") return directions.right;
  return null;
}

function keyToPlayerTwoDirection(event) {
  if (event.code === "ArrowUp") return directions.up;
  if (event.code === "ArrowDown") return directions.down;
  if (event.code === "ArrowLeft") return directions.left;
  if (event.code === "ArrowRight") return directions.right;

  const normalized = typeof event.key === "string" ? event.key.toLowerCase() : "";
  if (normalized === "arrowup") return directions.up;
  if (normalized === "arrowdown") return directions.down;
  if (normalized === "arrowleft") return directions.left;
  if (normalized === "arrowright") return directions.right;
  return null;
}

function handleInput(event) {
  const normalized = typeof event.key === "string" ? event.key.toLowerCase() : "";
  if (event.code === "Space" || event.key === " " || event.code === "KeyP" || normalized === "p") {
    event.preventDefault();
    pauseGame();
    return;
  }

  if (!isRunning || isPaused) {
    return;
  }

  if (isTwoPlayerMode()) {
    const p1Direction = keyToPlayerOneDirection(event);
    const p2Direction = keyToPlayerTwoDirection(event);
    if (p1Direction || p2Direction) {
      event.preventDefault();
      if (p1Direction) {
        trySetDirection(1, p1Direction);
      }
      if (p2Direction) {
        trySetDirection(2, p2Direction);
      }
    }
    return;
  }

  const singleDirection = keyToSingleDirection(event);
  if (singleDirection) {
    event.preventDefault();
    trySetDirection(1, singleDirection);
  }
}

function hitsWall(cell) {
  return cell.x < 0 || cell.y < 0 || cell.x >= GRID_SIZE || cell.y >= GRID_SIZE;
}

function bodyForCollision(snake, grows) {
  return grows ? snake : snake.slice(0, -1);
}

function tick() {
  currentDirectionOne = nextDirectionOne;
  const nextHeadOne = {
    x: snakeOne[0].x + currentDirectionOne.x,
    y: snakeOne[0].y + currentDirectionOne.y,
  };

  let nextHeadTwo = null;
  if (isTwoPlayerMode()) {
    currentDirectionTwo = nextDirectionTwo;
    nextHeadTwo = {
      x: snakeTwo[0].x + currentDirectionTwo.x,
      y: snakeTwo[0].y + currentDirectionTwo.y,
    };
  }

  const playerOneWillEat = cellsEqual(nextHeadOne, food);
  const playerTwoWillEat = isTwoPlayerMode() && cellsEqual(nextHeadTwo, food);

  const playerOneBody = bodyForCollision(snakeOne, playerOneWillEat);
  const playerTwoBody = isTwoPlayerMode() ? bodyForCollision(snakeTwo, playerTwoWillEat) : [];

  let playerOneDead = hitsWall(nextHeadOne) || snakeHasCell(playerOneBody, nextHeadOne);
  let playerTwoDead = false;

  if (isTwoPlayerMode()) {
    playerOneDead = playerOneDead || snakeHasCell(playerTwoBody, nextHeadOne);
    playerTwoDead =
      hitsWall(nextHeadTwo) ||
      snakeHasCell(playerTwoBody, nextHeadTwo) ||
      snakeHasCell(playerOneBody, nextHeadTwo);

    if (cellsEqual(nextHeadOne, nextHeadTwo)) {
      playerOneDead = true;
      playerTwoDead = true;
    }
  }

  if (isTwoPlayerMode()) {
    if (playerOneDead || playerTwoDead) {
      finishTwoPlayerGame(playerOneDead, playerTwoDead);
      return;
    }
  } else if (playerOneDead) {
    finishSinglePlayerGame();
    return;
  }

  snakeOne.unshift(nextHeadOne);
  if (playerOneWillEat) {
    playerOneScore += 1;
  } else {
    snakeOne.pop();
  }

  if (isTwoPlayerMode()) {
    snakeTwo.unshift(nextHeadTwo);
    if (playerTwoWillEat) {
      playerTwoScore += 1;
    } else {
      snakeTwo.pop();
    }
  }

  if (playerOneWillEat || playerTwoWillEat) {
    updateTotalScore();
    food = createFood();
    if (!food) {
      draw();
      finishFullBoardGame();
      return;
    }
    currentSpeed = Math.max(MIN_SPEED_MS, BASE_SPEED_MS - totalScore * SPEED_STEP_MS);
    startGameLoop();
  }

  draw();
}

function drawGrid() {
  const cell = canvas.width / GRID_SIZE;
  ctx.save();
  ctx.strokeStyle = "rgba(125, 162, 215, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID_SIZE; i += 1) {
    const pos = i * cell;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCell(x, y, color, radius = 0.2) {
  const cell = canvas.width / GRID_SIZE;
  const px = x * cell;
  const py = y * cell;
  const r = cell * radius;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(px + r, py);
  ctx.arcTo(px + cell, py, px + cell, py + cell, r);
  ctx.arcTo(px + cell, py + cell, px, py + cell, r);
  ctx.arcTo(px, py + cell, px, py, r);
  ctx.arcTo(px, py, px + cell, py, r);
  ctx.closePath();
  ctx.fill();
}

function drawSnake(snake, headColor, bodyColor) {
  snake.forEach((segment, index) => {
    const isHead = index === 0;
    drawCell(segment.x, segment.y, isHead ? headColor : bodyColor, isHead ? 0.35 : 0.22);
  });
}

function draw() {
  ctx.fillStyle = "#061120";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  if (food) {
    drawCell(food.x, food.y, "#ff7b95", 0.45);
  }

  if (snakeTwo.length > 0) {
    drawSnake(snakeTwo, "#ffcf73", "#ff8f3d");
  }

  drawSnake(snakeOne, "#8bffbd", "#52d18a");
}

startBtn.addEventListener("click", () => {
  if (!isRunning) {
    showModeSelection();
  }
});
pauseBtn.addEventListener("click", pauseGame);
restartBtn.addEventListener("click", restartGame);

overlayButtonEl.addEventListener("click", () => {
  if (overlayAction === "resume") {
    pauseGame();
    return;
  }
  if (overlayAction === "mode-select") {
    showModeSelection();
  }
});

onePlayerBtn.addEventListener("click", () => startGameWithMode(MODE_SINGLE));
twoPlayerBtn.addEventListener("click", () => startGameWithMode(MODE_TWO));

touchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!isRunning || isPaused || gameMode !== MODE_SINGLE) {
      return;
    }
    const direction = directions[button.dataset.dir];
    trySetDirection(1, direction);
  });
});

window.addEventListener("keydown", handleInput, { passive: false });

highScore = readHighScore();
highScoreEl.textContent = String(highScore);
showModeSelection();
