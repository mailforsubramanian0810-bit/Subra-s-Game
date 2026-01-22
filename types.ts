
export enum CoinType {
  WHITE = 'WHITE',
  BLACK = 'BLACK',
  QUEEN = 'QUEEN',
  STRIKER = 'STRIKER'
}

export interface Vector {
  x: number;
  y: number;
}

export interface Coin {
  id: string;
  type: CoinType;
  pos: Vector;
  vel: Vector;
  radius: number;
  mass: number;
  inPocket: boolean;
}

export interface GameState {
  coins: Coin[];
  striker: Coin;
  score: {
    white: number;
    black: number;
  };
  turn: 'white' | 'black';
  isMoving: boolean;
  strikerPositioned: boolean;
  queenPocketedBy: 'white' | 'black' | null;
  needsCover: boolean;
}

export interface MoveSuggestion {
  angle: number;
  power: number;
  explanation: string;
}
