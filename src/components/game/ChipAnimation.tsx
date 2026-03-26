import React, { useEffect, useState } from "react";

interface FlyingChip {
  id: number;
  startX: number;
  startY: number;
  size: number;
  delay: number;
}

interface ChipAnimationProps {
  amount: number;
  direction: "to-pot" | "from-pot";
  onComplete?: () => void;
}

export const ChipAnimation: React.FC<ChipAnimationProps> = ({
  amount,
  direction,
  onComplete,
}) => {
  const [chips, setChips] = useState<FlyingChip[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const count = Math.min(12, Math.max(4, Math.floor(amount / 10000)));
    const generated: FlyingChip[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      startX: (Math.random() - 0.5) * 60,
      startY: 0,
      size: 14 + Math.random() * 6,
      delay: i * 60,
    }));
    setChips(generated);

    const timeout = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, count * 60 + 600);

    return () => clearTimeout(timeout);
  }, [amount, onComplete]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {chips.map((chip) => (
        <div
          key={chip.id}
          className="absolute rounded-full"
          style={{
            width: chip.size,
            height: chip.size,
            left: `calc(50% + ${chip.startX}px)`,
            bottom: direction === "to-pot" ? "15%" : "50%",
            background: `radial-gradient(circle at 35% 35%, hsl(var(--gold-light)), hsl(var(--coin)), hsl(var(--coin-shadow)))`,
            border: "1px solid hsl(var(--gold-dark))",
            boxShadow: "1px 1px 3px rgba(0,0,0,0.5)",
            animation: `${direction === "to-pot" ? "chip-to-pot" : "chip-from-pot"} 0.5s ease-in forwards`,
            animationDelay: `${chip.delay}ms`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
};
