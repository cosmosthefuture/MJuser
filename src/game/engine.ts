// Domino game types and logic

export interface DominoTile {
  top: number;
  bottom: number;
  id: string;
}

export interface Player {
  id: number;
  name: string;
  avatar: string;
  chips: number;
  tiles: DominoTile[];
  isDealer: boolean;
  position:
    | "bottom"
    | "left-1"
    | "left-2"
    | "top-1"
    | "top-2"
    | "top-3"
    | "top-4"
    | "right-1"
    | "right-2";
  roundResult?: "win" | "lose" | "tie";
  roundDelta?: number;
  currentBet: number;
  hasFolded: boolean;
  totalBetThisRound: number;
}

export interface RoundResult {
  winnerId: number;
  winnerName: string;
  winnerValue: number;
  pot: number;
  playerResults: {
    playerId: number;
    value: number;
    delta: number;
    result: "win" | "lose" | "tie";
  }[];
}

export interface GameState {
  players: Player[];
  pot: number;
  round: number;
  totalRounds: number;
  phase: "waiting" | "dealing" | "betting" | "playing" | "showdown";
  roomId: string;
  lastResult?: RoundResult;
  minBet: number;
  currentHighBet: number;
}

// Chinese domino set (28 tiles)
const DOMINO_SET: [number, number][] = [];
for (let i = 0; i <= 6; i++) {
  for (let j = i; j <= 6; j++) {
    DOMINO_SET.push([i, j]);
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PLAYER_NAMES = [
  "Big Boss",
  "Wind Master",
  "Blue Cash",
  "Lucky Star",
  "High Roller",
  "Chicken Dinner",
  "Rising Star",
  "Big Winner",
];

const AVATARS = ["👨‍💼", "😎", "🕶️", "👩", "🧑‍💻", "👨‍🎤", "🤵", "👸"];

const POSITIONS: Player["position"][] = [
  "bottom",
  "top-1",
  "top-2",
  "top-3",
  "top-4",
  "left-1",
  "right-1",
  "right-2",
];

export function createGame(numPlayers: number = 8): GameState {
  const tiles = shuffle(DOMINO_SET);
  const tilesPerPlayer = Math.min(3, Math.floor(tiles.length / numPlayers));

  const players: Player[] = Array.from({ length: numPlayers }, (_, i) => {
    const playerTiles = tiles
      .slice(i * tilesPerPlayer, (i + 1) * tilesPerPlayer)
      .map(([top, bottom], idx) => ({
        top,
        bottom,
        id: `p${i}-t${idx}`,
      }));

    return {
      id: i,
      name: PLAYER_NAMES[i % PLAYER_NAMES.length],
      avatar: AVATARS[i % AVATARS.length],
      chips: i === 0 ? 177060 : Math.floor(Math.random() * 160000) + 20000,
      tiles: playerTiles,
      isDealer: i === 0,
      position: POSITIONS[i],
      currentBet: 0,
      hasFolded: false,
      totalBetThisRound: 0,
    };
  });

  const minBet = 10000;
  return {
    players,
    pot: 0,
    round: 1,
    totalRounds: 5,
    phase: "betting",
    roomId: String(Math.floor(Math.random() * 900000) + 100000),
    minBet,
    currentHighBet: 0,
  };
}

export function calculateTileValue(tiles: DominoTile[]): number {
  const total = tiles.reduce((sum, t) => sum + t.top + t.bottom, 0);
  return total % 10;
}

export function playerBet(
  state: GameState,
  playerId: number,
  amount: number,
): GameState {
  const actualAmount = Math.min(
    amount,
    state.players.find((p) => p.id === playerId)!.chips,
  );

  const players = state.players.map((p) =>
    p.id === playerId
      ? {
          ...p,
          chips: p.chips - actualAmount,
          currentBet: p.currentBet + actualAmount,
          totalBetThisRound: p.totalBetThisRound + actualAmount,
        }
      : p,
  );

  return {
    ...state,
    players,
    pot: state.pot + actualAmount,
    currentHighBet: Math.max(
      state.currentHighBet,
      players.find((p) => p.id === playerId)!.totalBetThisRound,
    ),
  };
}

export function playerFold(state: GameState, playerId: number): GameState {
  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, hasFolded: true } : p,
  );
  return { ...state, players };
}

export function aiBetting(state: GameState): GameState {
  let s: GameState = { ...state, players: [...state.players] };

  for (const p of state.players) {
    if (p.id === 0 || p.hasFolded) continue;
    const r = Math.random();
    if (r < 0.1) {
      s = playerFold(s, p.id);
    } else {
      const multiplier = r < 0.5 ? 1 : r < 0.8 ? 2 : r < 0.95 ? 3 : 5;
      const betAmount = Math.min(s.minBet * multiplier, p.chips);
      s = playerBet(s, p.id, betAmount);
    }
  }

  return { ...s, phase: "playing" };
}

export function resolveRound(state: GameState): GameState {
  const activePlayers = state.players.filter((p) => !p.hasFolded);
  const playerValues = activePlayers.map((p) => ({
    id: p.id,
    value: calculateTileValue(p.tiles),
  }));

  const maxValue = Math.max(...playerValues.map((pv) => pv.value));
  const winnerId = playerValues.find((pv) => pv.value === maxValue)!.id;

  const playerResults = state.players.map((p) => {
    const value = calculateTileValue(p.tiles);
    const isWinner = p.id === winnerId;
    const delta = isWinner
      ? state.pot - p.totalBetThisRound
      : -p.totalBetThisRound;
    return {
      playerId: p.id,
      value,
      delta,
      result: (p.hasFolded || !isWinner ? "lose" : "win") as
        | "win"
        | "lose"
        | "tie",
    };
  });

  const players = state.players.map((p) => {
    const pr = playerResults.find((r) => r.playerId === p.id)!;
    return {
      ...p,
      chips: pr.result === "win" ? p.chips + state.pot : p.chips,
      roundResult: pr.result,
      roundDelta: pr.delta,
    };
  });

  const winner = state.players.find((p) => p.id === winnerId)!;

  return {
    ...state,
    players,
    phase: "showdown",
    lastResult: {
      winnerId,
      winnerName: winner.name,
      winnerValue: maxValue,
      pot: state.pot,
      playerResults,
    },
  };
}

export function dealNewRound(state: GameState): GameState {
  const tiles = shuffle(DOMINO_SET);
  const tilesPerPlayer = 3;

  const players = state.players.map((p, i) => ({
    ...p,
    tiles: tiles
      .slice(i * tilesPerPlayer, (i + 1) * tilesPerPlayer)
      .map(([top, bottom], idx) => ({
        top,
        bottom,
        id: `p${i}-t${idx}-r${state.round}`,
      })),
    roundResult: undefined as "win" | "lose" | "tie" | undefined,
    roundDelta: undefined as number | undefined,
    currentBet: 0,
    hasFolded: false,
    totalBetThisRound: 0,
  }));

  return {
    ...state,
    players,
    pot: 0,
    round: state.round < state.totalRounds ? state.round + 1 : 1,
    phase: "betting",
    lastResult: undefined,
    currentHighBet: 0,
  };
}
