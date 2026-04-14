const DEFAULT_SKIN_PATH = "skins/rectangle";

export function buildToken(shapeName, placementId) {
  return `${shapeName}@${placementId}`;
}

export function parseToken(token) {
  const [shapeName, idText] = token.split("@");
  return {
    shapeName,
    placementId: Number(idText)
  };
}

export function tokenToPlacementId(token) {
  if (typeof token !== "string" || !token.includes("@")) return null;
  const parsed = parseToken(token);
  return Number.isFinite(parsed.placementId) ? parsed.placementId : null;
}

export function cellToShapeName(cell) {
  if (cell === 0) return null;
  if (typeof cell !== "string") return String(cell);
  if (!cell.includes("@")) return cell;
  return parseToken(cell).shapeName;
}

export function createSoldierUnit(placementId, shapeType, color) {
  return {
    serialNo: placementId,
    color,
    shapeType,
    skinPath: DEFAULT_SKIN_PATH,
    x: null,
    y: null
  };
}

export function collectAlivePlacementIds(board) {
  const aliveIds = new Set();
  for (const row of board) {
    for (const cell of row) {
      if (typeof cell !== "string") continue;
      const parsed = parseToken(cell);
      if (Number.isFinite(parsed.placementId)) {
        aliveIds.add(parsed.placementId);
      }
    }
  }
  return aliveIds;
}
