
export const BOARD_SIZE = 740; // mm equivalent in pixels for canvas
export const POCKET_RADIUS = 35;
export const STRIKER_RADIUS = 20.5;
export const COIN_RADIUS = 15.5;
export const FRICTION = 0.985;
export const WALL_BOUNCE = 0.7;
export const MIN_VELOCITY = 0.1;

export const COLORS = {
  BOARD_BASE: '#d4a373',
  BOARD_LINES: '#432818',
  WHITE_COIN: '#fefae0',
  BLACK_COIN: '#283618',
  QUEEN_COIN: '#e63946',
  STRIKER: 'rgba(255, 255, 255, 0.4)',
  POCKET: '#1a1a1a',
};

export const INITIAL_POSITIONS = [
  // Hexagonal pattern for coins
  { type: 'QUEEN', x: 0, y: 0 },
  // Inner ring (6 coins)
  ...Array.from({ length: 6 }).map((_, i) => ({
    type: i % 2 === 0 ? 'WHITE' : 'BLACK',
    x: Math.cos((i * 60 * Math.PI) / 180) * 32,
    y: Math.sin((i * 60 * Math.PI) / 180) * 32,
  })),
  // Outer ring (12 coins)
  ...Array.from({ length: 12 }).map((_, i) => ({
    type: [0, 1, 3, 4, 6, 7, 9, 10].includes(i) ? 'BLACK' : 'WHITE',
    x: Math.cos((i * 30 * Math.PI) / 180) * 64,
    y: Math.sin((i * 30 * Math.PI) / 180) * 64,
  })),
];
