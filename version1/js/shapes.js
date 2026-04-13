export const SHAPES = {
  T: [
    [
      [1, 1, 1],
      [0, 1, 0]
    ],
    [
      [0, 1],
      [1, 1],
      [0, 1]
    ],
    [
      [0, 1, 0],
      [1, 1, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [1, 0]
    ]
  ],
  I: [
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]]
  ],
  O: [[[1, 1], [1, 1]]],
  L: [
    [
      [1, 0],
      [1, 0],
      [1, 1]
    ],
    [
      [1, 1, 1],
      [1, 0, 0]
    ],
    [
      [1, 1],
      [0, 1],
      [0, 1]
    ],
    [
      [0, 0, 1],
      [1, 1, 1]
    ]
  ],
  J: [
    [
      [0, 1],
      [0, 1],
      [1, 1]
    ],
    [
      [1, 0, 0],
      [1, 1, 1]
    ],
    [
      [1, 1],
      [1, 0],
      [1, 0]
    ],
    [
      [1, 1, 1],
      [0, 0, 1]
    ]
  ],
  S: [
    [
      [0, 1, 1],
      [1, 1, 0]
    ],
    [
      [1, 0],
      [1, 1],
      [0, 1]
    ]
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1]
    ],
    [
      [0, 1],
      [1, 1],
      [1, 0]
    ]
  ]
};

export const SHAPE_COLORS = {
  T: "#22c55e",
  O: "#eab308",
  L: "#3b82f6",
  J: "#ef4444",
  S: "#f97316",
  Z: "#a855f7",
  I: "#06b6d4"
};

export function randomShape() {
  const names = Object.keys(SHAPES);
  const name = names[Math.floor(Math.random() * names.length)];
  const variants = SHAPES[name];
  const shape = variants[Math.floor(Math.random() * variants.length)];
  return { name, shape };
}
