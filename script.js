const GRID_SIZE = 20;
const BASE_SPEED_MS = 160;
const MIN_SPEED_MS = 75;
const SPEED_STEP_MS = 4;
const STORAGE_KEY = "snake-high-score";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlayTitle");
const overlayTextEl = document.getElementById("overlayText");
const overlayButtonEl = document.getElementById("overlayButton");

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

let snake;
let currentDirection;
let nextDirection;
let enemySnake;
let enemyDirection;
let food;
let score;
let highScore;
let gameLoopId = null;
let currentSpeed = BASE_SPEED_MS;
let isRunning = false;
let isPaused = false;

function createInitialSnake() {
  const center = Math.floor(GRID_SIZE / 2);
  return [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];
}

function createEnemySnake() {
  const startX = GRID_SIZE - 4;
  const startY = GRID_SIZE - 4;
  return [
    { x: startX, y: startY },
    { x: startX + 1, y: startY },
    { x: startX + 2, y: startY },
  ];
}

function createFood() {
  let nextFood;
  do {
    nextFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (
    snake.some((segment) => segment.x === nextFood.x && segment.y === nextFood.y) ||
    (enemySnake && enemySnake.some((segment) => segment.x === nextFood.x && segment.y === nextFood.y))
  );
  return nextFood;
}

function readHighScore() {
  const value = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function setHighScore(newHighScore) {
  highScore = newHighScore;
  highScoreEl.textContent = String(highScore);
  localStorage.setItem(STORAGE_KEY, String(highScore));
}

function updateScore(value) {
  score = value;
  scoreEl.textContent = String(score);
  if (score > highScore) {
    setHighScore(score);
  }
}

function resetState() {
  snake = createInitialSnake();
  currentDirection = directions.right;
  nextDirection = directions.right;
  enemySnake = createEnemySnake();
  enemyDirection = directions.left;
  food = createFood();
  currentSpeed = BASE_SPEED_MS;
  updateScore(0);
}

function showOverlay(title, text, buttonText) {
  overlayTitleEl.textContent = title;
  overlayTextEl.textContent = text;
  overlayButtonEl.textContent = buttonText;
  overlayEl.classList.remove("hidden");
}

function hideOverlay() {
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

function startGame() {
  if (isRunning && !isPaused) {
    return;
  }

  if (!isRunning) {
    resetState();
  }

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
    showOverlay("Paused", "Натисни Resume або пробіл.", "Resume");
  } else {
    hideOverlay();
    startGameLoop();
  }
}

function restartGame() {
  isRunning = false;
  isPaused = false;
  pauseBtn.textContent = "Pause";
  stopGameLoop();
  resetState();
  draw();
  showOverlay("Ready?", "Натисни Start для нової гри.", "Start game");
}

function gameOver() {
  isRunning = false;
  isPaused = false;
  pauseBtn.textContent = "Pause";
  stopGameLoop();
  showOverlay("Game Over", `Твій результат: ${score}`, "Play again");
}

function trySetDirection(direction) {
  if (!direction || !isRunning || isPaused) {
    return;
  }

  const isReverse =
    direction.x === -currentDirection.x && direction.y === -currentDirection.y;

  if (!isReverse) {
    nextDirection = direction;
  }
}

function keyToDirection(key) {
  const normalized = key.toLowerCase();
  if (normalized === "arrowup" || normalized === "w") return directions.up;
  if (normalized === "arrowdown" || normalized === "s") return directions.down;
  if (normalized === "arrowleft" || normalized === "a") return directions.left;
  if (normalized === "arrowright" || normalized === "d") return directions.right;
  return null;
}

function handleInput(event) {
  const direction = keyToDirection(event.key);
  if (direction) {
    event.preventDefault();
    if (!isRunning && !isPaused) {
      startGame();
    }
    trySetDirection(direction);
    return;
  }

  if (event.key === " " || event.key.toLowerCase() === "p") {
    event.preventDefault();
    pauseGame();
  }
}

function checkCollision(head) {
  const hitWall =
    head.x < 0 || head.y < 0 || head.x >= GRID_SIZE || head.y >= GRID_SIZE;
  const hitSelf = snake.some((segment) => segment.x === head.x && segment.y === head.y);
  const hitEnemy = enemySnake.some((segment) => segment.x === head.x && segment.y === head.y);
  return hitWall || hitSelf || hitEnemy;
}

function moveEnemySnake() {
  const head = enemySnake[0];

  const possibleDirs = [directions.up, directions.down, directions.left, directions.right];

  const validDirs = possibleDirs.filter((dir) => {
    if (dir.x === -enemyDirection.x && dir.y === -enemyDirection.y) return false;

    const nextX = head.x + dir.x;
    const nextY = head.y + dir.y;

    if (nextX < 0 || nextY < 0 || nextX >= GRID_SIZE || nextY >= GRID_SIZE) return false;

    if (enemySnake.some((seg, idx) => idx !== enemySnake.length - 1 && seg.x === nextX && seg.y === nextY)) return false;

    if (snake.some((seg) => seg.x === nextX && seg.y === nextY)) return false;

    return true;
  });

  let chosenDir = enemyDirection;

  const isCurrentValid = validDirs.some((dir) => dir.x === enemyDirection.x && dir.y === enemyDirection.y);

  if (!isCurrentValid && validDirs.length > 0) {
    chosenDir = validDirs[Math.floor(Math.random() * validDirs.length)];
  } else if (isCurrentValid && Math.random() < 0.1 && validDirs.length > 1) {
    const otherDirs = validDirs.filter((dir) => dir.x !== enemyDirection.x || dir.y !== enemyDirection.y);
    if (otherDirs.length > 0) {
      chosenDir = otherDirs[Math.floor(Math.random() * otherDirs.length)];
    }
  }

  if (validDirs.length > 0) {
    enemyDirection = chosenDir;

    const nextHead = {
      x: head.x + enemyDirection.x,
      y: head.y + enemyDirection.y,
    };

    enemySnake.unshift(nextHead);
    enemySnake.pop();
  }
}

function tick() {
  currentDirection = nextDirection;

  moveEnemySnake();

  const nextHead = {
    x: snake[0].x + currentDirection.x,
    y: snake[0].y + currentDirection.y,
  };

  if (checkCollision(nextHead)) {
    gameOver();
    return;
  }

  snake.unshift(nextHead);

  if (nextHead.x === food.x && nextHead.y === food.y) {
    updateScore(score + 1);
    food = createFood();
    currentSpeed = Math.max(MIN_SPEED_MS, BASE_SPEED_MS - score * SPEED_STEP_MS);
    startGameLoop();
  } else {
    snake.pop();
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

function draw() {
  ctx.fillStyle = "#061120";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  drawCell(food.x, food.y, "#ff7b95", 0.45);

  enemySnake.forEach((segment, index) => {
    const isHead = index === 0;
    drawCell(segment.x, segment.y, isHead ? "#cd84f1" : "#b33939", isHead ? 0.35 : 0.22);
  });

  snake.forEach((segment, index) => {
    const isHead = index === 0;
    drawCell(segment.x, segment.y, isHead ? "#8bffbd" : "#52d18a", isHead ? 0.35 : 0.22);
  });
}

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", pauseGame);
restartBtn.addEventListener("click", restartGame);
overlayButtonEl.addEventListener("click", () => {
  if (overlayButtonEl.textContent.toLowerCase().includes("resume")) {
    pauseGame();
  } else {
    startGame();
  }
});

touchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = directions[button.dataset.dir];
    if (!isRunning && !isPaused) {
      startGame();
    }
    trySetDirection(direction);
  });
});

window.addEventListener("keydown", handleInput, { passive: false });

highScore = readHighScore();
highScoreEl.textContent = String(highScore);
resetState();
draw();
showOverlay("Press Start", "З'їдай яблука, уникай стін і свого хвоста.", "Start game");
