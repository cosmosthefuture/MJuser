import React from "react";

interface CoinPileProps {
  amount: number;
}

export const CoinPile: React.FC<CoinPileProps> = ({ amount }) => {
  const coinCount = Math.min(20, Math.max(8, Math.floor(amount / 30000)));

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-16">
        {Array.from({ length: coinCount }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-coin-drop"
            style={{
              width: 18 + Math.random() * 8,
              height: 18 + Math.random() * 8,
              left: `${20 + Math.random() * 50}%`,
              top: `${10 + Math.random() * 60}%`,
              background: `radial-gradient(circle at 35% 35%, hsl(var(--gold-light)), hsl(var(--coin)), hsl(var(--coin-shadow)))`,
              border: "1px solid hsl(var(--gold-dark))",
              boxShadow: "1px 1px 3px rgba(0,0,0,0.4)",
              animationDelay: `${i * 50}ms`,
              zIndex: i,
            }}
          />
        ))}
      </div>
      <div className="gold-text text-sm font-bold font-display">
        {amount.toLocaleString()}
      </div>
      <div className="text-[10px] text-destructive font-medium">(Pot)</div>
    </div>
  );
};
