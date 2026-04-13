import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTurn,
  calcScore,
  clearLines,
  createBoard,
  findPlacement,
  placeShape
} from "../js/gameLogic.js";

test("findPlacement follows top then left", () => {
  const board = createBoard(5);
  board[0][0] = 1;
  const shape = [[1]];

  const placement = findPlacement(board, shape);
  assert.deepEqual(placement, { row: 0, col: 1 });
});

test("refer example first placement on 5x5 board", () => {
  const board = createBoard(5);
  const shape = [
    [1, 1, 1],
    [1, 0, 0]
  ];
  const placement = findPlacement(board, shape);
  const next = placeShape(board, shape, placement);

  assert.deepEqual(next, [
    [1, 1, 1, 0, 0],
    [1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
  ]);
});

test("refer example second shape triggers one line clear", () => {
  const board = [
    [1, 1, 1, 0, 0],
    [1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
  ];
  const shape = [[1, 1, 1, 1]];
  const placement = findPlacement(board, shape);
  const placed = placeShape(board, shape, placement);
  const { board: clearedBoard, cleared } = clearLines(placed);

  assert.deepEqual(placement, { row: 1, col: 1 });
  assert.equal(cleared, 1);
  assert.equal(calcScore(cleared), 20);
  assert.equal(clearedBoard[1].every((v) => v === 0), true);
});

test("calcScore returns zero when M is 0", () => {
  assert.equal(calcScore(0), 0);
});

test("clearLines counts rows and columns at the same time", () => {
  const board = [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1]
  ];
  const result = clearLines(board);
  assert.equal(result.cleared, 4);
});

test("applyTurn accumulates score after clear", () => {
  const state = {
    board: [
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    score: 0
  };
  const shape = [[1]];
  const next = applyTurn(state, shape);
  assert.equal(next.lastCleared, 1);
  assert.equal(next.score, 20);
});

test("applyTurn keeps history until shape fully cleared", () => {
  const state = {
    board: [
      ["O@1", 0, "X"],
      ["O@1", 0, 0],
      [0, 0, 0]
    ],
    score: 0,
    nextPlacementId: 2,
    placedHistory: [{ placementId: 1, shapeName: "O", remainingCells: 2 }]
  };
  const shape = [[1]];
  const next = applyTurn(state, shape, "J");
  assert.equal(next.lastCleared, 1);
  assert.deepEqual(next.placedHistory, [
    { placementId: 1, shapeName: "O", remainingCells: 1 }
  ]);
});
