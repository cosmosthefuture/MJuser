export type LobbyTheme = {
  badge: string;
  button: string;
  chip: string;
  glow: string;
  rail: string;
  seat: string;
  table: string;
};

const lobbyThemes: LobbyTheme[] = [
  {
    badge: "bg-[#fff1c8] text-[#8d2b30]",
    button: "bg-[#962933] text-[#fff8e6]",
    chip: "bg-[#ffe09b] text-[#7a3b10]",
    glow: "bg-[#ffca70]/55",
    rail: "from-[#f9dca2] via-[#f0bc67] to-[#af6f2f]",
    seat: "bg-[#fff3dd]/95",
    table: "bg-[radial-gradient(circle_at_50%_18%,#f1767b_0%,#cb3047_42%,#7f1525_100%)]",
  },
  {
    badge: "bg-[#dff5ff] text-[#124366]",
    button: "bg-[#155a89] text-[#effaff]",
    chip: "bg-[#aee4ff] text-[#144d6d]",
    glow: "bg-[#7fd0ff]/55",
    rail: "from-[#e8f7ff] via-[#99d5ff] to-[#3a8ad0]",
    seat: "bg-[#effaff]/95",
    table: "bg-[radial-gradient(circle_at_50%_18%,#5daef5_0%,#1a75cf_42%,#0e3966_100%)]",
  },
  {
    badge: "bg-[#fbe5ff] text-[#5f2469]",
    button: "bg-[#6c2a74] text-[#fff2ff]",
    chip: "bg-[#f5b5ff] text-[#672c73]",
    glow: "bg-[#f09cff]/50",
    rail: "from-[#fff0ff] via-[#eb9fff] to-[#a248b4]",
    seat: "bg-[#fff1ff]/95",
    table: "bg-[radial-gradient(circle_at_50%_18%,#ca79ff_0%,#8a32bc_42%,#401557_100%)]",
  },
  {
    badge: "bg-[#e9ffd6] text-[#31591a]",
    button: "bg-[#3f7a1f] text-[#f5ffe6]",
    chip: "bg-[#dbf5a0] text-[#3f5d1d]",
    glow: "bg-[#d5f382]/50",
    rail: "from-[#fbffe8] via-[#d6f78e] to-[#7cb942]",
    seat: "bg-[#f6ffe8]/95",
    table: "bg-[radial-gradient(circle_at_50%_18%,#89cc5b_0%,#4d9737_42%,#1f4d1c_100%)]",
  },
];

export function getLobbyTheme(index = 0) {
  return lobbyThemes[Math.abs(index) % lobbyThemes.length];
}

export function getStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "active" || normalized === "open") {
    return "Open";
  }

  if (normalized === "maintenance") {
    return "Pause";
  }

  return "Soon";
}

export function getGamePresentation(gameId: number, gameName: string) {
  const normalized = gameName.toLowerCase();

  if (gameId === 1 || normalized.includes("mahjong")) {
    return {
      eyebrow: "Strategy Room",
      href: "/mahjong",
      imageAlt: "Mahjong",
      imageSrc: "/images/img/mjlogo.png",
      subtitle: "Read the wall, manage the pace, and settle in for deeper rounds.",
    };
  }

  if (normalized.includes("coin")) {
    return {
      eyebrow: "Quick Flip",
      href: `/game-rooms?game_id=${gameId}`,
      imageAlt: gameName,
      imageSrc: "/images/coin_flip_one.webp",
      subtitle: "Fast tables, short rounds, and live player movement.",
    };
  }

  if (normalized.includes("domino")) {
    return {
      eyebrow: "House Classic",
      href: "/domino",
      imageAlt: gameName,
      imageSrc: "/images/img/cardlogo.png",
      subtitle: "Classic table play with clean felt visuals and steady bets.",
    };
  }

  return {
    eyebrow: "Live Table",
    href: `/game-rooms?game_id=${gameId}`,
    imageAlt: gameName,
    imageSrc: "/images/img/cardlogo.png",
    subtitle: "Step into the lobby, choose a room, and join the next open round.",
  };
}
