"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSelector } from "react-redux";
import {
  createMahjong72Deck,
  isWinningMahjong72Hand,
  MahjongTile,
  shuffleInPlace,
  sortTiles,
} from "@/lib/mahjong72";
import { fetchMahjongJoinToken } from "@/lib/mahjongRoomApi";
import { connectSocket, getSocket } from "@/lib/wsClient";
import type { RootState } from "@/redux/store";
import { fetchWsJwtToken } from "@/lib/wsTokenApi";

type WinType = "self_draw" | "ron";

type MahjongRoomState = unknown;

const MahjongPixiTable = dynamic(() => import("./MahjongPixiTable"), {
  ssr: false,
});

function computePayout(betAmount: number, winType: WinType): number {
  if (!Number.isFinite(betAmount) || betAmount <= 0) return 0;
  const multiplier = winType === "self_draw" ? 2 : 1;
  return betAmount * multiplier;
}

export default function MahjongClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdParam = searchParams.get("room_id");
  const roomId = roomIdParam ? Number(roomIdParam) : null;
  const token = useSelector((s: RootState) => s.auth.token);

  const [joinError, setJoinError] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<MahjongRoomState | null>(null);
  const [centerMessage, setCenterMessage] = useState<string | null>(null);

  const [wall, setWall] = useState<MahjongTile[]>([]);
  const [hand, setHand] = useState<MahjongTile[]>([]);
  const [discards, setDiscards] = useState<MahjongTile[]>([]);

  const [betAmount, setBetAmount] = useState<string>("1000");
  const [winType, setWinType] = useState<WinType>("self_draw");
  const [lastWinOk, setLastWinOk] = useState<boolean | null>(null);

  const numericBet = useMemo(() => Number(betAmount || "0"), [betAmount]);
  const payout = useMemo(
    () => (lastWinOk ? computePayout(numericBet, winType) : 0),
    [numericBet, winType, lastWinOk],
  );

  const hasGame = wall.length > 0 || hand.length > 0;
  const canDraw = wall.length > 0 && hand.length === 13;
  const mustDiscard = hand.length === 14;
  const canCheckWin = hand.length === 14;

  useEffect(() => {
    if (!token) return;
    if (!roomId || !Number.isFinite(roomId)) return;

    let cancelled = false;

    const ensureSocket = async () => {
      const existing = getSocket();
      if (existing) return existing;

      const wsToken = await fetchWsJwtToken();
      if (cancelled) return null;
      return connectSocket({ token: wsToken });
    };

    const handleJoinSuccess = (data: unknown) => {
      if (cancelled) return;
      setRoomState(data);
      setJoinError(null);
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
        setCenterMessage("Waiting for players...");
      };

      const handleCountdownStarted = () => {
        if (cancelled) return;
        setCenterMessage("Starting...");
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
        setCenterMessage(`Starting in ${remaining}`);
      };

      socket.off("mahjong:waiting_for_players", handleWaitingForPlayers);
      socket.on("mahjong:waiting_for_players", handleWaitingForPlayers);

      socket.off("mahjong:countdown_started", handleCountdownStarted);
      socket.on("mahjong:countdown_started", handleCountdownStarted);

      socket.off("mahjong:countdown", handleCountdown);
      socket.on("mahjong:countdown", handleCountdown);

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
      const socket = getSocket();
      socket?.off("mahjong:join_room_success", handleJoinSuccess);
      socket?.off("mahjong:waiting_for_players", handleWaitingForPlayers);
      socket?.off("mahjong:countdown_started", handleCountdownStarted);
      socket?.off("mahjong:countdown", handleCountdown);
    };
  }, [token, roomId]);

  const startNewGame = () => {
    const deck = shuffleInPlace(createMahjong72Deck());
    const newHand = deck.slice(0, 13);
    const newWall = deck.slice(13);

    setHand(sortTiles(newHand));
    setWall(newWall);
    setDiscards([]);
    setLastWinOk(null);
  };

  const drawTile = () => {
    if (!canDraw) return;
    const next = wall[0];
    const rest = wall.slice(1);
    setWall(rest);
    setHand(sortTiles([...hand, next]));
    setLastWinOk(null);
  };

  const discardAt = (idx: number) => {
    if (!mustDiscard) return;
    const tile = hand[idx];
    setHand(sortTiles(hand.filter((_, i) => i !== idx)));
    if (tile) setDiscards((prev) => [...prev, tile]);
    setLastWinOk(null);
  };

  const checkWin = () => {
    if (!canCheckWin) return;
    const res = isWinningMahjong72Hand(hand);
    setLastWinOk(res.ok);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden text-amber-100">
      <div className="absolute inset-0 bg-[#00251b]" />

      <div className="absolute left-4 top-4 z-20 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full bg-black/40 p-2 hover:bg-black/60"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-lg font-semibold text-amber-200">
            Mahjong (72 Tiles)
          </div>
          <div className="text-xs text-amber-50/70">Win = 4 melds + 1 pair</div>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 w-[360px] rounded-2xl border border-amber-100/15 bg-black/50 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        {roomId ? (
          <div className="mb-3 rounded-xl border border-amber-100/10 bg-black/35 px-3 py-2 text-xs text-amber-100/90">
            Room ID: {roomId}
            {joinError ? (
              <div className="mt-1 text-red-200">Join error: {joinError}</div>
            ) : roomState ? (
              <div className="mt-1 text-green-200">Joined room</div>
            ) : (
              <div className="mt-1 text-amber-200/80">Joining...</div>
            )}
          </div>
        ) : null}

        <div className="flex items-center justify-between text-sm text-amber-200/90">
          <div>Wall: {wall.length}</div>
          <div>Hand: {hand.length}</div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={startNewGame}
            className="rounded-full bg-amber-100/90 px-5 py-2 text-[#3b0500] hover:bg-amber-100"
          >
            {hasGame ? "Restart" : "Start"}
          </Button>
          <Button
            onClick={drawTile}
            disabled={!canDraw}
            className="rounded-full bg-amber-100/90 px-5 py-2 text-[#3b0500] hover:bg-amber-100 disabled:opacity-60"
          >
            Draw
          </Button>
          <Button
            onClick={checkWin}
            disabled={!canCheckWin}
            className="rounded-full bg-amber-100/90 px-5 py-2 text-[#3b0500] hover:bg-amber-100 disabled:opacity-60"
          >
            Check Win
          </Button>
        </div>

        {lastWinOk != null ? (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
              lastWinOk
                ? "border-green-500/30 bg-green-900/30 text-green-100"
                : "border-red-500/30 bg-red-900/30 text-red-100"
            }`}
          >
            {lastWinOk ? "Winning hand!" : "Not a winning hand."}
          </div>
        ) : null}

        <div className="mt-4 border-t border-amber-100/10 pt-4">
          <div className="text-sm font-semibold text-amber-100">
            Simple Scoring
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <Input
              value={betAmount}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                setBetAmount(digitsOnly);
              }}
              inputMode="numeric"
              placeholder="Bet Amount"
              className="rounded-xl bg-[#1a130c]"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setWinType("self_draw")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  winType === "self_draw"
                    ? "border-amber-200 bg-amber-100/90 text-[#3b0500]"
                    : "border-amber-100/15 bg-black/40 text-amber-200/80"
                }`}
              >
                Self-draw (x2)
              </button>
              <button
                onClick={() => setWinType("ron")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  winType === "ron"
                    ? "border-amber-200 bg-amber-100/90 text-[#3b0500]"
                    : "border-amber-100/15 bg-black/40 text-amber-200/80"
                }`}
              >
                Ron (x1)
              </button>
            </div>

            <div className="rounded-xl border border-amber-100/10 bg-black/40 px-3 py-2 text-sm text-amber-100">
              Payout: {payout.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <MahjongPixiTable
          wallCount={wall.length}
          hand={hand}
          discards={discards}
          highlightDiscard={mustDiscard}
          onDiscard={discardAt}
          centerMessage={centerMessage}
        />
      </div>
    </div>
  );
}
