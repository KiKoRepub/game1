import { randomShape, SHAPE_COLORS } from "./shapes.js";
import { applyTurn, createBoard } from "./gameLogic.js";

const BOARD_SIZE = 8;
const GAME_SECONDS = 180;

const dom = {
  board: document.getElementById("board"),
  score: document.getElementById("score"),
  time: document.getElementById("time"),
  status: document.getElementById("status"),
  shapePreview: document.getElementById("shapePreview"),
  shapeName: document.getElementById("shapeName"),
  placedOrder: document.getElementById("placedOrder"),
  message: document.getElementById("message"),
  startBtn: document.getElementById("startBtn"),
  placeBtn: document.getElementById("placeBtn")
};

let state = buildInitialState();
let currentShape = null;
let timerId = null;

function buildInitialState() {
  return {
    board: createBoard(BOARD_SIZE),
    score: 0,
    leftSeconds: GAME_SECONDS,
    running: false,
    isOver: false,
    nextPlacementId: 1,
    placedHistory: [],
    lastCleared: 0,
    lastGained: 0,
    message: "点击开始后进入 3 分钟挑战"
  };
}

function cellToShapeName(cell) {
  if (cell === 0) return null;
  if (typeof cell !== "string") return String(cell);
  if (!cell.includes("@")) return cell;
  return cell.split("@")[0];
}

function renderBoard() {
  dom.board.innerHTML = "";
  for (const row of state.board) {
    for (const cell of row) {
      const div = document.createElement("div");
      div.className = "cell";
      if (cell !== 0) {
        const shapeName = cellToShapeName(cell);
        div.classList.add("filled");
        div.style.background = SHAPE_COLORS[shapeName] || "#22c55e";
      }
      dom.board.appendChild(div);
    }
  }
}

function renderPlacedOrder() {
  dom.placedOrder.innerHTML = "";
  if (!Array.isArray(state.placedHistory) || state.placedHistory.length === 0) {
    const emptyEl = document.createElement("li");
    emptyEl.className = "placed-order-empty";
    emptyEl.textContent = "暂无记录";
    dom.placedOrder.appendChild(emptyEl);
    return;
  }

  const items = state.placedHistory.slice().reverse();
  for (const item of items) {
    const li = document.createElement("li");
    li.className = "placed-order-item";
    li.textContent = item.shapeName;
    li.style.borderColor = SHAPE_COLORS[item.shapeName] || "#4b5563";
    dom.placedOrder.appendChild(li);
  }
}

function renderShape(shapeObj) {
  dom.shapePreview.innerHTML = "";
  if (!shapeObj) return;

  const { shape, name } = shapeObj;
  dom.shapePreview.style.gridTemplateColumns = "1fr";
  dom.shapeName.textContent = `图案: ${name}`;

  shape.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "shape-preview-row";
    row.forEach((v) => {
      const cell = document.createElement("div");
      cell.className = "shape-cell";
      if (v === 1) {
        cell.classList.add("on");
        cell.style.background = SHAPE_COLORS[name] || "#22c55e";
      }
      rowEl.appendChild(cell);
    });
    dom.shapePreview.appendChild(rowEl);
  });
}

function render() {
  renderBoard();
  renderShape(currentShape);
  renderPlacedOrder();
  dom.score.textContent = String(state.score);
  dom.time.textContent = String(state.leftSeconds);
  dom.message.textContent = state.message;
  if (state.isOver || state.leftSeconds <= 0) {
    dom.status.textContent = "已结束";
  } else if (state.running) {
    dom.status.textContent = "进行中";
  } else {
    dom.status.textContent = "未开始";
  }
}

function nextShape() {
  currentShape = randomShape();
}

function endGame(reason) {
  if (timerId) clearInterval(timerId);
  timerId = null;
  state.running = false;
  state.isOver = true;
  state.message = `${reason}，最终得分 ${state.score}`;
  dom.placeBtn.disabled = true;
  render();
}

function startGame() {
  if (timerId) clearInterval(timerId);
  state = buildInitialState();
  state.running = true;
  dom.placeBtn.disabled = false;
  nextShape();
  render();

  timerId = setInterval(() => {
    if (!state.running) return;
    state.leftSeconds -= 1;
    if (state.leftSeconds <= 0) {
      state.leftSeconds = 0;
      endGame("时间到");
      return;
    }
    render();
  }, 1000);
}

function placeCurrentShape() {
  if (!state.running || state.isOver || !currentShape) return;

  state = applyTurn(state, currentShape.shape, currentShape.name);
  if (state.isOver) {
    endGame("无可放置位置");
    return;
  }
  nextShape();
  render();
}

dom.startBtn.addEventListener("click", startGame);
dom.placeBtn.addEventListener("click", placeCurrentShape);

render();
