import {
  buildToken,
  collectAlivePlacementIds,
  createSoldierUnit,
  parseToken
} from "./entities.js";

export function createBoard(size = 8) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function canPlace(board, shape, row, col) {
  const size = board.length;
  const shapeH = shape.length;
  const shapeW = shape[0].length;
  if (row + shapeH > size || col + shapeW > size) return false;

  for (let r = 0; r < shapeH; r += 1) {
    for (let c = 0; c < shapeW; c += 1) {
      if (shape[r][c] === 1 && board[row + r][col + c] !== 0) {
        return false;
      }
    }
  }
  return true;
}

export function findPlacement(board, shape) {
  const size = board.length;
  const shapeH = shape.length;
  const shapeW = shape[0].length;

  for (let row = 0; row <= size - shapeH; row += 1) {
    for (let col = 0; col <= size - shapeW; col += 1) {
      if (canPlace(board, shape, row, col)) {
        return { row, col };
      }
    }
  }
  return null;
}

export function placeShape(board, shape, placement, fillValue = 1) {
  const next = cloneBoard(board);
  for (let r = 0; r < shape.length; r += 1) {
    for (let c = 0; c < shape[0].length; c += 1) {
      if (shape[r][c] === 1) {
        next[placement.row + r][placement.col + c] = fillValue;
      }
    }
  }
  return next;
}

export function clearLines(board) {
  const size = board.length;
  const fullRows = new Set();
  const fullCols = new Set();

  for (let r = 0; r < size; r += 1) {
    if (board[r].every((v) => v !== 0)) fullRows.add(r);
  }
  for (let c = 0; c < size; c += 1) {
    let isFull = true;
    for (let r = 0; r < size; r += 1) {
      if (board[r][c] === 0) {
        isFull = false;
        break;
      }
    }
    if (isFull) fullCols.add(c);
  }

  if (fullRows.size === 0 && fullCols.size === 0) {
    return { board: cloneBoard(board), cleared: 0, removedTokens: new Map() };
  }

  const removedTokens = new Map();
  const next = cloneBoard(board);
  for (const r of fullRows) {
    for (let c = 0; c < size; c += 1) {
      const token = next[r][c];
      if (token !== 0) {
        removedTokens.set(token, (removedTokens.get(token) || 0) + 1);
      }
      next[r][c] = 0;
    }
  }
  for (const c of fullCols) {
    for (let r = 0; r < size; r += 1) {
      const token = next[r][c];
      if (token !== 0) {
        removedTokens.set(token, (removedTokens.get(token) || 0) + 1);
      }
      next[r][c] = 0;
    }
  }

  return { board: next, cleared: fullRows.size + fullCols.size, removedTokens };
}

export function calcScore(m) {
  if (m <= 0) return 0;
  return m * 20 + (m - 1) * 70;
}

export function removePlacementById(state, placementId) {
  if (!Number.isFinite(placementId)) return state;
  if (!Array.isArray(state.placedHistory)) return state;

  const tokenSuffix = `@${placementId}`;
  let removedCells = 0;
  const board = state.board.map((row) =>
    row.map((cell) => {
      if (typeof cell === "string" && cell.endsWith(tokenSuffix)) {
        removedCells += 1;
        return 0;
      }
      return cell;
    })
  );

  if (removedCells === 0) return state;

  return {
    ...state,
    board,
    placedHistory: state.placedHistory.filter((item) => item.serialNo !== placementId),
    selectedPlacementId: null
  };
}

export function applyTurn(state, shape, fillValue = 1) {
  const placement = findPlacement(state.board, shape);
  if (!placement) {
    return {
      ...state,
      message: "当前图案无可放置位置，游戏结束",
      isOver: true
    };
  }

  const hasHistoryState =
    Array.isArray(state.placedHistory) && Number.isFinite(state.nextPlacementId);
  const placementId = hasHistoryState ? state.nextPlacementId : null;
  const boardToken = placementId === null ? fillValue : buildToken(fillValue, placementId);
  const placedBoard = placeShape(state.board, shape, placement, boardToken);
  const { board: clearedBoard, cleared } = clearLines(placedBoard);
  const gained = calcScore(cleared);

  let placedHistory = state.placedHistory;
  let nextPlacementId = state.nextPlacementId;
  if (hasHistoryState) {
    const nextHistory = state.placedHistory.map((item) => ({ ...item }));
    nextHistory.push(
      createSoldierUnit(placementId, String(fillValue), String(fillValue))
    );
    const aliveIds = collectAlivePlacementIds(clearedBoard);
    placedHistory = nextHistory.filter((item) => aliveIds.has(item.serialNo));
    nextPlacementId = placementId + 1;
  }

  return {
    ...state,
    board: clearedBoard,
    score: state.score + gained,
    lastCleared: cleared,
    lastGained: gained,
    message: `已放置，消除 ${cleared} 次，本轮 +${gained} 分`,
    isOver: false,
    ...(hasHistoryState ? { placedHistory, nextPlacementId } : {})
  };
}
