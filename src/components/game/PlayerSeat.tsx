import React from "react";
import { Player, calculateTileValue } from "@/game/engine";
import { DominoTileComponent } from "./DominoTile";

interface PlayerSeatProps {
  player: Player;
  showTiles: boolean;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  showTiles,
}) => {
  const value = calculateTileValue(player.tiles);
  const chipDisplay =
    player.chips >= 0
      ? player.chips.toLocaleString()
      : `-${Math.abs(player.chips).toLocaleString()}`;

  const isWinner = player.roundResult === "win";
  const isLoser = player.roundResult === "lose";

  return (
    <div
      className={`flex flex-col items-center gap-1 transition-all duration-500 ${
        isWinner ? "scale-110 animate-pulse-gold" : ""
      } ${isLoser ? "opacity-50 scale-95" : ""} ${
        player.hasFolded && !player.roundResult ? "opacity-40 grayscale" : ""
      }`}
    >
      {player.roundResult && (
        <div
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full animate-fade-in ${
            isWinner
              ? "bg-[hsl(var(--gold))]/20 gold-text"
              : "bg-destructive/20 text-destructive"
          }`}
        >
          {isWinner
            ? `+${player.roundDelta?.toLocaleString()}`
            : player.roundDelta?.toLocaleString()}
        </div>
      )}

      {player.hasFolded && !player.roundResult && (
        <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/30 text-destructive">
          Folded
        </div>
      )}

      <div className="flex items-center gap-2">
        <div
          className={`w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-lg overflow-hidden transition-all duration-300 ${
            isWinner
              ? "border-2 border-[hsl(var(--gold))] ring-2 ring-[hsl(var(--gold))]/30"
              : "border border-border"
          }`}
        >
          {player.avatar}
        </div>
        <div className="text-left">
          <div className="text-xs text-foreground font-medium truncate max-w-[70px]">
            {player.name}
            {player.isDealer && (
              <span className="ml-1 px-1 bg-destructive text-destructive-foreground text-[8px] rounded">
                D
              </span>
            )}
          </div>
          <div
            className={`text-xs font-bold ${
              player.chips >= 0 ? "gold-text" : "text-destructive"
            }`}
          >
            {chipDisplay}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mt-1">
        {player.tiles.map((tile, i) => (
          <DominoTileComponent
            key={tile.id}
            top={showTiles ? tile.top : 0}
            bottom={showTiles ? tile.bottom : 0}
            faceDown={!showTiles}
            size="sm"
            animationDelay={i * 100}
          />
        ))}
      </div>

      {showTiles && (
        <div
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            value >= 7
              ? "bg-[hsl(var(--gold))]/20 gold-text"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {value} pts
        </div>
      )}

      {player.totalBetThisRound > 0 && !player.roundResult && (
        <div className="flex items-center gap-1 mt-0.5">
          <div className="w-3 h-3 rounded-full bg-[hsl(var(--coin))] coin-glow" />
          <span className="text-[10px] gold-text font-bold">
            {player.totalBetThisRound.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
};
