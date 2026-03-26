export type MahjongSuit = "dots" | "bamboo";

export type MahjongTile = {
  suit: MahjongSuit;
  rank: number;
};

export function createMahjong72Deck(): MahjongTile[] {
  const deck: MahjongTile[] = [];
  const suits: MahjongSuit[] = ["dots", "bamboo"];

  for (const suit of suits) {
    for (let rank = 1; rank <= 9; rank += 1) {
      for (let i = 0; i < 4; i += 1) {
        deck.push({ suit, rank });
      }
    }
  }

  return deck;
}

export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function suitIndex(suit: MahjongSuit): number {
  return suit === "dots" ? 0 : 1;
}

function toCounts(tiles: MahjongTile[]): number[][] {
  const counts: number[][] = [
    new Array(10).fill(0),
    new Array(10).fill(0),
  ];

  for (const t of tiles) {
    const si = suitIndex(t.suit);
    if (t.rank >= 1 && t.rank <= 9) counts[si][t.rank] += 1;
  }

  return counts;
}

function serializeCounts(c: number[]): string {
  return c.slice(1).join(",");
}

function canFormMelds(counts: number[], memo: Map<string, boolean>): boolean {
  const key = serializeCounts(counts);
  const cached = memo.get(key);
  if (cached != null) return cached;

  let i = 1;
  while (i <= 9 && counts[i] === 0) i += 1;
  if (i > 9) {
    memo.set(key, true);
    return true;
  }

  if (counts[i] >= 3) {
    counts[i] -= 3;
    if (canFormMelds(counts, memo)) {
      counts[i] += 3;
      memo.set(key, true);
      return true;
    }
    counts[i] += 3;
  }

  if (i <= 7 && counts[i + 1] > 0 && counts[i + 2] > 0) {
    counts[i] -= 1;
    counts[i + 1] -= 1;
    counts[i + 2] -= 1;
    if (canFormMelds(counts, memo)) {
      counts[i] += 1;
      counts[i + 1] += 1;
      counts[i + 2] += 1;
      memo.set(key, true);
      return true;
    }
    counts[i] += 1;
    counts[i + 1] += 1;
    counts[i + 2] += 1;
  }

  memo.set(key, false);
  return false;
}

export type MahjongWinCheckResult = {
  ok: boolean;
};

export function isWinningMahjong72Hand(tiles: MahjongTile[]): MahjongWinCheckResult {
  if (tiles.length !== 14) return { ok: false };

  const counts = toCounts(tiles);

  for (let suit = 0; suit < 2; suit += 1) {
    for (let rank = 1; rank <= 9; rank += 1) {
      if (counts[suit][rank] >= 2) {
        counts[suit][rank] -= 2;

        const memo0 = new Map<string, boolean>();
        const memo1 = new Map<string, boolean>();
        const ok0 = canFormMelds(counts[0], memo0);
        const ok1 = canFormMelds(counts[1], memo1);

        counts[suit][rank] += 2;

        if (ok0 && ok1) return { ok: true };
      }
    }
  }

  return { ok: false };
}

export function formatMahjongTile(t: MahjongTile): string {
  const suitLabel = t.suit === "dots" ? "Dot" : "Bamboo";
  return `${suitLabel} ${t.rank}`;
}

export function sortTiles(tiles: MahjongTile[]): MahjongTile[] {
  return [...tiles].sort((a, b) => {
    if (a.suit !== b.suit) return a.suit === "dots" ? -1 : 1;
    return a.rank - b.rank;
  });
}
