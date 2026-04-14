import { randomShape, SHAPE_COLORS } from "./shapes.js";
import { applyTurn, createBoard, removePlacementById } from "./gameLogic.js";
import { cellToShapeName, tokenToPlacementId } from "./entities.js";
import { createMapGrid, placeSoldierOnMap, syncMapWithHistory } from "./mapLogic.js";

const BOARD_SIZE = 8;
const GAME_SECONDS = 180;
const LONG_PRESS_MS = 350;
const LONG_PRESS_MOVE_TOLERANCE = 8;

const dom = {
  board: document.getElementById("board"),
  battleMap: document.getElementById("battleMap"),
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
let pendingLongPress = null;
let dragState = null;
let suppressPlacedOrderClick = false;

function getPendingDeployments(placedHistory) {
  if (!Array.isArray(placedHistory)) return [];
  return placedHistory.filter(
    (item) => !Number.isInteger(item.x) || !Number.isInteger(item.y)
  );
}

function buildInitialState() {
  return {
    board: createBoard(BOARD_SIZE),
    score: 0,
    leftSeconds: GAME_SECONDS,
    running: false,
    isOver: false,
    nextPlacementId: 1,
    placedHistory: [],
    battleMap: createMapGrid(),
    selectedPlacementId: null,
    lastCleared: 0,
    lastGained: 0,
    message: "点击开始后进入 3 分钟挑战"
  };
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
  const pendingItems = getPendingDeployments(state.placedHistory);
  if (pendingItems.length === 0) {
    const emptyEl = document.createElement("li");
    emptyEl.className = "placed-order-empty";
    emptyEl.textContent = "暂无待部署小兵";
    dom.placedOrder.appendChild(emptyEl);
    return;
  }

  const items = pendingItems.slice().reverse();
  for (const item of items) {
    const li = document.createElement("li");
    li.className = "placed-order-item";
    if (state.selectedPlacementId === item.serialNo) {
      li.classList.add("active");
    }
    li.dataset.placementId = String(item.serialNo);
    li.style.borderColor = SHAPE_COLORS[item.color] || "#4b5563";

    const title = document.createElement("div");
    title.className = "placed-order-title";
    title.textContent = `#${item.serialNo}`;
    li.appendChild(title);

    const skin = document.createElement("div");
    skin.className = "soldier-skin";
    skin.style.borderColor = SHAPE_COLORS[item.color] || "#4b5563";
    skin.style.background = SHAPE_COLORS[item.color] || "#22c55e";
    if (typeof item.skinPath === "string" && item.skinPath.trim() !== "") {
      skin.style.backgroundImage = `url("${item.skinPath}")`;
      skin.style.backgroundSize = "cover";
      skin.style.backgroundPosition = "center";
      skin.style.backgroundRepeat = "no-repeat";
    }
    li.appendChild(skin);

    const coords = document.createElement("div");
    coords.className = "placed-order-coords";
    coords.textContent =
      Number.isInteger(item.x) && Number.isInteger(item.y)
        ? `(${item.x},${item.y})`
        : "(?,?)";
    li.appendChild(coords);
    dom.placedOrder.appendChild(li);
  }
}

function renderBattleMap() {
  dom.battleMap.innerHTML = "";
  for (let y = 0; y < state.battleMap.length; y += 1) {
    const row = state.battleMap[y];
    for (let x = 0; x < row.length; x += 1) {
      const placementId = row[x];
      const cell = document.createElement("div");
      cell.className = "map-cell";
      if (y === state.battleMap.length - 1) {
        cell.classList.add("map-cell-last-row");
      }
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);

      if (dragState?.targetX === x && dragState?.targetY === y) {
        cell.classList.add("drag-target");
      }

      if (Number.isFinite(placementId)) {
        const item = state.placedHistory.find((entry) => entry.serialNo === placementId);
        const soldier = document.createElement("div");
        soldier.className = "map-soldier";
        if (state.selectedPlacementId === placementId) {
          soldier.classList.add("selected");
        }
        soldier.style.background = SHAPE_COLORS[item?.color] || "#22c55e";
        if (typeof item?.skinPath === "string" && item.skinPath.trim() !== "") {
          soldier.style.backgroundImage = `url("${item.skinPath}")`;
          soldier.style.backgroundSize = "cover";
          soldier.style.backgroundPosition = "center";
          soldier.style.backgroundRepeat = "no-repeat";
        }
        cell.appendChild(soldier);
      }

      dom.battleMap.appendChild(cell);
    }
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
  renderBattleMap();
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
    state.placedHistory.some((item) => item.serialNo === state.selectedPlacementId);
  dom.deleteBtn.disabled = !canDelete;
}

function clearPendingLongPress() {
  if (!pendingLongPress) return;
  clearTimeout(pendingLongPress.timerId);
  pendingLongPress = null;
}

function cleanupDragGhost() {
  if (dragState?.ghostEl?.parentNode) {
    dragState.ghostEl.parentNode.removeChild(dragState.ghostEl);
  }
}

function syncMapState(nextState) {
  const synced = syncMapWithHistory(nextState.battleMap, nextState.placedHistory);
  return {
    ...nextState,
    battleMap: synced.mapGrid,
    placedHistory: synced.placedHistory
  };
}

function updateDragTarget(clientX, clientY) {
  if (!dragState) return;
  dragState.ghostEl.style.left = `${clientX}px`;
  dragState.ghostEl.style.top = `${clientY}px`;

  const element = document.elementFromPoint(clientX, clientY);
  const cell = element?.closest?.(".map-cell");
  if (!cell || !dom.battleMap.contains(cell)) {
    dragState.targetX = null;
    dragState.targetY = null;
    renderBattleMap();
    return;
  }

  const x = Number(cell.dataset.x);
  const y = Number(cell.dataset.y);
  const occupiedId = state.battleMap[y]?.[x] ?? null;
  if (Number.isFinite(occupiedId) && occupiedId !== dragState.placementId) {
    dragState.targetX = null;
    dragState.targetY = null;
    renderBattleMap();
    return;
  }

  dragState.targetX = x;
  dragState.targetY = y;
  renderBattleMap();
}

function beginDrag(placementId, clientX, clientY) {
  const item = state.placedHistory.find((entry) => entry.serialNo === placementId);
  if (!item) return;

  const ghostEl = document.createElement("div");
  ghostEl.className = "drag-ghost";
  ghostEl.style.background = SHAPE_COLORS[item.color] || "#22c55e";
  if (typeof item.skinPath === "string" && item.skinPath.trim() !== "") {
    ghostEl.style.backgroundImage = `url("${item.skinPath}")`;
    ghostEl.style.backgroundSize = "cover";
    ghostEl.style.backgroundPosition = "center";
    ghostEl.style.backgroundRepeat = "no-repeat";
  }

  const label = document.createElement("div");
  label.className = "drag-ghost-label";
  label.textContent = `#${item.serialNo}`;
  ghostEl.appendChild(label);
  document.body.appendChild(ghostEl);

  dragState = {
    placementId,
    ghostEl,
    targetX: null,
    targetY: null
  };
  suppressPlacedOrderClick = true;
  updateDragTarget(clientX, clientY);
}

function scheduleLongPressDrag(placementId, clientX, clientY) {
  if (!Number.isFinite(placementId)) return;
  clearPendingLongPress();
  pendingLongPress = {
    startX: clientX,
    startY: clientY,
    timerId: window.setTimeout(() => {
      beginDrag(placementId, clientX, clientY);
      pendingLongPress = null;
    }, LONG_PRESS_MS)
  };
}

function finishDrag() {
  if (!dragState) return;
  const { placementId, targetX, targetY } = dragState;
  cleanupDragGhost();

  if (Number.isInteger(targetX) && Number.isInteger(targetY)) {
    const result = placeSoldierOnMap(state.battleMap, state.placedHistory, placementId, targetX, targetY);
    if (result) {
      state = {
        ...state,
        battleMap: result.mapGrid,
        placedHistory: result.placedHistory,
        selectedPlacementId: placementId,
        message: `小兵 #${placementId} 已放置到地图坐标 (${targetX}, ${targetY})`
      };
    } else {
      state = {
        ...state,
        message: "目标格子已被其他小兵占用，请选择空位"
      };
    }
  }

  dragState = null;
  render();
  window.setTimeout(() => {
    suppressPlacedOrderClick = false;
  }, 0);
}

function cancelDrag() {
  clearPendingLongPress();
  if (!dragState) return;
  cleanupDragGhost();
  dragState = null;
  renderBattleMap();
  window.setTimeout(() => {
    suppressPlacedOrderClick = false;
  }, 0);
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
  clearPendingLongPress();
  cancelDrag();
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

  state = syncMapState(applyTurn(state, currentShape.shape, currentShape.name));
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
    state = syncMapState({
      ...nextState,
      message: `已删除图案 #${placementId} 的剩余部分`
    });
  }
  render();
}

dom.startBtn.addEventListener("click", startGame);
dom.placeBtn.addEventListener("click", placeCurrentShape);
dom.deleteBtn.addEventListener("click", deleteSelectedShape);
document.addEventListener("pointermove", (event) => {
  if (pendingLongPress) {
    const movedX = event.clientX - pendingLongPress.startX;
    const movedY = event.clientY - pendingLongPress.startY;
    if (Math.hypot(movedX, movedY) > LONG_PRESS_MOVE_TOLERANCE) {
      clearPendingLongPress();
    }
  }
  if (dragState) {
    updateDragTarget(event.clientX, event.clientY);
  }
});
document.addEventListener("pointerup", () => {
  clearPendingLongPress();
  finishDrag();
});
document.addEventListener("pointercancel", cancelDrag);
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
dom.battleMap.addEventListener("click", (event) => {
  const targetCell = event.target.closest(".map-cell");
  if (!targetCell || !dom.battleMap.contains(targetCell)) return;
  const x = Number(targetCell.dataset.x);
  const y = Number(targetCell.dataset.y);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return;

  const placementId = state.battleMap[y]?.[x];
  if (!Number.isFinite(placementId)) {
    state.selectedPlacementId = null;
    state.message = "当前地图格子没有小兵";
    render();
    return;
  }

  state.selectedPlacementId = placementId;
  state.message = `已选中图案 #${placementId}，可点击“删除选中图案”，长按可拖拽`;
  render();
});
dom.battleMap.addEventListener("pointerdown", (event) => {
  const targetCell = event.target.closest(".map-cell");
  if (!targetCell || !dom.battleMap.contains(targetCell)) return;
  const x = Number(targetCell.dataset.x);
  const y = Number(targetCell.dataset.y);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return;

  const placementId = state.battleMap[y]?.[x];
  if (!Number.isFinite(placementId)) return;
  scheduleLongPressDrag(placementId, event.clientX, event.clientY);
});
dom.battleMap.addEventListener("pointerup", clearPendingLongPress);
dom.battleMap.addEventListener("pointerleave", clearPendingLongPress);
dom.battleMap.addEventListener("pointercancel", cancelDrag);
dom.placedOrder.addEventListener("pointerdown", (event) => {
  const target = event.target.closest(".placed-order-item");
  if (!target || !dom.placedOrder.contains(target)) return;
  const placementId = Number(target.dataset.placementId);
  if (!Number.isFinite(placementId)) return;
  scheduleLongPressDrag(placementId, event.clientX, event.clientY);
});
dom.placedOrder.addEventListener("pointerup", clearPendingLongPress);
dom.placedOrder.addEventListener("pointerleave", clearPendingLongPress);
dom.placedOrder.addEventListener("pointercancel", cancelDrag);
dom.placedOrder.addEventListener("click", (event) => {
  if (suppressPlacedOrderClick) return;
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
