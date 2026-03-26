import React, { useState } from "react";

export type BetAction = "bet" | "raise" | "fold" | "check";

interface BettingPanelProps {
  chips: number;
  currentBet: number;
  minBet: number;
  canCheck: boolean;
  hasFolded: boolean;
  onAction: (action: BetAction, amount?: number) => void;
}

const BET_PRESETS = [
  { label: "1x", multiplier: 1 },
  { label: "2x", multiplier: 2 },
  { label: "5x", multiplier: 5 },
  { label: "All In", multiplier: -1 },
];

export const BettingPanel: React.FC<BettingPanelProps> = ({
  chips,
  currentBet,
  minBet,
  canCheck,
  hasFolded,
  onAction,
}) => {
  const [showPresets, setShowPresets] = useState(false);

  if (hasFolded) {
    return (
      <div className="flex items-center gap-2 animate-fade-in">
        <div className="px-4 py-2 rounded-lg bg-destructive/20 border border-destructive/30 text-destructive text-sm font-bold">
          Folded ✕
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in-up">
      {currentBet > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          Current bet:{" "}
          <span className="gold-text font-bold">
            {currentBet.toLocaleString()}
          </span>
        </div>
      )}

      {showPresets && (
        <div className="flex gap-1.5 animate-fade-in-up">
          {BET_PRESETS.map(({ label, multiplier }) => {
            const amount = multiplier === -1 ? chips : minBet * multiplier;
            const disabled = amount > chips;
            return (
              <button
                key={label}
                disabled={disabled}
                onClick={() => {
                  onAction("bet", amount);
                  setShowPresets(false);
                }}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-200 
                  ${
                    multiplier === -1
                      ? "bg-destructive/80 text-destructive-foreground hover:bg-destructive border border-destructive/50 hover:scale-110"
                      : "bg-[hsl(var(--gold))]/20 gold-text border border-[hsl(var(--gold))]/30 hover:bg-[hsl(var(--gold))]/40 hover:scale-105"
                  }
                  ${disabled ? "opacity-30 cursor-not-allowed hover:scale-100" : "cursor-pointer"}
                `}
              >
                {label}
                <div className="text-[8px] opacity-70">
                  {amount.toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onAction("fold")}
          className="group relative px-4 py-2 rounded-lg bg-secondary border border-border text-foreground text-xs font-bold 
            hover:bg-destructive/20 hover:border-destructive/40 hover:text-destructive
            transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <span className="flex items-center gap-1">✕ Fold</span>
        </button>

        {canCheck && (
          <button
            onClick={() => onAction("check")}
            className="px-4 py-2 rounded-lg bg-secondary border border-border text-foreground text-xs font-bold 
              hover:bg-[hsl(var(--felt-light))] hover:border-[hsl(var(--gold))]/30
              transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <span className="flex items-center gap-1">✓ Check</span>
          </button>
        )}

        <button
          onClick={() => setShowPresets((prev) => !prev)}
          className="px-5 py-2 rounded-lg bg-[hsl(var(--gold))]/20 border border-[hsl(var(--gold))]/40 text-xs font-bold gold-text
            hover:bg-[hsl(var(--gold))]/30 hover:border-[hsl(var(--gold))]/60
            transition-all duration-200 hover:scale-105 active:scale-95 animate-pulse-gold"
        >
          <span className="flex items-center gap-1">
            💰 {currentBet > 0 ? "Raise" : "Bet"}
          </span>
        </button>

        <button
          onClick={() => onAction("bet", chips)}
          className="px-4 py-2 rounded-lg bg-destructive/80 border border-destructive/50 text-destructive-foreground text-xs font-bold
            hover:bg-destructive hover:scale-105
            transition-all duration-200 active:scale-95"
        >
          <span className="flex items-center gap-1">🔥 All in</span>
        </button>
      </div>
    </div>
  );
};
