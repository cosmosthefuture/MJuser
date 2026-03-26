import React, { useEffect, useState } from "react";
import { RoundResult } from "@/game/engine";

interface RoundResultOverlayProps {
  result: RoundResult;
  onDismiss: () => void;
}

export const RoundResultOverlay: React.FC<RoundResultOverlayProps> = ({
  result,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t1 = setTimeout(() => setShowDetails(true), 600);
    const t2 = setTimeout(() => onDismiss(), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDismiss]);

  const sorted = [...result.playerResults].sort((a, b) => b.value - a.value);

  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center rounded-[50%] transition-all duration-500 ${
        visible ? "bg-background/60 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={onDismiss}
    >
      <div
        className={`flex flex-col items-center gap-3 transition-all duration-700 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
      >
        <div className="relative">
          <div className="text-5xl animate-bounce-winner">🏆</div>
        </div>
        <div className="gold-text text-2xl font-display font-bold animate-winner-glow">
          {result.winnerName} Wins!
        </div>
        <div className="text-foreground text-sm">
          Points:{" "}
          <span className="gold-text font-bold text-lg">
            {result.winnerValue}
          </span>
        </div>
        <div className="gold-text text-lg font-bold animate-coin-fly">
          +{result.pot.toLocaleString()} 💰
        </div>

        {showDetails && (
          <div className="mt-2 bg-[hsl(var(--felt-dark))]/90 border border-[hsl(var(--gold))]/30 rounded-lg p-3 min-w-[240px] animate-fade-in-up">
            <div className="text-xs text-muted-foreground mb-2 text-center">
              Round Results
            </div>
            <div className="space-y-1">
              {sorted.map((pr, i) => (
                <div
                  key={pr.playerId}
                  className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                    pr.result === "win"
                      ? "bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/30"
                      : ""
                  }`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className="text-foreground">
                    {pr.result === "win" && "👑 "}#{i + 1}
                  </span>
                  <span className="text-muted-foreground">
                    Points {pr.value}
                  </span>
                  <span
                    className={`font-bold ${
                      pr.delta >= 0 ? "gold-text" : "text-destructive"
                    }`}
                  >
                    {pr.delta >= 0 ? "+" : ""}
                    {pr.delta.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-muted-foreground text-[10px] mt-2 animate-pulse">
          Click to continue
        </div>
      </div>
    </div>
  );
};
