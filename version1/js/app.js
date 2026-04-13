import { randomShape, SHAPE_COLORS } from "./shapes.js";
import { applyTurn, createBoard, removePlacementById } from "./gameLogic.js";

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
  placeBtn: document.getElementById("placeBtn"),
  deleteBtn: document.getElementById("deleteBtn")
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
    selectedPlacementId: null,
    lastCleared: 0,
    lastGained: 0,
    message: "点击开始后进入 3 分钟挑战"
  };
}

function tokenToPlacementId(token) {
  if (typeof token !== "string" || !token.includes("@")) return null;
  const parts = token.split("@");
  const id = Number(parts[1]);
  return Number.isFinite(id) ? id : null;
}

function cellToShapeName(cell) {
  if (cell === 0) return null;
  if (typeof cell !== "string") return String(cell);
  if (!cell.includes("@")) return cell;
  return cell.split("@")[0];
}

function renderBoard() {
  dom.board.innerHTML = "";
  for (let r = 0; r < state.board.length; r += 1) {
    const row = state.board[r];
    for (let c = 0; c < row.length; c += 1) {
      const cell = row[c];
      const div = document.createElement("div");
      div.className = "cell";
      div.dataset.row = String(r);
      div.dataset.col = String(c);
      if (cell !== 0) {
        const shapeName = cellToShapeName(cell);
        const placementId = tokenToPlacementId(cell);
        div.classList.add("filled");
        div.style.background = SHAPE_COLORS[shapeName] || "#22c55e";
        if (placementId !== null) {
          div.dataset.placementId = String(placementId);
          if (state.selectedPlacementId === placementId) {
            div.classList.add("selected");
          }
        }
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
    if (state.selectedPlacementId === item.placementId) {
      li.classList.add("active");
    }
    li.dataset.placementId = String(item.placementId);
    li.style.borderColor = SHAPE_COLORS[item.shapeName] || "#4b5563";

    const title = document.createElement("div");
    title.className = "placed-order-title";
    title.textContent = item.shapeName;
    li.appendChild(title);

    const preview = document.createElement("div");
    preview.className = "placed-shape-preview";
    if (Array.isArray(item.shape) && item.shape.length > 0) {
      preview.style.gridTemplateColumns = `repeat(${item.shape[0].length}, 12px)`;
      item.shape.forEach((shapeRow) => {
        shapeRow.forEach((v) => {
          const cell = document.createElement("span");
          cell.className = "placed-shape-cell";
          if (v === 1) {
            cell.classList.add("on");
            cell.style.borderColor = SHAPE_COLORS[item.shapeName] || "#4b5563";
            if (state.selectedPlacementId === item.placementId) {
              cell.style.background = SHAPE_COLORS[item.shapeName] || "#22c55e";
            }
          }
          preview.appendChild(cell);
        });
      });
    }
    li.appendChild(preview);
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
  const canDelete =
    state.running &&
    !state.isOver &&
    Number.isFinite(state.selectedPlacementId) &&
    state.placedHistory.some((item) => item.placementId === state.selectedPlacementId);
  dom.deleteBtn.disabled = !canDelete;
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
  dom.deleteBtn.disabled = true;
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

function deleteSelectedShape() {
  if (!state.running || state.isOver) return;
  const placementId = state.selectedPlacementId;
  if (!Number.isFinite(placementId)) return;

  const nextState = removePlacementById(state, placementId);
  if (nextState === state) {
    state.message = "未找到可删除的选中图案";
  } else {
    state = {
      ...nextState,
      message: `已删除图案 #${placementId} 的剩余部分`
    };
  }
  render();
}

dom.startBtn.addEventListener("click", startGame);
dom.placeBtn.addEventListener("click", placeCurrentShape);
dom.deleteBtn.addEventListener("click", deleteSelectedShape);
dom.board.addEventListener("click", (event) => {
  const target = event.target.closest(".cell");
  if (!target || !dom.board.contains(target)) return;
  const placementId = Number(target.dataset.placementId);
  if (!Number.isFinite(placementId)) {
    state.selectedPlacementId = null;
  } else if (state.selectedPlacementId === placementId) {
    state.selectedPlacementId = null;
  } else {
    state.selectedPlacementId = placementId;
  }
  render();
});
dom.placedOrder.addEventListener("click", (event) => {
  const target = event.target.closest(".placed-order-item");
  if (!target || !dom.placedOrder.contains(target)) return;
  const placementId = Number(target.dataset.placementId);
  if (!Number.isFinite(placementId)) return;
  if (state.selectedPlacementId === placementId) {
    state.selectedPlacementId = null;
  } else {
    state.selectedPlacementId = placementId;
  }
  render();
});

render();
