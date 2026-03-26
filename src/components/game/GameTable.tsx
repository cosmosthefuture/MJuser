import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  createGame,
  dealNewRound,
  resolveRound,
  playerBet,
  playerFold,
  aiBetting,
  GameState,
  Player,
} from "@/game/engine";
import { PlayerSeat } from "./PlayerSeat";
import { RoundResultOverlay } from "./RoundResultOverlay";
import { BettingPanel, BetAction } from "./BettingPanel";
import { Button } from "@/components/ui/button";
import { PixiGameStage } from "./PixiGameStage";

export const GameTable: React.FC = () => {
  const [game, setGame] = useState<GameState>(() => createGame(8));
  const [showAllTiles, setShowAllTiles] = useState(true);
  const [chipAnim, setChipAnim] = useState<{
    amount: number;
    direction: "to-pot" | "from-pot";
    fromPosition: Player["position"];
    key: number;
  } | null>(null);

  type HowlLike = { play?: () => void };
  const soundRef = useRef<{ bet?: HowlLike; win?: HowlLike } | null>(null);
  const prevRoundResultRef = useRef<string | null>(null);
  const chipAnimQueueRef = useRef<
    {
      amount: number;
      direction: "to-pot" | "from-pot";
      fromPosition: Player["position"];
      key: number;
    }[]
  >([]);
  const chipAnimTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSounds = async () => {
      const { Howl } = await import("howler");

      if (!mounted) return;

      soundRef.current = {
        bet: new Howl({
          src: ["/sounds/chip-bet.mp3"],
          volume: 0.35,
        }),
        win: new Howl({
          src: ["/sounds/win-slot.mp3"],
          volume: 0.5,
        }),
      };
    };

    void loadSounds();

    return () => {
      mounted = false;
      soundRef.current = null;
    };
  }, []);

  const playBetSound = useCallback(() => {
    soundRef.current?.bet?.play?.();
  }, []);

  const playWinSound = useCallback(() => {
    soundRef.current?.win?.play?.();
  }, []);

  const pumpChipAnimQueue = useCallback(() => {
    if (chipAnimTimerRef.current) return;

    const next = chipAnimQueueRef.current.shift();
    if (!next) return;

    playBetSound();
    setChipAnim(next);
    chipAnimTimerRef.current = window.setTimeout(() => {
      chipAnimTimerRef.current = null;
      setChipAnim(null);
      pumpChipAnimQueue();
    }, 650);
  }, [playBetSound]);

  const enqueueChipAnim = useCallback(
    (anim: {
      amount: number;
      direction: "to-pot" | "from-pot";
      fromPosition: Player["position"];
      key: number;
    }) => {
      chipAnimQueueRef.current.push(anim);
      pumpChipAnimQueue();
    },
    [pumpChipAnimQueue],
  );

  const enqueueBetAnimationsFromDiff = useCallback(
    (prev: GameState, next: GameState) => {
      const deltas: { playerId: number; amount: number }[] = [];

      next.players.forEach((pNext) => {
        const pPrev = prev.players.find((p) => p.id === pNext.id);
        if (!pPrev) return;

        const delta = pNext.totalBetThisRound - pPrev.totalBetThisRound;
        if (delta > 0) {
          deltas.push({ playerId: pNext.id, amount: delta });
        }
      });

      deltas.forEach(({ playerId, amount }, idx) => {
        const p = next.players.find((pp) => pp.id === playerId);
        if (!p) return;

        window.setTimeout(() => {
          enqueueChipAnim({
            amount,
            direction: "to-pot",
            fromPosition: p.position,
            key: Date.now() + idx,
          });
        }, idx * 180);
      });
    },
    [enqueueChipAnim],
  );

  const handleBetAction = useCallback(
    (action: BetAction, amount?: number) => {
      if (action === "fold") {
        setGame((prev) => {
          const afterFold = playerFold(prev, 0);
          const afterAi = aiBetting(afterFold);
          enqueueBetAnimationsFromDiff(afterFold, afterAi);
          return afterAi;
        });
      } else if (action === "check") {
        setGame((prev) => {
          const afterAi = aiBetting(prev);
          enqueueBetAnimationsFromDiff(prev, afterAi);
          return afterAi;
        });
      } else if (action === "bet" || action === "raise") {
        const betAmount = amount || game.minBet;
        enqueueChipAnim({
          amount: betAmount,
          direction: "to-pot",
          fromPosition: "bottom",
          key: Date.now(),
        });

        setGame((prev) => {
          const afterBet = playerBet(prev, 0, betAmount);
          const afterAi = aiBetting(afterBet);
          enqueueBetAnimationsFromDiff(afterBet, afterAi);
          return afterAi;
        });
      }
    },
    [enqueueBetAnimationsFromDiff, enqueueChipAnim, game.minBet],
  );

  const handleShowdown = useCallback(() => {
    setShowAllTiles(true);
    setGame((prev) => resolveRound(prev));
  }, []);

  const handleNewDeal = useCallback(() => {
    setShowAllTiles(false);
    setTimeout(() => {
      setGame((prev) => dealNewRound(prev));
      setTimeout(() => setShowAllTiles(true), 400);
    }, 300);
  }, []);

  const handleDismissResult = useCallback(() => {
    handleNewDeal();
  }, [handleNewDeal]);

  const player = game.players[0];
  const topPlayers = game.players.filter((p) =>
    ["top-1", "top-2", "top-3", "top-4"].includes(p.position),
  );
  const leftPlayers = game.players.filter((p) =>
    ["left-1", "left-2"].includes(p.position),
  );
  const rightPlayers = game.players.filter((p) =>
    ["right-1", "right-2"].includes(p.position),
  );

  const isShowdown = game.phase === "showdown";
  const isBetting = game.phase === "betting";
  const isPlaying = game.phase === "playing";

  useEffect(() => {
    const mainPlayer = game.players[0];
    const current = mainPlayer.roundResult ?? null;
    const prev = prevRoundResultRef.current;

    if (current === "win" && prev !== "win") {
      // winner just shown for main player
      playWinSound();
    }

    prevRoundResultRef.current = current;
  }, [game.players, playWinSound]);

  return (
    <div className="w-full h-screen bg-gradient-to-b from-[#021219] via-[#03252f] to-[#02080d] flex flex-col items-center justify-center overflow-hidden select-none">
      <div className="w-full max-w-6xl px-4 py-2 flex items-center justify-between bg-black/40 backdrop-blur-sm border-b border-[hsl(var(--gold-dark))]/60 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-4">
          <button className="w-7 h-7 rounded-full border border-[hsl(var(--gold))]/70 flex items-center justify-center text-[hsl(var(--gold))] text-xs bg-black/60">
            ←
          </button>
          <div className="flex flex-col text-xs text-muted-foreground/80">
            <span className="font-semibold tracking-wide text-[10px] uppercase gold-text">
              Round {game.round} / {game.totalRounds}
            </span>
            <span>Room: {game.roomId}</span>
          </div>
          {isBetting && (
            <span className="px-2 py-0.5 bg-[hsl(var(--gold))]/20 gold-text text-[10px] rounded-full font-bold animate-pulse">
              Betting...
            </span>
          )}
          {isShowdown && (
            <span className="px-2 py-0.5 bg-[hsl(var(--gold))]/30 gold-text text-[10px] rounded-full font-bold animate-ping">
              Showdown!
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/80">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span>Online</span>
          </div>
          <div className="h-3 w-px bg-border/60" />
          <div className="flex items-center gap-1">
            <span className="w-3 h-1 bg-[hsl(var(--gold))] rounded-sm" />
            <span className="w-3 h-1 bg-[hsl(var(--gold))]/60 rounded-sm" />
            <span className="w-3 h-1 bg-[hsl(var(--gold))]/30 rounded-sm" />
          </div>
          {isPlaying && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleShowdown}
              className="text-xs border-[hsl(var(--gold))]/50 text-foreground hover:bg-[hsl(var(--gold))]/20 animate-pulse-gold"
            >
              🎲 Showdown
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewDeal}
            className="text-[10px] border-[hsl(var(--gold))]/60 text-foreground hover:bg-[hsl(var(--gold))]/25"
          >
            Deal
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllTiles((prev) => !prev)}
            className="text-[10px] border-[hsl(var(--gold))]/60 text-foreground hover:bg-[hsl(var(--gold))]/25"
          >
            {showAllTiles ? "Hide" : "Show"}
          </Button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl flex items-center justify-center p-4">
        <div className="relative w-full aspect-[2/1] max-h-[78vh] rounded-[50%] border-[6px] border-[hsl(var(--gold-dark))] shadow-[0_0_40px_rgba(0,0,0,0.9)] overflow-hidden bg-[#024142]">
          <div className="absolute inset-[10px] rounded-[50%] border border-[hsl(var(--gold))]/30 shadow-inner" />

          <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="w-[88%] h-[82%]">
              <PixiGameStage
                game={game}
                playerIndex={0}
                showAllTiles={showAllTiles}
                chipAnim={chipAnim}
              />
            </div>
          </div>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-6 z-10">
            {topPlayers.map((p) => (
              <PlayerSeat key={p.id} player={p} showTiles={showAllTiles} />
            ))}
          </div>

          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-8 z-10">
            {leftPlayers.map((p) => (
              <PlayerSeat key={p.id} player={p} showTiles={showAllTiles} />
            ))}
          </div>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-8 z-10">
            {rightPlayers.map((p) => (
              <PlayerSeat key={p.id} player={p} showTiles={showAllTiles} />
            ))}
          </div>

          <div
            className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 transition-all duration-500 ${
              player.roundResult === "win"
                ? "scale-110"
                : player.roundResult === "lose"
                  ? "opacity-60"
                  : ""
            }`}
          >
            {player.roundResult && (
              <div
                className={`text-xs font-bold px-3 py-1 rounded-full animate-fade-in ${
                  player.roundResult === "win"
                    ? "bg-[hsl(var(--gold))]/20 gold-text border border-[hsl(var(--gold))]/40"
                    : "bg-destructive/20 text-destructive border border-destructive/40"
                }`}
              >
                {player.roundResult === "win"
                  ? `🏆 +${player.roundDelta?.toLocaleString()}`
                  : `💔 ${player.roundDelta?.toLocaleString()}`}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div
                className={`w-11 h-11 rounded-md bg-secondary flex items-center justify-center text-xl transition-all duration-300 ${
                  player.roundResult === "win"
                    ? "border-2 border-[hsl(var(--gold))] ring-2 ring-[hsl(var(--gold))]/40"
                    : "border-2 border-[hsl(var(--gold))]"
                }`}
              >
                {player.avatar}
              </div>
              <div>
                <div className="text-xs text-foreground font-bold flex items-center gap-1">
                  {player.name}
                  {player.isDealer && (
                    <span className="px-1 bg-destructive text-destructive-foreground text-[10px] rounded">
                      Dealer
                    </span>
                  )}
                </div>
                <div className="gold-text text-xs font-bold font-display">
                  {player.chips.toLocaleString()}
                </div>
                {player.totalBetThisRound > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    Bet: {player.totalBetThisRound.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {isBetting && !player.hasFolded && (
              <BettingPanel
                chips={player.chips}
                currentBet={player.currentBet}
                minBet={game.minBet}
                canCheck={game.currentHighBet === 0}
                hasFolded={player.hasFolded}
                onAction={handleBetAction}
              />
            )}

            {player.hasFolded && !player.roundResult && (
              <div className="px-3 py-1 bg-destructive/20 border border-destructive/30 text-destructive text-xs font-bold rounded-full animate-fade-in">
                Folded ✕
              </div>
            )}
          </div>

          {/* Big slot-style win/lose banner */}
          {player.roundResult && (
            <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center">
              <div
                className={`px-6 py-2 rounded-full text-sm font-extrabold tracking-[0.2em] uppercase shadow-[0_0_35px_rgba(0,0,0,0.9)] border border-[hsl(var(--gold))]/60 bg-gradient-to-r ${
                  player.roundResult === "win"
                    ? "from-[#f5d36b] via-[#ffe9a3] to-[#f5d36b] text-[#4b2500] animate-bounce"
                    : "from-[#5a0000] via-[#a60000] to-[#5a0000] text-[#ffe2e2] animate-pulse"
                }`}
              >
                {player.roundResult === "win" ? "BIG WIN" : "ROUND LOST"}
              </div>
            </div>
          )}

          {isShowdown && game.lastResult && (
            <RoundResultOverlay
              result={game.lastResult}
              onDismiss={handleDismissResult}
            />
          )}
        </div>
      </div>
    </div>
  );
};
