"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { useSelector } from "react-redux";
import MahjongTileCard from "./components/MahjongTileCard";
import FlowerTilesPanel from "./components/FlowerTilesPanel";
import { MahjongTile } from "@/lib/mahjong72";
import { fetchMahjongJoinToken } from "@/lib/mahjongRoomApi";
import { connectSocket, getSocket } from "@/lib/wsClient";
import type { RootState } from "@/redux/store";
import { fetchWsJwtToken } from "@/lib/wsTokenApi";
import { getUserAvatarSrc } from "@/lib/avatar";

type MahjongRoomState = unknown;

type RoundPlayer = {
  userId: number;
  name: string;
  seatPosition: number;
};

type WsTile = {
  id: number | null;
  type: "dot" | "bamboo" | "hidden" | string;
  number: number | null;
  copy_no: number | null;
};

type ClientTile = MahjongTile & { id: number };

type LastDiscardTile = MahjongTile & {
  tileId?: number;
  userId?: number;
  seat?: number;
};

type WinnerRevealPayload = {
  winner_user_id?: unknown;
  winner_userid?: unknown;
  winnerUserId?: unknown;
  winner_user_name?: unknown;
  winner_username?: unknown;
  winnerUserName?: unknown;
  name?: unknown;
  handTiles?: unknown;
  pair?: unknown;
  chow?: unknown;
  pong?: unknown;
  kong?: unknown;
  winType?: string;
  isPure?: boolean;
  payouts?: Array<{ payerId: string; amount: number }>;
};

type CanKongPayload = {
  canKong?: unknown;
  groups?: unknown;
};

type CanPongPayload = {
  canPong?: unknown;
  groups?: unknown;
};

type CanChowPayload = {
  canChow?: unknown;
  groups?: unknown;
};

type WinnerRevealState = {
  winnerUserId: number;
  winnerName: string;
  resultLabel: string;
  tiles: MahjongTile[];
  melds: Array<{
    kind: "chow" | "pong" | "kong";
    tiles: MahjongTile[];
  }>;
  winType?: string;
  isPure?: boolean;
  payouts?: Array<{ payerId: string; amount: number }>;
};

const MahjongPixiTable = dynamic(() => import("./MahjongPixiTable"), {
  ssr: false,
});

export default function MahjongClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdParam = searchParams.get("room_id");
  const roomId = roomIdParam ? Number(roomIdParam) : null;
  const token = useSelector((s: RootState) => s.auth.token);
  const authUserId = useSelector((s: RootState) =>
    s.auth.id ? Number(s.auth.id) : null,
  );

  const [isViewportReady, setIsViewportReady] = useState(false);
  const [viewport, setViewport] = useState({
    width: 1280,
    height: 720,
  });

  const [joinError, setJoinError] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<MahjongRoomState | null>(null);
  const [centerMessage, setCenterMessage] = useState<string | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceFaces, setDiceFaces] = useState<[number, number] | null>(null);
  const [showDrawPile, setShowDrawPile] = useState(false);
  const [startRoundPromptOpen, setStartRoundPromptOpen] = useState(false);
  const [showEndRoundButton, setShowEndRoundButton] = useState(false);
  const [isEndingRound, setIsEndingRound] = useState(false);
  const [turnCountdown, setTurnCountdown] = useState<{
    userId: number;
    remaining: number;
    duration: number;
  } | null>(null);
  const [winnerReveal, setWinnerReveal] = useState<WinnerRevealState | null>(
    null,
  );
  const [kongDecision, setKongDecision] = useState<{
    kind: "kong" | "interrupt_kong" | "normal_kong";
    groups: Array<{
      kongKey: string;
      displayKey: string;
      tiles: MahjongTile[];
    }>;
  } | null>(null);
  const [pongDecision, setPongDecision] = useState<{
    kind: "interrupt_pong" | "normal_pong";
    groups: Array<{
      pongKey: string;
      displayKey: string;
      tiles: MahjongTile[];
    }>;
  } | null>(null);

  const [chowDecision, setChowDecision] = useState<{
    kind: "normal_chow";
    groups: Array<{
      chowKey: string;
      displayKey: string;
      tiles: MahjongTile[];
    }>;
  } | null>(null);

  const [winDecision, setWinDecision] = useState<{
    userId: number;
    message: string;
  } | null>(null);

  const [canTakeShownTileDecision, setCanTakeShownTileDecision] = useState<{
    shownTiles: Array<{
      id: number;
      type: "dot" | "bamboo";
      number: number;
      copy_no: number;
      tile: MahjongTile;
    }>;
  } | null>(null);

  const [shownTiles, setShownTiles] = useState<MahjongTile[]>([]);

  const sortHandInFlightRef = useRef(false);
  const isDecisionModalOpen =
    kongDecision != null ||
    pongDecision != null ||
    chowDecision != null ||
    winDecision != null ||
    canTakeShownTileDecision != null;

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.visualViewport?.width ?? window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
      });
      setIsViewportReady(true);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, []);

  const emitAcceptKong = (kongKey: string) => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:accept_kong", {
      roomId: String(roomId),
      userId: authUserId,
      kongKey,
    });
    socket.emit("mahjong:accept_kong", {
      roomId: String(roomId),
      userId: authUserId,
      kongKey,
    });
  };

  const emitPassKong = () => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:pass_kong", {
      roomId: String(roomId),
      userId: authUserId,
    });
    socket.emit("mahjong:pass_kong", {
      roomId: String(roomId),
      userId: authUserId,
    });
  };

  const emitAcceptNormalKong = (kongKey: string) => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:accept_normal_kong", {
      roomId: String(roomId),
      userId: authUserId,
      kongKey,
    });
    socket.emit("mahjong:accept_normal_kong", {
      roomId: String(roomId),
      userId: authUserId,
      kongKey,
    });
  };

  const emitPassNormalKong = () => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:pass_normal_kong", {
      roomId: String(roomId),
      userId: authUserId,
    });
    socket.emit("mahjong:pass_normal_kong", {
      roomId: String(roomId),
      userId: authUserId,
    });
  };

  const emitTemporaryStartRound = () => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:temporary_start_round", {
      roomId: String(roomId),
      userId: authUserId,
    });
    socket.emit("mahjong:temporary_start_round", {
      roomId: String(roomId),
      userId: authUserId,
    });
  };

  const emitTemporaryEndRound = () => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null) return;
    setIsEndingRound(true);
    console.log("[ws] emit mahjong:temporary_end_round", {
      roomId: String(roomId),
    });
    socket.emit("mahjong:temporary_end_round", {
      roomId: String(roomId),
    });
  };

  const emitAcceptInterruptKong = (kongKey: string) => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:accept_interrupt_kong", {
      roomId: String(roomId),
      userId: authUserId,
      kongKey,
    });
    socket.emit("mahjong:accept_interrupt_kong", {
      roomId: String(roomId),
      userId: authUserId,
      kongKey,
    });
  };

  const emitDiscardTile = (tileId: number) => {
    if (isDecisionModalOpen) return;
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:discard_tile", {
      roomId: String(roomId),
      userId: authUserId,
      tileId,
    });
    socket.emit("mahjong:discard_tile", {
      roomId: String(roomId),
      userId: authUserId,
      tileId,
    });
  };

  const emitSortHand = () => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    sortHandInFlightRef.current = true;
    console.log("[ws] emit mahjong:sort_hand", {
      roomId: String(roomId),
      userId: authUserId,
    });
    socket.emit("mahjong:sort_hand", {
      roomId: String(roomId),
      userId: authUserId,
    });
  };

  const emitAcceptInterruptPong = (pongKey: string) => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:accept_interrupt_pong", {
      roomId: String(roomId),
      userId: authUserId,
      pongKey,
    });
    socket.emit("mahjong:accept_interrupt_pong", {
      roomId: String(roomId),
      userId: authUserId,
      pongKey,
    });
  };

  const emitAcceptNormalPong = (pongKey: string) => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:accept_normal_pong", {
      roomId: String(roomId),
      userId: authUserId,
      pongKey,
    });
    socket.emit("mahjong:accept_normal_pong", {
      roomId: String(roomId),
      userId: authUserId,
      pongKey,
    });
  };

  const emitPassNormalPong = () => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:pass_normal_pong", {
      roomId: String(roomId),
      userId: authUserId,
    });
    socket.emit("mahjong:pass_normal_pong", {
      roomId: String(roomId),
      userId: authUserId,
    });
  };

  const emitAcceptNormalChow = (chowKey: string) => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:accept_normal_chow", {
      roomId: String(roomId),
      userId: authUserId,
      chowKey,
    });
    socket.emit("mahjong:accept_normal_chow", {
      roomId: String(roomId),
      userId: authUserId,
      chowKey,
    });
  };

  const emitPassNormalChow = () => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:pass_normal_chow", {
      roomId: String(roomId),
      userId: authUserId,
    });
    socket.emit("mahjong:pass_normal_chow", {
      roomId: String(roomId),
      userId: authUserId,
    });
  };

  const emitAcceptWin = (userId: number) => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null) return;
    if (!Number.isFinite(userId)) return;
    console.log("[ws] emit mahjong:accept_win", {
      roomId: String(roomId),
      userId,
    });
    socket.emit("mahjong:accept_win", {
      roomId: String(roomId),
      userId,
    });
  };

  const emitPassWin = (userId: number) => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null) return;
    if (!Number.isFinite(userId)) return;
    console.log("[ws] emit mahjong:pass_win", {
      roomId: String(roomId),
      userId,
    });
    socket.emit("mahjong:pass_win", {
      roomId: String(roomId),
      userId,
    });
  };

  const emitAcceptShownTile = (tileId: number, tileIndex: number) => {
    const socket = getSocket();
    if (!socket) return;
    if (roomId == null || authUserId == null) return;
    console.log("[ws] emit mahjong:accept_shown_tile", {
      roomId: String(roomId),
      userId: authUserId,
      tileId,
      tileIndex,
    });
    socket.emit("mahjong:accept_shown_tile", {
      roomId: String(roomId),
      userId: authUserId,
      tileId,
      tileIndex,
    });
  };

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    // Dev-only helper for testing the winner modal from the browser console:
    // `globalThis.__mj_triggerWinnerReveal()`
    (
      globalThis as unknown as { __mj_triggerWinnerReveal?: () => void }
    ).__mj_triggerWinnerReveal = () => {
      const payload = {
        winner_user_id: 1,
        winner_user_name: "User One",
        pair: [
          { id: 25, type: "dot", number: 7, copy_no: 1 },
          { id: 28, type: "dot", number: 7, copy_no: 4 },
        ],
        chow: [
          {
            chow_key: "dot_3_4_5",
            tiles: [
              { id: 12, type: "dot", number: 3, copy_no: 4 },
              { id: 13, type: "dot", number: 4, copy_no: 1 },
              { id: 20, type: "dot", number: 5, copy_no: 4 },
            ],
          },
          {
            chow_key: "dot_7_8_9",
            tiles: [
              { id: 27, type: "dot", number: 7, copy_no: 3 },
              { id: 31, type: "dot", number: 8, copy_no: 3 },
              { id: 35, type: "dot", number: 9, copy_no: 3 },
            ],
          },
        ],
        pong: [
          {
            pong_key: "bamboo_7",
            tiles: [
              { id: 63, type: "bamboo", number: 7, copy_no: 3 },
              { id: 64, type: "bamboo", number: 7, copy_no: 4 },
              { id: 62, type: "bamboo", number: 7, copy_no: 2 },
            ],
          },
          {
            pong_key: "bamboo_8",
            tiles: [
              { id: 65, type: "bamboo", number: 8, copy_no: 1 },
              { id: 67, type: "bamboo", number: 8, copy_no: 3 },
              { id: 68, type: "bamboo", number: 8, copy_no: 4 },
            ],
          },
        ],
        kong: [],
        winType: "self-draw",
        isPure: false,
        payouts: [{ payerId: "2", amount: 1 }],
      };
      console.log("[dev] trigger mahjong:winner_reveal", payload);
      setWinnerReveal({
        winnerUserId: 1,
        winnerName: "User One",
        resultLabel:
          authUserId != null ? (authUserId === 1 ? "You Win" : "You Lose") : "",
        tiles: [
          { suit: "dots", rank: 7 },
          { suit: "dots", rank: 7 },
        ],
        melds: [
          {
            kind: "chow",
            tiles: [
              { suit: "dots", rank: 3 },
              { suit: "dots", rank: 4 },
              { suit: "dots", rank: 5 },
            ],
          },
          {
            kind: "chow",
            tiles: [
              { suit: "dots", rank: 7 },
              { suit: "dots", rank: 8 },
              { suit: "dots", rank: 9 },
            ],
          },
          {
            kind: "pong",
            tiles: [
              { suit: "bamboo", rank: 7 },
              { suit: "bamboo", rank: 7 },
              { suit: "bamboo", rank: 7 },
            ],
          },
          {
            kind: "pong",
            tiles: [
              { suit: "bamboo", rank: 8 },
              { suit: "bamboo", rank: 8 },
              { suit: "bamboo", rank: 8 },
            ],
          },
        ],
        winType: payload.winType,
        isPure: payload.isPure,
        payouts: payload.payouts,
      });
    };

    // Dev-only helper for testing the shown tiles update from the browser console:
    // `globalThis.__mj_triggerShownTilesUpdated()`
    (
      globalThis as unknown as { __mj_triggerShownTilesUpdated?: () => void }
    ).__mj_triggerShownTilesUpdated = () => {
      const payload = {
        shownTiles: [
          { id: 45, type: "dot", number: 7, copy_no: 2 },
          { id: 22, type: "bamboo", number: 3, copy_no: 1 },
        ],
      };
      console.log("[dev] trigger mahjong:shown_tiles_updated", payload);
      const nextShownTiles: MahjongTile[] = [];
      for (const t of payload.shownTiles) {
        const rank = Number(t.number);
        const suit: MahjongTile["suit"] | null =
          t.type === "bamboo" ? "bamboo" : t.type === "dot" ? "dots" : null;
        if (suit && Number.isFinite(rank)) {
          nextShownTiles.push({ suit, rank });
        }
      }
      setShownTiles(nextShownTiles);
    };

    // Dev-only helper for testing the kong modal from the browser console:
    // `globalThis.__mj_triggerCanKong()`
    (
      globalThis as unknown as { __mj_triggerCanKong?: () => void }
    ).__mj_triggerCanKong = () => {
      // Mirror the WS payload shape for easier testing.
      const payload = {
        canKong: true,
        groups: [
          {
            tileKey: "bamboo_1",
            tiles: [
              { id: 8881, type: "bamboo", number: 1, copy_no: 1 },
              { id: 8882, type: "bamboo", number: 1, copy_no: 2 },
              { id: 8883, type: "bamboo", number: 1, copy_no: 3 },
              { id: 8884, type: "bamboo", number: 1, copy_no: 4 },
            ],
          },
        ],
      };
      console.log("[dev] trigger mahjong:can_kong", payload);

      setKongDecision({
        kind: "kong",
        groups: payload.groups.map((g) => ({
          kongKey: g.tileKey,
          displayKey: g.tileKey.replace(/_/g, " "),
          tiles: g.tiles.map((t) => ({
            suit: t.type === "bamboo" ? "bamboo" : "dots",
            rank: t.number,
          })),
        })),
      });
    };

    // Dev-only helper for testing the pong bar from the browser console:
    // `globalThis.__mj_triggerCanInterruptPong()`
    (
      globalThis as unknown as { __mj_triggerCanInterruptPong?: () => void }
    ).__mj_triggerCanInterruptPong = () => {
      const payload = {
        canPong: true,
        groups: [
          {
            tileKey: "bamboo_1",
            tiles: [
              { id: 8881, type: "bamboo", number: 1, copy_no: 1 },
              { id: 8882, type: "bamboo", number: 1, copy_no: 2 },
              { id: 8883, type: "bamboo", number: 1, copy_no: 3 },
            ],
          },
        ],
      };
      console.log("[dev] trigger mahjong:can_interrupt_pong", payload);
      setPongDecision({
        kind: "interrupt_pong",
        groups: payload.groups.map((g) => ({
          pongKey: g.tileKey,
          displayKey: g.tileKey.replace(/_/g, " "),
          tiles: g.tiles.map((t) => ({
            suit: t.type === "bamboo" ? "bamboo" : "dots",
            rank: t.number,
          })),
        })),
      });
    };

    // Dev-only helper for testing the chow bar from the browser console:
    // `globalThis.__mj_triggerCanNormalChow()`
    (
      globalThis as unknown as { __mj_triggerCanNormalChow?: () => void }
    ).__mj_triggerCanNormalChow = () => {
      const payload = {
        canChow: true,
        groups: [
          {
            tileKey: "bamboo_4_5_6",
            tiles: [
              { id: 52, type: "bamboo", number: 4, copy_no: 4 },
              { id: 53, type: "bamboo", number: 5, copy_no: 1 },
              { id: 60, type: "bamboo", number: 6, copy_no: 4 },
            ],
          },
          {
            tileKey: "bamboo_3_4_5",
            tiles: [
              { id: 44, type: "bamboo", number: 3, copy_no: 4 },
              { id: 53, type: "bamboo", number: 4, copy_no: 1 },
              { id: 51, type: "bamboo", number: 5, copy_no: 4 },
            ],
          },
        ],
      };
      console.log("[dev] trigger mahjong:can_normal_chow", payload);
      setChowDecision({
        kind: "normal_chow",
        groups: payload.groups.map((g) => ({
          chowKey: g.tileKey,
          displayKey: g.tileKey.replace(/_/g, " "),
          tiles: g.tiles.map((t) => ({
            suit: t.type === "bamboo" ? "bamboo" : "dots",
            rank: t.number,
          })),
        })),
      });
    };

    // Dev-only helper for testing the win decision modal from the browser console:
    // `globalThis.__mj_triggerWinDecision()`
    (
      globalThis as unknown as { __mj_triggerWinDecision?: () => void }
    ).__mj_triggerWinDecision = () => {
      const message = "胡牌？";
      console.log("[dev] trigger mahjong:ask_win_decision", { message });
      setWinDecision({ userId: authUserId ?? 0, message });
    };

    // Dev-only helper for testing the can take shown tile modal from the browser console:
    // `globalThis.__mj_triggerCanTakeShownTile()`
    (
      globalThis as unknown as { __mj_triggerCanTakeShownTile?: () => void }
    ).__mj_triggerCanTakeShownTile = () => {
      const payload = {
        shownTiles: [
          { id: 45, type: "dot", number: 7, copy_no: 2 },
          { id: 22, type: "bamboo", number: 3, copy_no: 1 },
        ],
      };
      console.log("[dev] trigger mahjong:can_take_shown_tile", payload);
      setCanTakeShownTileDecision({
        shownTiles: payload.shownTiles.map((t) => ({
          id: t.id,
          type: t.type as "dot" | "bamboo",
          number: t.number,
          copy_no: t.copy_no,
          tile: {
            suit: t.type === "bamboo" ? "bamboo" : "dots",
            rank: t.number,
          },
        })),
      });
    };

    return () => {
      delete (
        globalThis as unknown as { __mj_triggerWinnerReveal?: () => void }
      ).__mj_triggerWinnerReveal;
      delete (globalThis as unknown as { __mj_triggerCanKong?: () => void })
        .__mj_triggerCanKong;
      delete (
        globalThis as unknown as { __mj_triggerCanInterruptPong?: () => void }
      ).__mj_triggerCanInterruptPong;
      delete (
        globalThis as unknown as { __mj_triggerCanNormalChow?: () => void }
      ).__mj_triggerCanNormalChow;
      delete (globalThis as unknown as { __mj_triggerWinDecision?: () => void })
        .__mj_triggerWinDecision;
      delete (
        globalThis as unknown as { __mj_triggerCanTakeShownTile?: () => void }
      ).__mj_triggerCanTakeShownTile;
    };
  }, [authUserId]);
  const [roundPlayers, setRoundPlayers] = useState<RoundPlayer[]>([]);
  const [selfSeatPosition, setSelfSeatPosition] = useState<number | null>(null);
  const [activePlayerUserId, setActivePlayerUserId] = useState<number | null>(
    null,
  );
  const [activeSides, setActiveSides] = useState<
    Array<"bottom" | "right" | "top" | "left">
  >([]);
  const [opponentHandCounts, setOpponentHandCounts] = useState<
    Partial<Record<"right" | "top" | "left", number>>
  >({});

  const [opponentMelds, setOpponentMelds] = useState<
    Partial<
      Record<
        "right" | "top" | "left",
        Array<{ kind: "pong" | "chow" | "kong"; tiles: MahjongTile[] }>
      >
    >
  >({});

  const [,] = useState<MahjongTile[]>([]);
  const [hand, setHand] = useState<ClientTile[]>([]);
  const [selfMelds, setSelfMelds] = useState<
    Array<{
      kind: "pong" | "chow" | "kong";
      meldKey: string;
      tiles: Array<MahjongTile & { id: number }>;
    }>
  >([]);
  const [discards, setDiscards] = useState<MahjongTile[]>([]);
  const [selfDiscardTiles, setSelfDiscardTiles] = useState<MahjongTile[]>([]);
  const [rightDiscardTiles, setRightDiscardTiles] = useState<MahjongTile[]>([]);
  const [topDiscardTiles, setTopDiscardTiles] = useState<MahjongTile[]>([]);
  const [leftDiscardTiles, setLeftDiscardTiles] = useState<MahjongTile[]>([]);
  const [drawPileCount, setDrawPileCount] = useState<number | null>(null);
  const [lastDiscardSide, setLastDiscardSide] = useState<
    "bottom" | "right" | "top" | "left" | null
  >(null);

  useEffect(() => {
    if (!token) return;
    if (!roomId || !Number.isFinite(roomId)) return;

    let cancelled = false;
    let diceTimer: number | null = null;

    const ensureSocket = async () => {
      const existing = getSocket();
      if (existing) return existing;

      const wsToken = await fetchWsJwtToken();
      if (cancelled) return null;
      return connectSocket({ token: wsToken });
    };

    const applyInitialHandState = (payload: unknown) => {
      if (cancelled) return;
      const handStateRaw = Array.isArray(payload)
        ? payload
        : (payload as { handState?: unknown })?.handState;
      if (!Array.isArray(handStateRaw)) return;
      const handState = handStateRaw as unknown[];

      const shownTilesRawInPayload = (payload as { shownTiles?: unknown })
        ?.shownTiles;
      if (Array.isArray(shownTilesRawInPayload)) {
        const nextShownTiles: MahjongTile[] = [];
        for (const t of shownTilesRawInPayload) {
          if (typeof t !== "object" || t === null) continue;
          const rank = Number((t as { number?: unknown }).number);
          const typeRaw = (t as { type?: unknown }).type;
          const suit: MahjongTile["suit"] | null =
            typeRaw === "bamboo" ? "bamboo" : typeRaw === "dot" ? "dots" : null;
          if (suit && Number.isFinite(rank)) {
            nextShownTiles.push({ suit, rank });
          }
        }
        setShownTiles(nextShownTiles);
      }

      const isSortUpdate = sortHandInFlightRef.current;
      sortHandInFlightRef.current = false;

      // Clear transient "Shuffling Tiles" message once hands arrive.
      setCenterMessage(null);
      setWinnerReveal(null);
      if (!isSortUpdate) {
        setKongDecision(null);
        setPongDecision(null);
        setChowDecision(null);
      }

      // Once hands are dealt, hide dice overlay and show draw pile box.
      setDiceRolling(false);
      setDiceFaces(null);
      setShowDrawPile(true);

      // Map non-self players' tileCount to the corresponding side so the small
      // wall blocks match the hidden hand size (commonly 13).
      const nextOpponentCounts: Partial<
        Record<"right" | "top" | "left", number>
      > = {};

      const getSeatNumber = (raw: unknown): number | null => {
        if (typeof raw !== "object" || raw === null) return null;
        const seatRaw =
          (raw as { seat?: unknown }).seat ??
          (raw as { seat_position?: unknown; seatPosition?: unknown })
            .seat_position ??
          (raw as { seat_position?: unknown; seatPosition?: unknown })
            .seatPosition;
        const seat = Number(seatRaw);
        return Number.isFinite(seat) ? seat : null;
      };

      const selfSeat = (() => {
        const selfPlayer = handState.find(
          (p) =>
            typeof p === "object" &&
            p !== null &&
            (p as { isSelf?: unknown }).isSelf === true,
        );
        return getSeatNumber(selfPlayer);
      })();

      setSelfSeatPosition(selfSeat);

      const opponentCount = handState.filter(
        (p) =>
          typeof p === "object" &&
          p !== null &&
          (p as { isSelf?: unknown }).isSelf !== true,
      ).length;

      const sideFromSeats = (
        selfSeatNo: number | null,
        otherSeatNo: number | null,
      ): "right" | "top" | "left" | null => {
        if (opponentCount === 1) return "right";
        if (selfSeatNo == null || otherSeatNo == null) return null;
        const delta = (((otherSeatNo - selfSeatNo) % 4) + 4) % 4;
        if (delta === 1) return "left";
        if (delta === 2) return "top";
        if (delta === 3) return "right";
        return null;
      };

      // Decide which wall sides to render based on actual seat positions.
      // This keeps the wall/tiles aligned with seat labels for any logged-in user.
      if (selfSeat != null) {
        const sidesSet = new Set<"bottom" | "right" | "top" | "left">([
          "bottom",
        ]);
        for (const p of handState) {
          if (typeof p !== "object" || p === null) continue;
          if ((p as { isSelf?: unknown }).isSelf === true) continue;
          const side = sideFromSeats(selfSeat, getSeatNumber(p));
          if (side) sidesSet.add(side);
        }
        const ordered: Array<"bottom" | "right" | "top" | "left"> = [
          "bottom",
          "right",
          "top",
          "left",
        ];
        setActiveSides(ordered.filter((s) => sidesSet.has(s)));
      } else {
        const count = handState.length;
        if (count >= 1) {
          const sides: Array<"bottom" | "right" | "top" | "left"> = ["bottom"];
          if (count >= 2) sides.push("right");
          if (count >= 3) sides.push("top");
          if (count >= 4) sides.push("left");
          setActiveSides(sides);
        }
      }

      const normalizeOpponentMeldTiles = (raw: unknown): MahjongTile[] => {
        if (!Array.isArray(raw)) return [];
        const out: MahjongTile[] = [];
        for (const t of raw as WsTile[]) {
          if (typeof t !== "object" || t === null) continue;
          if (t.type === "hidden") continue;
          const rank = Number(t.number);
          if (!Number.isFinite(rank) || rank < 1 || rank > 9) continue;
          const suit: MahjongTile["suit"] | null =
            t.type === "bamboo" ? "bamboo" : t.type === "dot" ? "dots" : null;
          if (!suit) continue;
          out.push({ suit, rank });
        }
        return out;
      };

      const nextOpponentMelds: Partial<
        Record<
          "right" | "top" | "left",
          Array<{ kind: "pong" | "chow" | "kong"; tiles: MahjongTile[] }>
        >
      > = {};
      const nextRightDiscards: MahjongTile[] = [];
      const nextTopDiscards: MahjongTile[] = [];
      const nextLeftDiscards: MahjongTile[] = [];
      for (const p of handState) {
        if (typeof p !== "object" || p === null) continue;
        if ((p as { isSelf?: unknown }).isSelf === true) continue;
        const side = sideFromSeats(selfSeat, getSeatNumber(p));
        if (!side) continue;

        const tilesRaw = (p as { tiles?: unknown }).tiles;
        const hiddenTileCount = Array.isArray(tilesRaw)
          ? (tilesRaw as WsTile[]).filter((t) => t && t.type === "hidden")
              .length
          : NaN;
        const tileCountRaw = (p as { tileCount?: unknown }).tileCount;
        const tileCountFromField = Number(tileCountRaw);
        const tileCount =
          Number.isFinite(hiddenTileCount) && hiddenTileCount > 0
            ? hiddenTileCount
            : tileCountFromField;
        if (Number.isFinite(tileCount) && tileCount > 0) {
          nextOpponentCounts[side] = tileCount;
        }

        const meldsForSide: Array<{
          kind: "pong" | "chow" | "kong";
          tiles: MahjongTile[];
        }> = [];

        const pongRaw = (p as { pong?: unknown }).pong;
        if (Array.isArray(pongRaw)) {
          for (const g of pongRaw) {
            if (typeof g !== "object" || g === null) continue;
            const tiles = normalizeOpponentMeldTiles(
              (g as { tiles?: unknown }).tiles,
            );
            if (tiles.length > 0) meldsForSide.push({ kind: "pong", tiles });
          }
        }

        const chowRaw = (p as { chow?: unknown }).chow;
        if (Array.isArray(chowRaw)) {
          for (const g of chowRaw) {
            if (typeof g !== "object" || g === null) continue;
            const tiles = normalizeOpponentMeldTiles(
              (g as { tiles?: unknown }).tiles,
            );
            if (tiles.length > 0) meldsForSide.push({ kind: "chow", tiles });
          }
        }

        const kongRaw = (p as { kong?: unknown }).kong;
        if (Array.isArray(kongRaw)) {
          for (const g of kongRaw) {
            if (typeof g !== "object" || g === null) continue;
            const tiles = normalizeOpponentMeldTiles(
              (g as { tiles?: unknown }).tiles,
            );
            if (tiles.length > 0) meldsForSide.push({ kind: "kong", tiles });
          }
        }

        const discardedRaw = (p as { discarded_tiles?: unknown })
          .discarded_tiles;
        const sideDiscards: MahjongTile[] = [];
        if (Array.isArray(discardedRaw)) {
          for (const t of discardedRaw as WsTile[]) {
            if (typeof t !== "object" || t === null) continue;
            if ((t as { type?: unknown }).type === "hidden") continue;
            const rank = Number((t as { number?: unknown }).number);
            if (!Number.isFinite(rank) || rank < 1 || rank > 9) continue;
            const suit: MahjongTile["suit"] | null =
              (t as { type?: unknown }).type === "bamboo"
                ? "bamboo"
                : (t as { type?: unknown }).type === "dot"
                  ? "dots"
                  : null;
            if (!suit) continue;
            sideDiscards.push({ suit, rank });
          }
        }
        if (side === "right") nextRightDiscards.push(...sideDiscards);
        if (side === "top") nextTopDiscards.push(...sideDiscards);
        if (side === "left") nextLeftDiscards.push(...sideDiscards);

        if (meldsForSide.length > 0) nextOpponentMelds[side] = meldsForSide;
      }

      // Track last discarded tile (for the draw pile panel).
      // Payload order can vary, so search for the first valid last_discard_tile.
      let nextLastDiscard: LastDiscardTile | null = null;
      let nextLastDiscardSide: "bottom" | "right" | "top" | "left" | null =
        null;
      for (const entry of handState) {
        if (typeof entry !== "object" || entry === null) continue;
        const lastDiscardRaw = (entry as { last_discard_tile?: unknown })
          .last_discard_tile;
        if (typeof lastDiscardRaw !== "object" || lastDiscardRaw === null)
          continue;
        const typeRaw = (lastDiscardRaw as { type?: unknown }).type;
        const numberRaw = (lastDiscardRaw as { number?: unknown }).number;
        const rank = Number(numberRaw);
        const suit: MahjongTile["suit"] | null =
          typeRaw === "bamboo" ? "bamboo" : typeRaw === "dot" ? "dots" : null;
        if (suit && Number.isFinite(rank) && rank >= 1 && rank <= 9) {
          const tileIdRaw = (lastDiscardRaw as { id?: unknown }).id;
          const tileId = Number(tileIdRaw);
          const userIdRaw =
            (lastDiscardRaw as { userId?: unknown; user_id?: unknown })
              .userId ??
            (lastDiscardRaw as { userId?: unknown; user_id?: unknown }).user_id;
          const userId = Number(userIdRaw);
          const seatRaw =
            (lastDiscardRaw as { seat?: unknown; seat_position?: unknown })
              .seat ??
            (lastDiscardRaw as { seat?: unknown; seat_position?: unknown })
              .seat_position;
          const seat = Number(seatRaw);
          const seatNo = Number.isFinite(seat) ? seat : null;
          if (seatNo != null && selfSeat != null && seatNo === selfSeat) {
            nextLastDiscardSide = "bottom";
          } else {
            const side = sideFromSeats(selfSeat, seatNo);
            if (side) nextLastDiscardSide = side;
          }
          if (!nextLastDiscardSide && Number.isFinite(userId)) {
            if (authUserId != null && userId === authUserId) {
              nextLastDiscardSide = "bottom";
            } else if (opponentCount === 1) {
              nextLastDiscardSide = "right";
            }
          }
          nextLastDiscard = {
            suit,
            rank,
            tileId: Number.isFinite(tileId) ? tileId : undefined,
            userId: Number.isFinite(userId) ? userId : undefined,
            seat: seatNo ?? undefined,
          };
          break;
        }
      }
      setLastDiscardSide(nextLastDiscardSide);

      if (nextLastDiscard && nextLastDiscardSide) {
        const same = (a: MahjongTile | undefined) =>
          a &&
          a.suit === nextLastDiscard!.suit &&
          a.rank === nextLastDiscard!.rank;
        if (nextLastDiscardSide === "right") {
          if (!same(nextRightDiscards[nextRightDiscards.length - 1]))
            nextRightDiscards.push({
              suit: nextLastDiscard.suit,
              rank: nextLastDiscard.rank,
            });
        }
        if (nextLastDiscardSide === "top") {
          if (!same(nextTopDiscards[nextTopDiscards.length - 1]))
            nextTopDiscards.push({
              suit: nextLastDiscard.suit,
              rank: nextLastDiscard.rank,
            });
        }
        if (nextLastDiscardSide === "left") {
          if (!same(nextLeftDiscards[nextLeftDiscards.length - 1]))
            nextLeftDiscards.push({
              suit: nextLastDiscard.suit,
              rank: nextLastDiscard.rank,
            });
        }
      }

      setOpponentHandCounts(nextOpponentCounts);
      setOpponentMelds(nextOpponentMelds);
      setRightDiscardTiles(nextRightDiscards);
      setTopDiscardTiles(nextTopDiscards);
      setLeftDiscardTiles(nextLeftDiscards);

      const self = handState.find(
        (p) =>
          typeof p === "object" &&
          p !== null &&
          (p as { isSelf?: unknown }).isSelf === true,
      ) as
        | {
            tiles?: unknown;
            pong?: unknown;
            chow?: unknown;
            kong?: unknown;
            discarded_tiles?: unknown;
            tileCount?: unknown;
            seat_position?: unknown;
            seatPosition?: unknown;
          }
        | undefined;

      const normalizeMeldTiles = (
        tiles: unknown,
      ): Array<MahjongTile & { id: number }> => {
        if (!Array.isArray(tiles)) return [];
        const out: Array<MahjongTile & { id: number }> = [];
        for (const t of tiles) {
          if (typeof t !== "object" || t === null) continue;
          const typeRaw = (t as { type?: unknown }).type;
          const numberRaw = (t as { number?: unknown }).number;
          const idRaw = (t as { id?: unknown }).id;
          if (typeRaw === "hidden") continue;
          const rank = Number(numberRaw);
          const id = Number(idRaw);
          if (!Number.isFinite(rank) || rank < 1 || rank > 9) continue;
          if (!Number.isFinite(id)) continue;
          const suit: MahjongTile["suit"] | null =
            typeRaw === "bamboo" ? "bamboo" : typeRaw === "dot" ? "dots" : null;
          if (!suit) continue;
          out.push({ id, suit, rank });
        }
        return out;
      };

      const nextMelds: Array<{
        kind: "pong" | "chow" | "kong";
        meldKey: string;
        tiles: Array<MahjongTile & { id: number }>;
      }> = [];

      const kongRaw = self?.kong;
      if (Array.isArray(kongRaw)) {
        for (const g of kongRaw) {
          if (typeof g !== "object" || g === null) continue;
          const keyRaw =
            (g as { kong_key?: unknown; kongKey?: unknown }).kong_key ??
            (g as { kong_key?: unknown; kongKey?: unknown }).kongKey ??
            (g as { tileKey?: unknown }).tileKey;
          const meldKey = typeof keyRaw === "string" ? keyRaw : "";
          const tiles = normalizeMeldTiles((g as { tiles?: unknown }).tiles);
          if (meldKey && tiles.length > 0)
            nextMelds.push({ kind: "kong", meldKey, tiles });
        }
      }

      const pongRaw = self?.pong;
      if (Array.isArray(pongRaw)) {
        for (const g of pongRaw) {
          if (typeof g !== "object" || g === null) continue;
          const keyRaw =
            (g as { pong_key?: unknown; pongKey?: unknown }).pong_key ??
            (g as { pong_key?: unknown; pongKey?: unknown }).pongKey ??
            (g as { tileKey?: unknown }).tileKey;
          const meldKey = typeof keyRaw === "string" ? keyRaw : "";
          const tiles = normalizeMeldTiles((g as { tiles?: unknown }).tiles);
          if (meldKey && tiles.length > 0)
            nextMelds.push({ kind: "pong", meldKey, tiles });
        }
      }

      const chowRaw = self?.chow;
      if (Array.isArray(chowRaw)) {
        for (const g of chowRaw) {
          if (typeof g !== "object" || g === null) continue;
          const keyRaw =
            (g as { chow_key?: unknown; chowKey?: unknown }).chow_key ??
            (g as { chow_key?: unknown; chowKey?: unknown }).chowKey ??
            (g as { tileKey?: unknown }).tileKey;
          const meldKey = typeof keyRaw === "string" ? keyRaw : "";
          const tiles = normalizeMeldTiles((g as { tiles?: unknown }).tiles);
          if (meldKey && tiles.length > 0)
            nextMelds.push({ kind: "chow", meldKey, tiles });
        }
      }

      setSelfMelds(nextMelds);

      const tilesRaw = self?.tiles;
      if (!Array.isArray(tilesRaw)) return;

      const discardedRaw = self?.discarded_tiles;
      if (Array.isArray(discardedRaw)) {
        const nextSelfDiscards: MahjongTile[] = [];
        for (const t of discardedRaw as WsTile[]) {
          if (typeof t !== "object" || t === null) continue;
          if (t.type === "hidden") continue;
          const rank = Number(t.number);
          if (!Number.isFinite(rank) || rank < 1 || rank > 9) continue;
          const suit: MahjongTile["suit"] | null =
            t.type === "bamboo" ? "bamboo" : t.type === "dot" ? "dots" : null;
          if (!suit) continue;
          nextSelfDiscards.push({ suit, rank });
        }
        if (
          nextLastDiscard &&
          nextLastDiscardSide === "bottom" &&
          (nextSelfDiscards.length === 0 ||
            nextSelfDiscards[nextSelfDiscards.length - 1]?.suit !==
              nextLastDiscard.suit ||
            nextSelfDiscards[nextSelfDiscards.length - 1]?.rank !==
              nextLastDiscard.rank)
        ) {
          nextSelfDiscards.push({
            suit: nextLastDiscard.suit,
            rank: nextLastDiscard.rank,
          });
        }
        setSelfDiscardTiles(nextSelfDiscards);
      } else {
        if (nextLastDiscard && nextLastDiscardSide === "bottom") {
          setSelfDiscardTiles([
            { suit: nextLastDiscard.suit, rank: nextLastDiscard.rank },
          ]);
        } else {
          setSelfDiscardTiles([]);
        }
      }

      const nextHand: ClientTile[] = [];
      for (const t of tilesRaw) {
        if (typeof t !== "object" || t === null) continue;
        const typeRaw = (t as { type?: unknown }).type;
        const numberRaw = (t as { number?: unknown }).number;
        const idRaw = (t as { id?: unknown }).id;
        if (typeRaw === "hidden") continue;

        const rank = Number(numberRaw);
        if (!Number.isFinite(rank) || rank < 1 || rank > 9) continue;
        const id = Number(idRaw);
        if (!Number.isFinite(id)) continue;

        // WS uses "dot" | "bamboo". Our internal suit uses "dots" | "bamboo".
        const suit: MahjongTile["suit"] | null =
          typeRaw === "bamboo" ? "bamboo" : typeRaw === "dot" ? "dots" : null;
        if (!suit) continue;

        nextHand.push({ id, suit, rank });
      }

      if (nextHand.length > 0) {
        // Preserve server order for now.
        setHand(nextHand);
      }
      // Reset discards when a new initial state arrives.
      setDiscards([]);
    };

    const applyUserToPlay = (payload: unknown) => {
      if (cancelled) return;
      if (typeof payload !== "object" || payload === null) return;
      const p = payload as {
        user_id?: unknown;
        userId?: unknown;
        user_id_to_play_first?: unknown;
      };
      const userId = Number(p.user_id ?? p.userId ?? p.user_id_to_play_first);
      if (!Number.isFinite(userId)) return;
      setActivePlayerUserId(userId);
    };

    const handleJoinSuccess = (data: unknown) => {
      if (cancelled) return;
      setRoomState(data);
      setJoinError(null);

      if (typeof data !== "object" || data === null) return;
      const status = (data as { status?: unknown }).status;
      if (status !== "playing") return;
      const wallCountRaw = (data as { wallCount?: unknown }).wallCount;
      const wallCount = Number(wallCountRaw);
      if (!Number.isFinite(wallCount) || wallCount < 0) return;
      setDrawPileCount(wallCount);

      applyInitialHandState((data as { handState?: unknown }).handState);
      applyUserToPlay(
        (data as { currentTurnPlayer?: unknown }).currentTurnPlayer,
      );
    };

    const doJoin = async (socket: ReturnType<typeof getSocket>) => {
      if (!socket) return;
      try {
        setJoinError(null);
        const joinToken = await fetchMahjongJoinToken(roomId);
        if (cancelled) return;
        socket.emit("mahjong:join_room", {
          roomId: String(roomId),
          token: joinToken,
        });
      } catch (e) {
        if (cancelled) return;
        setJoinError(
          e instanceof Error ? e.message : "Failed to join room. Please retry.",
        );
      }
    };

    (async () => {
      const socket = await ensureSocket();
      if (!socket || cancelled) return;

      socket.off("mahjong:join_room_success", handleJoinSuccess);
      socket.on("mahjong:join_room_success", handleJoinSuccess);

      const handleWaitingForPlayers = () => {
        if (cancelled) return;
        setCenterMessage("等待其他玩家...");
      };

      const handleCountdownStarted = () => {
        if (cancelled) return;
        setCenterMessage("正在开始...");
      };

      const handleCountdown = (payload: unknown) => {
        if (cancelled) return;
        const remaining =
          typeof payload === "object" && payload !== null
            ? (payload as { remaining?: unknown }).remaining
            : undefined;
        if (typeof remaining !== "number") return;
        if (remaining <= 0) {
          setCenterMessage(null);
          return;
        }
        setCenterMessage(`将在${remaining}秒后开始`);
      };

      const handleRoundStarted = () => {
        if (cancelled) return;
        setCenterMessage(null);
        setStartRoundPromptOpen(false);
        setShowEndRoundButton(false);
      };

      const normalizeRoundPlayers = (players: unknown): RoundPlayer[] => {
        if (!Array.isArray(players)) return [];
        return players
          .map((p) => {
            if (typeof p !== "object" || p === null) return null;
            const userIdRaw =
              (p as { user_id?: unknown; userId?: unknown }).user_id ??
              (p as { user_id?: unknown; userId?: unknown }).userId;
            const seatRaw =
              (p as { seat_position?: unknown; seatPosition?: unknown })
                .seat_position ??
              (p as { seat?: unknown }).seat ??
              (p as { seat_position?: unknown; seatPosition?: unknown })
                .seatPosition;
            const nameRaw =
              (p as { user_name?: unknown; userName?: unknown }).user_name ??
              (p as { user_name?: unknown; userName?: unknown }).userName ??
              (p as { name?: unknown }).name;

            const userId = Number(userIdRaw);
            const seatPosition = Number(seatRaw);
            const name = typeof nameRaw === "string" ? nameRaw : "";

            if (!Number.isFinite(userId) || !Number.isFinite(seatPosition))
              return null;
            return { userId, name, seatPosition };
          })
          .filter((p): p is RoundPlayer => !!p)
          .sort((a, b) => a.seatPosition - b.seatPosition);
      };

      const handleRoundStartedPlayers = (payload: unknown) => {
        if (cancelled) return;
        const players =
          typeof payload === "object" && payload !== null
            ? (payload as { players?: unknown }).players
            : undefined;
        setRoundPlayers(normalizeRoundPlayers(players));
      };

      const handleUpdateRoundPlayers = (payload: unknown) => {
        if (cancelled) return;
        setRoundPlayers(normalizeRoundPlayers(payload));
        setShowEndRoundButton(true);
      };

      const handleStartRollingDice = () => {
        if (cancelled) return;
        setShowDrawPile(false);
        setDiceRolling(true);
        setDiceFaces([1, 1]);
        if (diceTimer) window.clearInterval(diceTimer);
        diceTimer = window.setInterval(() => {
          const a = 1 + Math.floor(Math.random() * 6);
          const b = 1 + Math.floor(Math.random() * 6);
          setDiceFaces([a, b]);
        }, 90);
      };

      const handleDiceRolled = (payload: unknown) => {
        if (cancelled) return;
        const dice =
          typeof payload === "object" && payload !== null
            ? (payload as { dice?: unknown }).dice
            : undefined;
        if (Array.isArray(dice) && dice.length >= 2) {
          const a = Number(dice[0]);
          const b = Number(dice[1]);
          if (Number.isFinite(a) && Number.isFinite(b)) {
            setDiceFaces([a, b]);
          }
        }

        setDiceRolling(false);
        if (diceTimer) {
          window.clearInterval(diceTimer);
          diceTimer = null;
        }
      };

      const handleWallCountUpdated = (payload: unknown) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) return;
        const wallCountRaw =
          (payload as { wallCount?: unknown; newWallCount?: unknown })
            .wallCount ??
          (payload as { wallCount?: unknown; newWallCount?: unknown })
            .newWallCount;
        const wallCount = Number(wallCountRaw);
        if (!Number.isFinite(wallCount) || wallCount < 0) return;
        setDrawPileCount(wallCount);
      };

      const handleShownTilesUpdated = (payload: unknown) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) return;
        const shownTilesRaw = (payload as { shownTiles?: unknown }).shownTiles;
        if (!Array.isArray(shownTilesRaw)) return;

        const nextShownTiles: MahjongTile[] = [];
        for (const t of shownTilesRaw) {
          if (typeof t !== "object" || t === null) continue;
          const rank = Number(t.number);
          const suit: MahjongTile["suit"] | null =
            t.type === "bamboo" ? "bamboo" : t.type === "dot" ? "dots" : null;
          if (suit && Number.isFinite(rank)) {
            nextShownTiles.push({ suit, rank });
          }
        }
        setShownTiles(nextShownTiles);
      };

      const handleTurnCountdownStarted = (payload: unknown) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) return;
        const userIdRaw =
          (payload as { user_id?: unknown; userId?: unknown }).user_id ??
          (payload as { user_id?: unknown; userId?: unknown }).userId;
        const durationRaw = (payload as { duration?: unknown }).duration;
        const userId = Number(userIdRaw);
        const duration = Number(durationRaw);
        if (!Number.isFinite(userId) || !Number.isFinite(duration)) return;
        setTurnCountdown({
          userId,
          remaining: duration,
          duration,
        });
      };

      const handleTurnCountdown = (payload: unknown) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) return;
        const userIdRaw =
          (payload as { user_id?: unknown; userId?: unknown }).user_id ??
          (payload as { user_id?: unknown; userId?: unknown }).userId;
        const remainingRaw = (payload as { remaining?: unknown }).remaining;
        const userId = Number(userIdRaw);
        const remaining = Number(remainingRaw);
        if (!Number.isFinite(userId) || !Number.isFinite(remaining)) return;
        setTurnCountdown((prev) => {
          if (!prev || prev.userId !== userId) {
            return { userId, remaining, duration: Math.max(0, remaining) };
          }
          return { ...prev, remaining };
        });
      };

      const handleTurnCountdownFinished = (payload: unknown) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) {
          setTurnCountdown(null);
          return;
        }
        const userIdRaw =
          (payload as { user_id?: unknown; userId?: unknown }).user_id ??
          (payload as { user_id?: unknown; userId?: unknown }).userId;
        const userId = Number(userIdRaw);
        if (!Number.isFinite(userId)) {
          setTurnCountdown(null);
          return;
        }
        setTurnCountdown((prev) => (prev?.userId === userId ? null : prev));
      };

      const handleDrawRound = () => {
        if (cancelled) return;
        setCenterMessage("本局平局。没有赢家");
        console.log("THIS ROUND IS DRAW. NO WINNER");
      };

      const handleWinnerReveal = (payload: unknown) => {
        if (cancelled) return;
        const p: WinnerRevealPayload | null = Array.isArray(payload)
          ? payload.length > 0 &&
            typeof payload[0] === "object" &&
            payload[0] !== null
            ? (payload[0] as WinnerRevealPayload)
            : null
          : typeof payload === "object" && payload !== null
            ? (payload as WinnerRevealPayload)
            : null;
        if (!p) return;
        const winnerUserIdRaw =
          p.winner_user_id ?? p.winner_userid ?? p.winnerUserId;
        const winnerUserId = Number(winnerUserIdRaw);
        if (!Number.isFinite(winnerUserId)) return;

        const resultLabel =
          authUserId != null
            ? authUserId === winnerUserId
              ? "You Win"
              : "You Lose"
            : "";

        const winnerNameRaw =
          p.winner_user_name ?? p.winner_username ?? p.winnerUserName ?? p.name;
        const winnerName =
          typeof winnerNameRaw === "string" && winnerNameRaw.trim()
            ? winnerNameRaw
            : `User ${winnerUserId}`;

        const normalizeRevealTiles = (raw: unknown): MahjongTile[] => {
          if (!Array.isArray(raw)) return [];
          const out: MahjongTile[] = [];
          for (const t of raw as WsTile[]) {
            if (typeof t !== "object" || t === null) continue;
            if (t.type === "hidden") continue;
            const rank = Number(t.number);
            if (!Number.isFinite(rank) || rank < 1 || rank > 9) continue;
            const suit: MahjongTile["suit"] | null =
              t.type === "bamboo" ? "bamboo" : t.type === "dot" ? "dots" : null;
            if (!suit) continue;
            out.push({ suit, rank });
          }
          return out;
        };

        const handTilesRaw = p.handTiles;
        const pairRaw = p.pair;
        const pairTiles = normalizeRevealTiles(pairRaw);
        const tilesFromHand = normalizeRevealTiles(handTilesRaw);

        const melds: Array<{
          kind: "chow" | "pong" | "kong";
          tiles: MahjongTile[];
        }> = [];
        const chowRaw = p.chow;
        if (Array.isArray(chowRaw)) {
          for (const g of chowRaw) {
            if (typeof g !== "object" || g === null) continue;
            const groupTiles = normalizeRevealTiles(
              (g as { tiles?: unknown }).tiles,
            );
            if (groupTiles.length > 0)
              melds.push({ kind: "chow", tiles: groupTiles });
          }
        }
        const pongRaw = p.pong;
        if (Array.isArray(pongRaw)) {
          for (const g of pongRaw) {
            if (typeof g !== "object" || g === null) continue;
            const groupTiles = normalizeRevealTiles(
              (g as { tiles?: unknown }).tiles,
            );
            if (groupTiles.length > 0)
              melds.push({ kind: "pong", tiles: groupTiles });
          }
        }
        const kongRaw = p.kong;
        if (Array.isArray(kongRaw)) {
          for (const g of kongRaw) {
            if (typeof g !== "object" || g === null) continue;
            const groupTiles = normalizeRevealTiles(
              (g as { tiles?: unknown }).tiles,
            );
            if (groupTiles.length > 0)
              melds.push({ kind: "kong", tiles: groupTiles });
          }
        }

        const tiles: MahjongTile[] =
          pairTiles.length > 0
            ? pairTiles
            : tilesFromHand.length > 0
              ? tilesFromHand
              : [];

        setTurnCountdown(null);
        setWinnerReveal({
          winnerUserId,
          winnerName,
          resultLabel,
          tiles,
          melds,
          winType: p.winType,
          isPure: p.isPure,
          payouts: p.payouts,
        });
      };

      const applyCanKong = (
        payload: unknown,
        kind: "kong" | "interrupt_kong" | "normal_kong",
      ) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) return;
        const p = payload as CanKongPayload;
        const canKong = Boolean((p as { canKong?: unknown }).canKong);
        if (!canKong) {
          setKongDecision(null);
          return;
        }

        const groupsRaw = (p as { groups?: unknown }).groups;
        if (!Array.isArray(groupsRaw)) return;
        const groups: Array<{
          kongKey: string;
          displayKey: string;
          tiles: MahjongTile[];
        }> = [];

        for (const g of groupsRaw) {
          if (typeof g !== "object" || g === null) continue;
          const tileKeyRaw = (g as { tileKey?: unknown }).tileKey;
          const kongKey = typeof tileKeyRaw === "string" ? tileKeyRaw : "";
          const displayKey = kongKey ? kongKey.replace(/_/g, " ") : "";
          const tilesRaw = (g as { tiles?: unknown }).tiles;
          if (!Array.isArray(tilesRaw)) continue;
          const tiles: MahjongTile[] = [];
          for (const t of tilesRaw as WsTile[]) {
            if (typeof t !== "object" || t === null) continue;
            if (t.type === "hidden") continue;
            const rank = Number(t.number);
            if (!Number.isFinite(rank) || rank < 1 || rank > 9) continue;
            const suit: MahjongTile["suit"] | null =
              t.type === "bamboo" ? "bamboo" : t.type === "dot" ? "dots" : null;
            if (!suit) continue;
            tiles.push({ suit, rank });
          }
          if (tiles.length > 0) groups.push({ kongKey, displayKey, tiles });
        }

        if (groups.length === 0) return;
        console.log("⛔ Can Kong");
        setKongDecision({ kind, groups });
      };

      const handleCanKong = (payload: unknown) => applyCanKong(payload, "kong");

      const handleCanInterruptKong = (payload: unknown) =>
        applyCanKong(payload, "interrupt_kong");

      const handleCanNormalKong = (payload: unknown) =>
        applyCanKong(payload, "normal_kong");

      const applyCanPong = (
        payload: unknown,
        kind: "interrupt_pong" | "normal_pong",
      ) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) return;
        const p = payload as CanPongPayload;
        const canPong = Boolean((p as { canPong?: unknown }).canPong);
        if (!canPong) {
          setPongDecision(null);
          return;
        }

        const groupsRaw = (p as { groups?: unknown }).groups;
        if (!Array.isArray(groupsRaw)) return;
        const groups: Array<{
          pongKey: string;
          displayKey: string;
          tiles: MahjongTile[];
        }> = [];

        for (const g of groupsRaw) {
          if (typeof g !== "object" || g === null) continue;
          const tileKeyRaw = (g as { tileKey?: unknown }).tileKey;
          const pongKey = typeof tileKeyRaw === "string" ? tileKeyRaw : "";
          const displayKey = pongKey ? pongKey.replace(/_/g, " ") : "";
          const tilesRaw = (g as { tiles?: unknown }).tiles;
          if (!Array.isArray(tilesRaw)) continue;
          const tiles: MahjongTile[] = [];
          for (const t of tilesRaw as WsTile[]) {
            if (typeof t !== "object" || t === null) continue;
            if (t.type === "hidden") continue;
            const rank = Number(t.number);
            if (!Number.isFinite(rank) || rank < 1 || rank > 9) continue;
            const suit: MahjongTile["suit"] | null =
              t.type === "bamboo" ? "bamboo" : t.type === "dot" ? "dots" : null;
            if (!suit) continue;
            tiles.push({ suit, rank });
          }
          if (tiles.length > 0) groups.push({ pongKey, displayKey, tiles });
        }

        if (groups.length === 0) return;
        console.log("⛔ Can Pong");
        setPongDecision({ kind, groups });
      };

      const handleCanInterruptPong = (payload: unknown) =>
        applyCanPong(payload, "interrupt_pong");

      const handleCanNormalPong = (payload: unknown) =>
        applyCanPong(payload, "normal_pong");

      const handleRemoveKongDecision = () => {
        if (cancelled) return;
        setKongDecision(null);
      };

      const handleRemovePongDecision = () => {
        if (cancelled) return;
        setPongDecision(null);
      };

      const handleRemoveChowDecision = () => {
        if (cancelled) return;
        setChowDecision(null);
      };

      const handleAskWinDecision = (payload: unknown) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) return;
        const userIdRaw =
          (payload as { user_id?: unknown; userId?: unknown }).user_id ??
          (payload as { user_id?: unknown; userId?: unknown }).userId;
        const messageRaw = (payload as { message?: unknown }).message;
        const userId = Number(userIdRaw ?? authUserId);
        const message =
          typeof messageRaw === "string" && messageRaw.trim().length > 0
            ? messageRaw
            : "胡牌？";
        if (!Number.isFinite(userId)) return;
        setWinDecision({ userId, message });
      };

      const handleRemoveWinDecision = () => {
        if (cancelled) return;
        setWinDecision(null);
      };

      const handleCanTakeShownTile = (payload: unknown) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) return;

        const shownTilesRaw = (payload as { shownTiles?: unknown }).shownTiles;
        if (!Array.isArray(shownTilesRaw)) return;

        const shownTilesData: Array<{
          id: number;
          type: "dot" | "bamboo";
          number: number;
          copy_no: number;
          tile: MahjongTile;
        }> = [];

        for (const t of shownTilesRaw) {
          if (typeof t !== "object" || t === null) continue;

          const id = Number((t as { id?: unknown }).id);
          const typeRaw = (t as { type?: unknown }).type;
          const number = Number((t as { number?: unknown }).number);
          const copy_no = Number((t as { copy_no?: unknown }).copy_no);

          if (
            !Number.isFinite(id) ||
            !Number.isFinite(number) ||
            !Number.isFinite(copy_no)
          )
            continue;
          if (typeof typeRaw !== "string") continue;

          const type =
            typeRaw === "dot" || typeRaw === "bamboo" ? typeRaw : null;
          if (!type) continue;

          const suit: MahjongTile["suit"] =
            type === "bamboo" ? "bamboo" : "dots";
          const rank = number;

          if (rank < 1 || rank > 9) continue;

          shownTilesData.push({
            id,
            type,
            number: rank,
            copy_no,
            tile: { suit, rank },
          });
        }

        if (shownTilesData.length === 0) return;

        console.log("⛔ Can Take Shown Tile", shownTilesData);
        setCanTakeShownTileDecision({ shownTiles: shownTilesData });
      };

      const handleRemoveCanTakeShownTileDecision = () => {
        if (cancelled) return;
        setCanTakeShownTileDecision(null);
      };

      const handleShownTileTaken = (payload: unknown) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) return;

        const userId = Number((payload as { userId?: unknown }).userId);
        const tile = (payload as { tile?: unknown }).tile;
        const tileIndex = Number(
          (payload as { tileIndex?: unknown }).tileIndex,
        );

        console.log(
          "📢 Shown tile taken by user",
          userId,
          "tile:",
          tile,
          "index:",
          tileIndex,
        );
        // This is a broadcast event, no UI update needed
      };

      const applyCanChow = (payload: unknown) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) return;
        const p = payload as CanChowPayload;
        const canChow = Boolean((p as { canChow?: unknown }).canChow);
        if (!canChow) {
          setChowDecision(null);
          return;
        }

        const groupsRaw = (p as { groups?: unknown }).groups;
        if (!Array.isArray(groupsRaw)) return;
        const groups: Array<{
          chowKey: string;
          displayKey: string;
          tiles: MahjongTile[];
        }> = [];

        for (const g of groupsRaw) {
          if (typeof g !== "object" || g === null) continue;
          const tileKeyRaw = (g as { tileKey?: unknown }).tileKey;
          const chowKey = typeof tileKeyRaw === "string" ? tileKeyRaw : "";
          const displayKey = chowKey ? chowKey.replace(/_/g, " ") : "";
          const tilesRaw = (g as { tiles?: unknown }).tiles;
          if (!Array.isArray(tilesRaw)) continue;
          const tiles: MahjongTile[] = [];
          for (const t of tilesRaw as WsTile[]) {
            if (typeof t !== "object" || t === null) continue;
            if (t.type === "hidden") continue;
            const rank = Number(t.number);
            if (!Number.isFinite(rank) || rank < 1 || rank > 9) continue;
            const suit: MahjongTile["suit"] | null =
              t.type === "bamboo" ? "bamboo" : t.type === "dot" ? "dots" : null;
            if (!suit) continue;
            tiles.push({ suit, rank });
          }
          if (tiles.length > 0) groups.push({ chowKey, displayKey, tiles });
        }

        if (groups.length === 0) return;
        console.log("⛔ Can Chow");
        setChowDecision({ kind: "normal_chow", groups });
      };

      const handleInitialHandState = (payload: unknown) => {
        applyInitialHandState(payload);
      };

      const handleStartShuffling = () => {
        if (cancelled) return;
        // Visible cue for the "start shuffling" server event.
        setDiceRolling(false);
        setDiceFaces(null);
        setCenterMessage("Shuffling Tiles");
        // Lightweight debug log for parity with example client snippet.
        console.log("Shuffling Tiles");
      };

      const handleUserToPlay = (payload: unknown) => {
        applyUserToPlay(payload);
      };

      const handleRoundEnd = () => {
        if (cancelled) return;
        setCenterMessage("Round Over!");
        setShowEndRoundButton(false);
        // setTimeout(() => {
        //   router.push("/game-rooms?rule_id=1");
        // }, 2000);
      };

      const handleShowStartRound = () => {
        if (cancelled) return;
        console.log("Show Start Round");
        setStartRoundPromptOpen(true);
      };

      socket.off("mahjong:waiting_for_players", handleWaitingForPlayers);
      socket.on("mahjong:waiting_for_players", handleWaitingForPlayers);

      socket.off("mahjong:countdown_started", handleCountdownStarted);
      socket.on("mahjong:countdown_started", handleCountdownStarted);

      socket.off("mahjong:countdown", handleCountdown);
      socket.on("mahjong:countdown", handleCountdown);

      socket.off("mahjong:round_started", handleRoundStarted);
      socket.on("mahjong:round_started", handleRoundStarted);

      socket.off("mahjong:round_started", handleRoundStartedPlayers);
      socket.on("mahjong:round_started", handleRoundStartedPlayers);

      socket.off("mahjong:update_round_players", handleUpdateRoundPlayers);
      socket.on("mahjong:update_round_players", handleUpdateRoundPlayers);

      socket.off("mahjong:start_rolling_dice", handleStartRollingDice);
      socket.on("mahjong:start_rolling_dice", handleStartRollingDice);

      socket.off("mahjong:dice_rolled", handleDiceRolled);
      socket.on("mahjong:dice_rolled", handleDiceRolled);

      socket.off("mahjong:wall_count_updated", handleWallCountUpdated);
      socket.on("mahjong:wall_count_updated", handleWallCountUpdated);

      socket.off("mahjong:shown_tiles_updated", handleShownTilesUpdated);
      socket.on("mahjong:shown_tiles_updated", handleShownTilesUpdated);

      socket.off("mahjong:turn_countdown_started", handleTurnCountdownStarted);
      socket.on("mahjong:turn_countdown_started", handleTurnCountdownStarted);

      socket.off("mahjong:turn_countdown", handleTurnCountdown);
      socket.on("mahjong:turn_countdown", handleTurnCountdown);

      socket.off(
        "mahjong:turn_countdown_finished",
        handleTurnCountdownFinished,
      );
      socket.on("mahjong:turn_countdown_finished", handleTurnCountdownFinished);

      socket.off("mahjong:draw_round", handleDrawRound);
      socket.on("mahjong:draw_round", handleDrawRound);

      socket.off("mahjong:winner_reveal", handleWinnerReveal);
      socket.on("mahjong:winner_reveal", handleWinnerReveal);

      socket.off("mahjong:can_kong", handleCanKong);
      socket.on("mahjong:can_kong", handleCanKong);

      socket.off("mahjong:can_interrupt_kong", handleCanInterruptKong);
      socket.on("mahjong:can_interrupt_kong", handleCanInterruptKong);

      socket.off("mahjong:can_normal_kong", handleCanNormalKong);
      socket.on("mahjong:can_normal_kong", handleCanNormalKong);

      socket.off("mahjong:can_interrupt_pong", handleCanInterruptPong);
      socket.on("mahjong:can_interrupt_pong", handleCanInterruptPong);

      socket.off("mahjong:can_normal_pong", handleCanNormalPong);
      socket.on("mahjong:can_normal_pong", handleCanNormalPong);

      socket.off("mahjong:can_normal_chow", applyCanChow);
      socket.on("mahjong:can_normal_chow", applyCanChow);

      socket.off("mahjong:can_take_shown_tile", handleCanTakeShownTile);
      socket.on("mahjong:can_take_shown_tile", handleCanTakeShownTile);

      socket.off("mahjong:remove_kong_decision", handleRemoveKongDecision);
      socket.on("mahjong:remove_kong_decision", handleRemoveKongDecision);

      socket.off("mahjong:remove_pong_decision", handleRemovePongDecision);
      socket.on("mahjong:remove_pong_decision", handleRemovePongDecision);

      socket.off("mahjong:remove_chow_decision", handleRemoveChowDecision);
      socket.on("mahjong:remove_chow_decision", handleRemoveChowDecision);

      socket.off(
        "mahjong:remove_can_take_shown_tile_decision",
        handleRemoveCanTakeShownTileDecision,
      );
      socket.on(
        "mahjong:remove_can_take_shown_tile_decision",
        handleRemoveCanTakeShownTileDecision,
      );

      socket.off("mahjong:ask_win_decision", handleAskWinDecision);
      socket.on("mahjong:ask_win_decision", handleAskWinDecision);

      socket.off("mahjong:remove_win_decision", handleRemoveWinDecision);
      socket.on("mahjong:remove_win_decision", handleRemoveWinDecision);

      socket.off("mahjong:initial_hand_state", handleInitialHandState);
      socket.on("mahjong:initial_hand_state", handleInitialHandState);

      socket.off("mahjong:start_shuffling", handleStartShuffling);
      socket.on("mahjong:start_shuffling", handleStartShuffling);

      socket.off("mahjong:user_to_play", handleUserToPlay);
      socket.on("mahjong:user_to_play", handleUserToPlay);

      socket.off("mahjong:round_end", handleRoundEnd);
      socket.on("mahjong:round_end", handleRoundEnd);

      socket.off("mahjong:show_start_round", handleShowStartRound);
      socket.on("mahjong:show_start_round", handleShowStartRound);

      socket.off("mahjong:shown_tile_taken", handleShownTileTaken);
      socket.on("mahjong:shown_tile_taken", handleShownTileTaken);

      if (socket.connected) {
        void doJoin(socket);
      } else {
        const onConnect = () => void doJoin(socket);
        socket.once("connect", onConnect);
        socket.connect();
      }
    })();

    return () => {
      cancelled = true;
      if (diceTimer) window.clearInterval(diceTimer);
      const socket = getSocket();
      socket?.off("mahjong:join_room_success", handleJoinSuccess);
      socket?.off("mahjong:waiting_for_players");
      socket?.off("mahjong:countdown_started");
      socket?.off("mahjong:countdown");
      socket?.off("mahjong:round_started");
      socket?.off("mahjong:update_round_players");
      socket?.off("mahjong:start_rolling_dice");
      socket?.off("mahjong:dice_rolled");
      socket?.off("mahjong:wall_count_updated");
      socket?.off("mahjong:turn_countdown_started");
      socket?.off("mahjong:turn_countdown");
      socket?.off("mahjong:turn_countdown_finished");
      socket?.off("mahjong:draw_round");
      socket?.off("mahjong:winner_reveal");
      socket?.off("mahjong:can_kong");
      socket?.off("mahjong:can_interrupt_kong");
      socket?.off("mahjong:can_normal_kong");
      socket?.off("mahjong:can_interrupt_pong");
      socket?.off("mahjong:can_normal_pong");
      socket?.off("mahjong:can_normal_chow");
      socket?.off("mahjong:can_take_shown_tile");
      socket?.off("mahjong:remove_kong_decision");
      socket?.off("mahjong:remove_pong_decision");
      socket?.off("mahjong:remove_chow_decision");
      socket?.off("mahjong:remove_can_take_shown_tile_decision");
      socket?.off("mahjong:ask_win_decision");
      socket?.off("mahjong:remove_win_decision");
      socket?.off("mahjong:initial_hand_state");
      socket?.off("mahjong:start_shuffling");
      socket?.off("mahjong:user_to_play");
      socket?.off("mahjong:round_end");
      socket?.off("mahjong:show_start_round");
      socket?.off("mahjong:shown_tile_taken");
    };
  }, [token, roomId, authUserId]);

  useEffect(() => {
    if (roundPlayers.length === 0) return;
    const authPlayer =
      authUserId != null
        ? (roundPlayers.find((p) => p.userId === authUserId) ?? null)
        : null;

    const self =
      authPlayer ??
      (selfSeatPosition != null
        ? (roundPlayers.find((p) => p.seatPosition === selfSeatPosition) ??
          null)
        : null) ??
      roundPlayers[0] ??
      null;

    if (!self) return;

    const others = roundPlayers.filter((p) => p !== self);
    const sidesSet = new Set<"bottom" | "right" | "top" | "left">(["bottom"]);

    if (others.length === 1) {
      sidesSet.add("right");
      setActiveSides(["bottom", "right"]);
      return;
    }

    const selfSeatNo = self.seatPosition;
    for (const p of others) {
      const otherSeatNo = p.seatPosition;
      const delta = (((otherSeatNo - selfSeatNo) % 4) + 4) % 4;
      if (delta === 1) sidesSet.add("left");
      if (delta === 2) sidesSet.add("top");
      if (delta === 3) sidesSet.add("right");
    }

    const ordered: Array<"bottom" | "right" | "top" | "left"> = [
      "bottom",
      "right",
      "top",
      "left",
    ];
    setActiveSides(ordered.filter((s) => sidesSet.has(s)));
  }, [roundPlayers, authUserId, selfSeatPosition]);

  const isPortraitPhone =
    viewport.width < 900 && viewport.height > viewport.width;
  const isMobileUi = viewport.width < 520;
  const stageStyle = {
    width: "100vw",
    height: "100dvh",
    transform: "translate(-50%, -50%)",
  };

  const activeTurnSide = useMemo(() => {
    if (roundPlayers.length === 0) return null;

    const authPlayer =
      authUserId != null
        ? (roundPlayers.find((p) => p.userId === authUserId) ?? null)
        : null;
    const self =
      authPlayer ??
      (selfSeatPosition != null
        ? (roundPlayers.find((p) => p.seatPosition === selfSeatPosition) ??
          null)
        : null) ??
      roundPlayers[0] ??
      null;

    if (!self) return null;
    const otherPlayers = roundPlayers.filter((p) => p !== self);

    const sideByUserId = new Map<number, "bottom" | "right" | "top" | "left">();
    sideByUserId.set(self.userId, "bottom");

    const selfSeatNo = Number.isFinite(self.seatPosition)
      ? self.seatPosition
      : null;

    if (otherPlayers.length === 1) {
      const only = otherPlayers[0];
      if (only) sideByUserId.set(only.userId, "right");
    } else if (selfSeatNo != null) {
      for (const p of otherPlayers) {
        const otherSeatNo = Number.isFinite(p.seatPosition)
          ? p.seatPosition
          : 0;
        const delta = (((otherSeatNo - selfSeatNo) % 4) + 4) % 4;
        if (delta === 1) sideByUserId.set(p.userId, "left");
        if (delta === 2) sideByUserId.set(p.userId, "top");
        if (delta === 3) sideByUserId.set(p.userId, "right");
      }
    } else {
      const ordered: Array<"right" | "top" | "left"> = ["right", "top", "left"];
      for (let i = 0; i < otherPlayers.length; i++) {
        const p = otherPlayers[i];
        const side = ordered[i];
        if (!p || !side) continue;
        sideByUserId.set(p.userId, side);
      }
    }

    const effectiveUserId = turnCountdown?.userId ?? activePlayerUserId;
    return effectiveUserId != null
      ? (sideByUserId.get(effectiveUserId) ?? null)
      : null;
  }, [
    roundPlayers,
    authUserId,
    selfSeatPosition,
    activePlayerUserId,
    turnCountdown,
  ]);

  const portraitUiStyle = isPortraitPhone
    ? {
        width: `${viewport.height}px`,
        height: `${viewport.width}px`,
        transform: "translate(-50%, -50%) rotate(90deg)",
        transformOrigin: "center center",
      }
    : null;

  const handleBack = () => {
    const socket = getSocket();
    if (socket && roomId != null) {
      console.log("[ws] emit mahjong:leave_room", { roomId: String(roomId) });
      socket.emit("mahjong:leave_room", { roomId: String(roomId) });
    }
    router.back();
  };

  const acceptButtonClass =
    "rounded-xl border border-[#0d9276] bg-[#022c22]/95 px-4 py-2 text-xs font-bold text-white shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md hover:bg-[#022c22] hover:border-[#0d9276] hover:scale-105 active:scale-95 active:shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-200";
  const cancelButtonClass =
    "rounded-xl border border-[#920d0d] bg-[#2c0202]/95 px-4 py-2 text-xs font-bold text-red-50 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md hover:bg-[#3d0303] hover:border-[#b91111] hover:scale-105 active:scale-95 active:shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-200";
  const actionButtonClass =
    "rounded-xl border border-[#0d9276] bg-[#022c22]/95 px-4 py-2 text-xs font-bold text-white shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md hover:bg-[#022c22] hover:border-[#0d9276] hover:scale-105 active:scale-95 active:shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-200";
  const iconButtonClass =
    "rounded-xl border border-[#0d9276] bg-[#022c22]/95 p-2 text-white shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md hover:bg-[#022c22] hover:border-[#0d9276] hover:scale-110 active:scale-90 transition-all duration-200";

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#00251b] text-amber-100">
      <div
        className={`absolute left-1/2 top-1/2 overflow-hidden transition-opacity duration-150 ${
          isViewportReady ? "opacity-100" : "opacity-0"
        }`}
        style={stageStyle}
      >
        <div className="relative h-full w-full overflow-hidden">
          <div
            className="absolute inset-0 bg-[#00251b] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/images/mj-bg.webp')" }}
          />

          {isPortraitPhone ? (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-20"
              style={portraitUiStyle ?? undefined}
            >
              <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className={iconButtonClass}
                  aria-label="Back"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`font-semibold text-amber-200 ${
                        isMobileUi ? "text-xs" : "text-lg"
                      }`}
                    >
                      麻将 (72 张)
                    </div>
                    {roomId ? (
                      <div className="flex items-center gap-2">
                        <div
                          className={`text-amber-50/70 ${
                            isMobileUi ? "text-[10px]" : "text-xs"
                          }`}
                        >
                          房间 ID: {roomId}{" "}
                          {joinError
                            ? "(加入错误)"
                            : roomState
                              ? "(已加入)"
                              : "(加入中...)"}
                        </div>
                        {showEndRoundButton ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (isEndingRound) return;
                              emitTemporaryEndRound();
                            }}
                            className={`rounded-full border border-rose-200/20 bg-rose-500/15 font-semibold text-rose-100 hover:bg-rose-500/25 ${
                              isMobileUi
                                ? "px-2 py-1 text-[10px]"
                                : "px-3 py-1 text-xs"
                            }`}
                          >
                            {isEndingRound ? "Ending..." : "结束"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {viewport.width >= 900 ? (
                    <div className="text-xs text-amber-50/70">
                      胡牌 = 4 面子 + 1 对子
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute left-4 top-4 z-20 flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className={iconButtonClass}
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-lg font-semibold text-amber-200">
                    麻将 (72 张)
                  </div>
                  {roomId ? (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-amber-50/70">
                        房间 ID: {roomId}{" "}
                        {joinError
                          ? "(加入错误)"
                          : roomState
                            ? "(已加入)"
                            : "(加入中...)"}
                      </div>
                      {showEndRoundButton ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (isEndingRound) return;
                            emitTemporaryEndRound();
                          }}
                          className="rounded-full border border-rose-200/20 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-100 hover:bg-rose-500/25"
                        >
                          {isEndingRound ? "Ending..." : "结束"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {viewport.width >= 900 ? (
                  <div className="text-xs text-amber-50/70">
                    胡牌 = 4 面子 + 1 对子
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Right-side control panel removed (WS drives game state). */}

          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div
              style={{
                width: `${viewport.width}px`,
                height: `${viewport.height}px`,
              }}
            >
              <MahjongPixiTable
                hand={hand}
                melds={selfMelds}
                discards={discards}
                selfDiscardTiles={selfDiscardTiles}
                rightDiscardTiles={rightDiscardTiles}
                topDiscardTiles={topDiscardTiles}
                leftDiscardTiles={leftDiscardTiles}
                centerMessage={centerMessage}
                showDrawPile={showDrawPile}
                drawPileCount={drawPileCount}
                lastDiscardSide={lastDiscardSide}
                activeTurnSide={activeTurnSide}
                turnCountdownRemaining={turnCountdown?.remaining ?? null}
                activeSides={activeSides}
                opponentHandCounts={opponentHandCounts}
                opponentMelds={opponentMelds}
                rotateForPortrait={isPortraitPhone}
                onDoubleClickTile={
                  isDecisionModalOpen
                    ? undefined
                    : (tileId) => emitDiscardTile(tileId)
                }
              />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-20">
            {!!roomState && hand.length > 0 ? (
              <>
                {isPortraitPhone ? (
                  <div
                    className="pointer-events-none absolute left-1/4 top-1/2"
                    style={portraitUiStyle ?? undefined}
                  >
                    <div className="pointer-events-auto absolute right-40 bottom-[200px]">
                      <button
                        type="button"
                        onClick={emitSortHand}
                        className={actionButtonClass}
                      >
                        理牌
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pointer-events-auto absolute right-50 bottom-[200px]">
                    <button
                      type="button"
                      onClick={emitSortHand}
                      className={actionButtonClass}
                    >
                      理牌
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Overlays (HTML) */}
          <div className="pointer-events-none absolute inset-0 z-20">
            {!!roomState && hand.length > 0 && (
              <div
                className={`pointer-events-auto absolute z-50 ${
                  isMobileUi ? "left-[60%] top-4" : "left-4 top-24"
                } ${isMobileUi ? "rotate-90 scale-[0.55]" : ""}`}
              >
                <FlowerTilesPanel
                  isMobile={isMobileUi}
                  shownTiles={shownTiles}
                />
              </div>
            )}
            {isPortraitPhone ? (
              <div
                className="pointer-events-none absolute left-1/2 top-1/2"
                style={portraitUiStyle ?? undefined}
              >
                <div className="absolute inset-0">
                  {diceRolling || diceFaces ? (
                    <div
                      className="absolute left-1/2 top-1/2"
                      style={{
                        transform: `translate(-50%, -50%) translateY(-70px) ${
                          isMobileUi ? "scale(0.8)" : ""
                        }`,
                      }}
                    >
                      <div
                        className={`rounded-[18px] border border-[#1d7b49]/60 bg-[#064e3b]/85 shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-md ${
                          isMobileUi ? "px-3 py-2" : "px-4 py-3"
                        }`}
                      >
                        <div className="flex items-center gap-6">
                          <Dice3D
                            face={diceFaces?.[0] ?? 1}
                            rolling={diceRolling}
                          />
                          <Dice3D
                            face={diceFaces?.[1] ?? 1}
                            rolling={diceRolling}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {(() => {
                    if (roundPlayers.length === 0) return null;

                    const authPlayer =
                      authUserId != null
                        ? (roundPlayers.find((p) => p.userId === authUserId) ??
                          null)
                        : null;
                    const fallbackAuthPlayer =
                      authPlayer ??
                      (selfSeatPosition != null
                        ? (roundPlayers.find(
                            (p) => p.seatPosition === selfSeatPosition,
                          ) ?? null)
                        : null) ??
                      roundPlayers[0] ??
                      null;
                    const others = roundPlayers.filter(
                      (p) => p !== fallbackAuthPlayer,
                    );
                    const seats: Array<{
                      position: "bottom" | "right" | "top" | "left";
                      player: RoundPlayer;
                    }> = [];

                    if (fallbackAuthPlayer) {
                      seats.push({
                        position: "bottom",
                        player: fallbackAuthPlayer,
                      });
                    }

                    const selfSeatNo = fallbackAuthPlayer?.seatPosition ?? null;
                    if (others.length === 1) {
                      const only = others[0];
                      if (only) seats.push({ position: "right", player: only });
                    } else {
                      const byDelta = [...others]
                        .map((p) => {
                          const otherSeatNo = p.seatPosition;
                          const delta =
                            selfSeatNo != null
                              ? (((otherSeatNo - selfSeatNo) % 4) + 4) % 4
                              : null;
                          return { player: p, delta };
                        })
                        .filter((x) => x.delta != null && x.delta !== 0)
                        .sort((a, b) => (a.delta ?? 99) - (b.delta ?? 99));

                      for (const item of byDelta) {
                        const delta = item.delta;
                        if (delta === 1)
                          seats.push({
                            position: "left",
                            player: item.player,
                          });
                        if (delta === 2)
                          seats.push({ position: "top", player: item.player });
                        if (delta === 3)
                          seats.push({
                            position: "right",
                            player: item.player,
                          });
                      }
                    }

                    const Seat = ({
                      player,
                      position,
                    }: {
                      player: RoundPlayer;
                      position: "bottom" | "right" | "top" | "left";
                    }) => {
                      const pos =
                        position === "bottom"
                          ? isMobileUi
                            ? "left-[5%] -translate-x-1/2 bottom-18"
                            : "left-[2%] bottom-[40px]"
                          : position === "top"
                            ? isMobileUi
                              ? "right-[20%] -translate-x-1/2 top-6"
                              : "right-[35%] -translate-x-1/2 top-6"
                            : position === "left"
                              ? isMobileUi
                                ? "left-[5%] -translate-x-1/2 top-28"
                                : "left-[2%] top-[16px] -translate-y-1/2"
                              : isMobileUi
                                ? "right-2 bottom-16"
                                : "right-6 bottom-40 -translate-y-1/2";

                      const name = player.name;
                      const initials =
                        (player.name || "")
                          .trim()
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((s) => s[0]?.toUpperCase())
                          .join("") || "?";
                      const avatarSrc = getUserAvatarSrc({
                        userId: player.userId,
                        name: player.name,
                      });

                      const imgSize = isMobileUi ? 56 : 80;

                      return (
                        <div
                          className={`absolute flex flex-col items-center ${pos}`}
                        >
                          <div
                            className="relative overflow-hidden rounded-[14px] bg-[#064e3b]/60 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-md"
                            style={{ width: imgSize, height: imgSize }}
                          >
                            <Image
                              src={avatarSrc}
                              alt={name}
                              width={imgSize}
                              height={imgSize}
                              className="h-full w-full object-cover"
                            />
                            {!avatarSrc && (
                              <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/60 text-[#EFA02C] font-bold text-lg">
                                {initials}
                              </div>
                            )}
                          </div>
                          <div
                            className={`mt-1 max-w-[100px] truncate text-center font-semibold tracking-wide text-[#EFA02C] ${
                              isMobileUi ? "text-[10px]" : "text-[13px]"
                            }`}
                            style={{
                              textShadow:
                                "0 2px 0 rgba(0,0,0,0.65), 0 0 18px rgba(255,200,80,0.35)",
                            }}
                          >
                            {name}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <>
                        {seats.map((seat) => (
                          <Seat
                            key={`${seat.position}-${seat.player.userId}`}
                            player={seat.player}
                            position={seat.position}
                          />
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <>
                {diceRolling || diceFaces ? (
                  <div className="absolute left-1/2 top-1/2">
                    <div
                      style={{
                        transform: "translate(-50%, -50%) translateY(-70px)",
                      }}
                    >
                      <div className="rounded-[18px] border border-[#1d7b49]/60 bg-[#064e3b]/85 px-4 py-3 shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-md">
                        <div className="flex items-center gap-6">
                          <Dice3D
                            face={diceFaces?.[0] ?? 1}
                            rolling={diceRolling}
                          />
                          <Dice3D
                            face={diceFaces?.[1] ?? 1}
                            rolling={diceRolling}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {(() => {
                  if (roundPlayers.length === 0) return null;

                  const authPlayer =
                    authUserId != null
                      ? (roundPlayers.find((p) => p.userId === authUserId) ??
                        null)
                      : null;
                  const fallbackAuthPlayer =
                    authPlayer ??
                    (selfSeatPosition != null
                      ? (roundPlayers.find(
                          (p) => p.seatPosition === selfSeatPosition,
                        ) ?? null)
                      : null) ??
                    roundPlayers[0] ??
                    null;
                  const others = roundPlayers.filter(
                    (p) => p !== fallbackAuthPlayer,
                  );
                  const seats: Array<{
                    position: "bottom" | "right" | "top" | "left";
                    player: RoundPlayer;
                  }> = [];

                  if (fallbackAuthPlayer) {
                    seats.push({
                      position: "bottom",
                      player: fallbackAuthPlayer,
                    });
                  }

                  const selfSeatNo = fallbackAuthPlayer?.seatPosition ?? null;
                  if (others.length === 1) {
                    const only = others[0];
                    if (only) seats.push({ position: "right", player: only });
                  } else {
                    const byDelta = [...others]
                      .map((p) => {
                        const otherSeatNo = p.seatPosition;
                        const delta =
                          selfSeatNo != null
                            ? (((otherSeatNo - selfSeatNo) % 4) + 4) % 4
                            : null;
                        return { player: p, delta };
                      })
                      .filter((x) => x.delta != null && x.delta !== 0)
                      .sort((a, b) => (a.delta ?? 99) - (b.delta ?? 99));

                    for (const item of byDelta) {
                      const delta = item.delta;
                      if (delta === 1)
                        seats.push({ position: "left", player: item.player });
                      if (delta === 2)
                        seats.push({ position: "top", player: item.player });
                      if (delta === 3)
                        seats.push({ position: "right", player: item.player });
                    }
                  }

                  const Seat = ({
                    player,
                    position,
                  }: {
                    player: RoundPlayer;
                    position: "bottom" | "right" | "top" | "left";
                  }) => {
                    const pos =
                      position === "bottom"
                        ? isMobileUi
                          ? "left-[45%] -translate-x-1/2 bottom-24"
                          : "right-40 bottom-[140px]"
                        : position === "top"
                          ? isMobileUi
                            ? "left-[45%] -translate-x-1/2 top-6"
                            : "left-1/2 -translate-x-1/2 top-6"
                          : position === "left"
                            ? isMobileUi
                              ? "left-6 top-24"
                              : "left-8 top-1/2 -translate-y-1/2"
                            : isMobileUi
                              ? "right-24 top-24"
                              : "right-6 top-1/2 -translate-y-1/2";

                    const name = player.name;
                    const initials =
                      (player.name || "")
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((s) => s[0]?.toUpperCase())
                        .join("") || "?";
                    const avatarSrc = getUserAvatarSrc({
                      userId: player.userId,
                      name: player.name,
                    });

                    const imgSize = isMobileUi ? 56 : 80;

                    return (
                      <div
                        className={`absolute flex flex-col items-center ${pos}`}
                      >
                        <div
                          className="relative overflow-hidden rounded-[14px] bg-[#064e3b]/60 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-md"
                          style={{ width: imgSize, height: imgSize }}
                        >
                          <Image
                            src={avatarSrc}
                            alt={name}
                            width={imgSize}
                            height={imgSize}
                            className="h-full w-full object-cover"
                          />
                          {!avatarSrc && (
                            <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/60 text-[#EFA02C] font-bold text-lg">
                              {initials}
                            </div>
                          )}
                        </div>
                        <div
                          className={`mt-1 max-w-[100px] truncate text-center font-semibold tracking-wide text-[#EFA02C] ${
                            isMobileUi ? "text-[10px]" : "text-[13px]"
                          }`}
                          style={{
                            textShadow:
                              "0 2px 0 rgba(0,0,0,0.65), 0 0 18px rgba(255,200,80,0.35)",
                          }}
                        >
                          {name}
                        </div>
                        <div
                          className={`mt-0.5 text-center font-medium opacity-90 ${
                            isMobileUi ? "text-[8px]" : "text-[10px]"
                          } text-[#EFA02C]`}
                        >
                          {position.charAt(0).toUpperCase() + position.slice(1)}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <>
                      {seats.map((seat) => (
                        <Seat
                          key={`${seat.position}-${seat.player.userId}`}
                          player={seat.player}
                          position={seat.position}
                        />
                      ))}
                    </>
                  );
                })()}
              </>
            )}
          </div>

          {winnerReveal ? (
            <div className="absolute inset-0 z-30 bg-black/70">
              {isPortraitPhone ? (
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2"
                  style={portraitUiStyle ?? undefined}
                >
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                    <WinnerRevealModal
                      winnerReveal={winnerReveal}
                      isMobileUi={isMobileUi}
                      onClose={() => setWinnerReveal(null)}
                    />
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <WinnerRevealModal
                    winnerReveal={winnerReveal}
                    isMobileUi={isMobileUi}
                    onClose={() => setWinnerReveal(null)}
                  />
                </div>
              )}
            </div>
          ) : null}

          {startRoundPromptOpen && !winnerReveal ? (
            <div className="absolute inset-0 z-30 bg-black/60">
              {isPortraitPhone ? (
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2"
                  style={portraitUiStyle ?? undefined}
                >
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                    <StartRoundModal
                      isMobileUi={isMobileUi}
                      onStart={() => {
                        emitTemporaryStartRound();
                        setStartRoundPromptOpen(false);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <StartRoundModal
                    isMobileUi={isMobileUi}
                    onStart={() => {
                      emitTemporaryStartRound();
                      setStartRoundPromptOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          ) : null}

          {kongDecision ? (
            <div className="pointer-events-none absolute inset-0 z-30">
              <div
                className={`pointer-events-none absolute flex items-center justify-center gap-3 ${
                  isPortraitPhone
                    ? "left-1/2 top-1/2"
                    : "left-1/2 bottom-[118px] -translate-x-1/2"
                }`}
                style={
                  isPortraitPhone ? (portraitUiStyle ?? undefined) : undefined
                }
              >
                <div
                  className={
                    isPortraitPhone && isMobileUi
                      ? "-translate-x-0 translate-y-10"
                      : undefined
                  }
                >
                  <div
                    className={`pointer-events-auto flex items-center gap-3 rounded-2xl border border-[#1d7b49]/60 bg-[#064e3b]/85 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md ${
                      isMobileUi ? "px-3 py-2" : "px-4 py-3"
                    }`}
                  >
                    {(() => {
                      const g = kongDecision.groups[0];
                      if (!g) return null;
                      return (
                        <>
                          <div
                            className={`flex items-center gap-2 ${
                              isMobileUi ? "scale-90 origin-left" : ""
                            }`}
                          >
                            {g.tiles.slice(0, 4).map((t, ti) => (
                              <MahjongTileCard
                                key={`${t.suit}-${t.rank}-${ti}`}
                                tile={t}
                                size="xs"
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (kongDecision.kind === "interrupt_kong") {
                                  emitAcceptInterruptKong(g.kongKey);
                                } else if (
                                  kongDecision.kind === "normal_kong"
                                ) {
                                  emitAcceptNormalKong(g.kongKey);
                                } else {
                                  emitAcceptKong(g.kongKey);
                                }
                                setKongDecision(null);
                              }}
                              className={acceptButtonClass}
                            >
                              接受
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (kongDecision.kind === "kong") {
                                  emitPassKong();
                                } else if (
                                  kongDecision.kind === "normal_kong"
                                ) {
                                  emitPassNormalKong();
                                }
                                setKongDecision(null);
                              }}
                              className={cancelButtonClass}
                            >
                              跳过
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {pongDecision ? (
            <div className="pointer-events-none absolute inset-0 z-30">
              <div
                className={`pointer-events-none absolute flex items-center justify-center gap-3 ${
                  isPortraitPhone
                    ? "left-1/2 top-1/2"
                    : "left-1/2 bottom-[118px] -translate-x-1/2"
                }`}
                style={
                  isPortraitPhone ? (portraitUiStyle ?? undefined) : undefined
                }
              >
                <div
                  className={
                    isPortraitPhone && isMobileUi
                      ? "-translate-x-0 translate-y-10"
                      : undefined
                  }
                >
                  <div
                    className={`pointer-events-auto flex items-center gap-3 rounded-2xl border border-[#1d7b49]/60 bg-[#064e3b]/85 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md ${
                      isMobileUi ? "px-3 py-2" : "px-4 py-3"
                    }`}
                  >
                    {(() => {
                      const g = pongDecision.groups[0];
                      if (!g) return null;
                      return (
                        <>
                          <div
                            className={`flex items-center gap-2 ${
                              isMobileUi ? "scale-90 origin-left" : ""
                            }`}
                          >
                            {g.tiles.slice(0, 3).map((t, ti) => (
                              <MahjongTileCard
                                key={`${t.suit}-${t.rank}-${ti}`}
                                tile={t}
                                size="xs"
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (pongDecision.kind === "normal_pong") {
                                  emitAcceptNormalPong(g.pongKey);
                                } else {
                                  emitAcceptInterruptPong(g.pongKey);
                                }
                                setPongDecision(null);
                              }}
                              className={acceptButtonClass}
                            >
                              接受
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (pongDecision.kind === "normal_pong") {
                                  emitPassNormalPong();
                                }
                                setPongDecision(null);
                              }}
                              className={cancelButtonClass}
                            >
                              跳过
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {chowDecision ? (
            <div className="pointer-events-none absolute inset-0 z-30">
              <div
                className={`pointer-events-none absolute flex items-center justify-center gap-3 ${
                  isPortraitPhone
                    ? "left-1/2 top-1/2"
                    : "left-1/2 bottom-[118px] -translate-x-1/2"
                }`}
                style={
                  isPortraitPhone ? (portraitUiStyle ?? undefined) : undefined
                }
              >
                <div
                  className={
                    isPortraitPhone && isMobileUi
                      ? "-translate-x-0 translate-y-10"
                      : undefined
                  }
                >
                  <div
                    className={`pointer-events-auto flex items-center gap-3 rounded-2xl border border-[#1d7b49]/60 bg-[#064e3b]/85 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md ${
                      isMobileUi ? "px-3 py-2" : "px-4 py-3"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      {chowDecision.groups.map((g, gi) => (
                        <div
                          key={`${g.chowKey}-${gi}`}
                          className="flex items-center gap-3"
                        >
                          <div
                            className={`flex items-center gap-2 ${
                              isMobileUi ? "scale-90 origin-left" : ""
                            }`}
                          >
                            {g.tiles.slice(0, 3).map((t, ti) => (
                              <MahjongTileCard
                                key={`${t.suit}-${t.rank}-${gi}-${ti}`}
                                tile={t}
                                size="xs"
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              emitAcceptNormalChow(g.chowKey);
                              setChowDecision(null);
                            }}
                            className={acceptButtonClass}
                          >
                            接受
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        emitPassNormalChow();
                        setChowDecision(null);
                      }}
                      className={cancelButtonClass}
                    >
                      跳过
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {winDecision ? (
            <div className="pointer-events-none absolute inset-0 z-30">
              <div
                className={`pointer-events-none absolute flex items-center justify-center gap-3 ${
                  isPortraitPhone
                    ? "left-1/2 top-1/2"
                    : "left-1/2 bottom-[118px] -translate-x-1/2"
                }`}
                style={
                  isPortraitPhone ? (portraitUiStyle ?? undefined) : undefined
                }
              >
                <div
                  className={
                    isPortraitPhone && isMobileUi
                      ? "-translate-x-0 translate-y-10"
                      : undefined
                  }
                >
                  <div
                    className={`pointer-events-auto flex items-center gap-3 rounded-2xl border border-[#1d7b49]/60 bg-[#064e3b]/85 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md ${
                      isMobileUi ? "px-3 py-2" : "px-4 py-3"
                    }`}
                    role="dialog"
                    aria-modal="true"
                  >
                    <div
                      className={`max-w-[240px] text-center font-extrabold tracking-wide text-amber-100 ${
                        isMobileUi ? "text-xs" : "text-sm"
                      }`}
                    >
                      {winDecision.message}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          emitAcceptWin(winDecision.userId);
                          setWinDecision(null);
                        }}
                        className={acceptButtonClass}
                      >
                        接受
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          emitPassWin(winDecision.userId);
                          setWinDecision(null);
                        }}
                        className={cancelButtonClass}
                      >
                        跳过
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {canTakeShownTileDecision ? (
            <div className="pointer-events-none absolute inset-0 z-30">
              <div
                className={`pointer-events-none absolute flex items-center justify-center gap-3 ${
                  isPortraitPhone
                    ? "left-1/2 top-1/2"
                    : "left-1/2 bottom-[118px] -translate-x-1/2"
                }`}
                style={
                  isPortraitPhone ? (portraitUiStyle ?? undefined) : undefined
                }
              >
                <div
                  className={
                    isPortraitPhone && isMobileUi
                      ? "-translate-x-0 translate-y-10"
                      : undefined
                  }
                >
                  <div
                    className={`pointer-events-auto flex flex-col items-center gap-3 rounded-2xl border border-[#1d7b49]/60 bg-[#064e3b]/85 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md ${
                      isMobileUi ? "px-3 py-2" : "px-4 py-3"
                    }`}
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="text-center font-bold text-amber-100 mb-2">
                      选择要拿的牌
                    </div>
                    <div className="flex flex-col gap-2">
                      {canTakeShownTileDecision.shownTiles.map(
                        (tileData, index) => (
                          <div
                            key={`${tileData.id}-${index}`}
                            className="flex items-center gap-3"
                          >
                            <div
                              className={`flex items-center gap-2 ${
                                isMobileUi ? "scale-90 origin-left" : ""
                              }`}
                            >
                              <MahjongTileCard
                                key={`${tileData.tile.suit}-${tileData.tile.rank}-${index}`}
                                tile={tileData.tile}
                                size="xs"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                emitAcceptShownTile(tileData.id, index);
                                setCanTakeShownTileDecision(null);
                              }}
                              className={acceptButtonClass}
                            >
                              接受
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                    {/* Note: According to requirements, no pass button needed for now */}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Dice3D({ face, rolling }: { face: number; rolling: boolean }) {
  const clamped = Math.min(6, Math.max(1, Math.floor(face)));
  const rotation = getDiceRotation(clamped);

  return (
    <div className={`dice3d ${rolling ? "dice3d-rolling" : ""}`}>
      <div className="dice3d-scene">
        <div
          className="dice3d-cube"
          style={rolling ? undefined : { transform: rotation }}
        >
          <div className="dice3d-face dice3d-face-front">
            <DicePips value={1} />
          </div>
          <div className="dice3d-face dice3d-face-right">
            <DicePips value={2} />
          </div>
          <div className="dice3d-face dice3d-face-top">
            <DicePips value={3} />
          </div>
          <div className="dice3d-face dice3d-face-bottom">
            <DicePips value={4} />
          </div>
          <div className="dice3d-face dice3d-face-left">
            <DicePips value={5} />
          </div>
          <div className="dice3d-face dice3d-face-back">
            <DicePips value={6} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DicePips({ value }: { value: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const pips: Array<"tl" | "tr" | "ml" | "mr" | "bl" | "br" | "c"> = (() => {
    switch (value) {
      case 1:
        return ["c"];
      case 2:
        return ["tl", "br"];
      case 3:
        return ["tl", "c", "br"];
      case 4:
        return ["tl", "tr", "bl", "br"];
      case 5:
        return ["tl", "tr", "c", "bl", "br"];
      case 6:
        return ["tl", "ml", "bl", "tr", "mr", "br"];
    }
  })();

  const pipTone = value === 1 || value === 4 ? "dice3d-pip-red" : undefined;

  return (
    <div className="dice3d-pips" aria-label={`Dice face ${value}`}>
      {pips.map((pos) => (
        <span
          key={pos}
          className={`dice3d-pip dice3d-pip-${pos} ${pipTone ?? ""}`}
        />
      ))}
    </div>
  );
}

function StartRoundModal({
  isMobileUi,
  onStart,
}: {
  isMobileUi: boolean;
  onStart: () => void;
}) {
  return (
    <div
      className={`pointer-events-auto w-full rounded-2xl border border-amber-100/15 bg-black/75 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm ${
        isMobileUi ? "max-w-[420px] p-4" : "max-w-[520px] p-5"
      }`}
      role="dialog"
      aria-modal="true"
    >
      <div className="text-center">
        <div className="text-lg font-extrabold tracking-tight text-amber-100">
          Ready to start?
        </div>
        <div className="mt-1 text-sm text-amber-100/80">
          Click start to begin the round.
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl border border-[#0d9276] bg-[#022c22]/95 px-5 py-2 text-sm font-bold text-white shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md hover:bg-[#022c22] hover:border-[#0d9276] hover:scale-105 active:scale-95 transition-all duration-200"
        >
          Start
        </button>
      </div>
    </div>
  );
}

function WinnerRevealModal({
  winnerReveal,
  isMobileUi,
  onClose,
}: {
  winnerReveal: WinnerRevealState;
  isMobileUi: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={`pointer-events-auto rounded-2xl border border-amber-100/15 bg-black/85 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-md ${
        isMobileUi
          ? "w-[98vw] p-2 max-h-[95vh] overflow-y-auto"
          : "w-full max-w-[860px] p-5"
      }`}
    >
      <div
        className={`grid grid-cols-3 items-center ${
          isMobileUi ? "gap-1 mb-1" : "gap-4 mb-4"
        }`}
      >
        <div />
        <div className="text-center">
          {winnerReveal.resultLabel ? (
            <div
              className={`font-black tracking-tight ${
                isMobileUi ? "text-base" : "text-3xl"
              } ${
                winnerReveal.resultLabel === "You Win"
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {winnerReveal.resultLabel === "You Win"
                ? "您赢了"
                : winnerReveal.resultLabel}
            </div>
          ) : null}
          <div
            className={`text-amber-100/90 font-medium ${isMobileUi ? "text-[9px]" : "text-sm"}`}
          >
            {winnerReveal.winnerName}
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl border border-[#920d0d] bg-[#2c0202]/95 font-bold text-red-50 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md hover:bg-[#3d0303] hover:border-[#b91111] hover:scale-105 active:scale-95 transition-all duration-200 ${
              isMobileUi ? "px-1.5 py-0.5 text-[9px]" : "px-3 py-1.5 text-sm"
            }`}
          >
            关闭
          </button>
        </div>
      </div>

      <div className={isMobileUi ? "text-center mb-1.5" : "text-center mb-3"}>
        {winnerReveal.winType && (
          <div
            className={`inline-block rounded-full bg-amber-500/20 px-2 py-0 text-[9px] font-bold uppercase tracking-widest text-amber-200 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)] ${
              isMobileUi ? "scale-90" : ""
            }`}
          >
            {(() => {
              switch (winnerReveal.winType) {
                case "self-draw":
                  return "自摸";
                case "left-discard":
                  return "吃胡";
                case "shown-tile":
                  return "杠开/明牌胡";
                default:
                  return winnerReveal.winType;
              }
            })()}
            {winnerReveal.isPure && " • 清一色"}
          </div>
        )}
      </div>

      <div
        className={`flex flex-wrap justify-center ${
          isMobileUi ? "gap-0.5" : "gap-1"
        }`}
      >
        {winnerReveal.tiles.map((t, idx) => (
          <div key={`${t.suit}-${t.rank}-${idx}`}>
            <MahjongTileCard tile={t} size="xxs" />
          </div>
        ))}
      </div>

      {winnerReveal.melds.length > 0 ? (
        <div
          className={`flex flex-wrap justify-center items-start ${
            isMobileUi ? "mt-2 gap-2" : "mt-3 gap-4"
          }`}
        >
          {(() => {
            const kinds: Array<"chow" | "pong" | "kong"> = [
              "chow",
              "pong",
              "kong",
            ];

            return kinds
              .map((kind) => {
                const groups = winnerReveal.melds.filter(
                  (m) => m.kind === kind,
                );
                if (groups.length === 0) return null;
                return (
                  <div key={kind} className="flex flex-col items-center">
                    <div className="text-[8px] font-bold uppercase tracking-tighter text-amber-100/30 mb-0.5">
                      {kind}
                    </div>
                    <div
                      className={`flex flex-wrap justify-center ${
                        isMobileUi ? "gap-1" : "gap-2"
                      }`}
                    >
                      {groups.map((g, gi) => (
                        <div key={`${kind}-${gi}`} className="flex gap-0.5">
                          {g.tiles.map((tile, ti) => (
                            <MahjongTileCard
                              key={`${kind}-${gi}-${tile.suit}-${tile.rank}-${ti}`}
                              tile={tile}
                              size="xxs"
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
              .filter(Boolean);
          })()}
        </div>
      ) : null}

      {winnerReveal.payouts && winnerReveal.payouts.length > 0 && (
        <div
          className={`mt-2 border-t border-amber-100/10 pt-2 ${
            isMobileUi ? "px-0" : "px-4"
          }`}
        >
          <div className="text-[9px] font-bold uppercase tracking-widest text-amber-100/40 mb-1 text-center">
            结算
          </div>
          <div className="flex flex-col gap-1.5">
            {winnerReveal.payouts.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 border border-white/5"
              >
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[9px] font-bold text-amber-200">
                    {p.payerId}
                  </div>
                  <span
                    className={`font-medium text-amber-100/80 ${isMobileUi ? "text-[10px]" : "text-xs"}`}
                  >
                    玩家 {p.payerId}
                  </span>
                </div>
                <div
                  className={`font-mono font-black text-rose-400 ${isMobileUi ? "text-[10px]" : "text-sm"}`}
                >
                  -{p.amount}X
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getDiceRotation(face: number) {
  // Rotate cube so that `face` is facing the camera.
  switch (face) {
    case 1:
      return "rotateX(0deg) rotateY(0deg)";
    case 2:
      return "rotateX(0deg) rotateY(-90deg)";
    case 3:
      return "rotateX(-90deg) rotateY(0deg)";
    case 4:
      return "rotateX(90deg) rotateY(0deg)";
    case 5:
      return "rotateX(0deg) rotateY(90deg)";
    case 6:
      return "rotateX(0deg) rotateY(180deg)";
    default:
      return "rotateX(0deg) rotateY(0deg)";
  }
}
