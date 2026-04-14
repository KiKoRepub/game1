export const MAP_WIDTH = 10;
export const MAP_HEIGHT = 5;

export function createMapGrid(width = MAP_WIDTH, height = MAP_HEIGHT) {
  return Array.from({ length: height }, () => Array(width).fill(null));
}

export function cloneMapGrid(mapGrid) {
  return mapGrid.map((row) => row.slice());
}

export function syncMapWithHistory(mapGrid, placedHistory) {
  const aliveIds = new Set(placedHistory.map((item) => item.serialNo));
  const nextGrid = cloneMapGrid(mapGrid);
  const coordsById = new Map();

  for (let y = 0; y < nextGrid.length; y += 1) {
    for (let x = 0; x < nextGrid[y].length; x += 1) {
      const placementId = nextGrid[y][x];
      if (!Number.isFinite(placementId) || !aliveIds.has(placementId)) {
        nextGrid[y][x] = null;
        continue;
      }
      coordsById.set(placementId, { x, y });
    }
  }

  const nextHistory = placedHistory.map((item) => {
    const coords = coordsById.get(item.serialNo);
    return {
      ...item,
      x: coords ? coords.x : null,
      y: coords ? coords.y : null
    };
  });

  return { mapGrid: nextGrid, placedHistory: nextHistory };
}

export function placeSoldierOnMap(mapGrid, placedHistory, placementId, x, y) {
  if (!Number.isFinite(placementId) || !Number.isInteger(x) || !Number.isInteger(y)) {
    return null;
  }
  if (y < 0 || y >= mapGrid.length) return null;
  if (x < 0 || x >= mapGrid[0].length) return null;

  const nextGrid = cloneMapGrid(mapGrid);
  for (let row = 0; row < nextGrid.length; row += 1) {
    for (let col = 0; col < nextGrid[row].length; col += 1) {
      if (nextGrid[row][col] === placementId) {
        nextGrid[row][col] = null;
      }
    }
  }

  const occupiedId = nextGrid[y][x];
  if (Number.isFinite(occupiedId) && occupiedId !== placementId) {
    return null;
  }

  nextGrid[y][x] = placementId;
  return syncMapWithHistory(nextGrid, placedHistory);
}
