"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSelector } from "react-redux";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

type RoundPlayer = {
  userId: number;
  name: string;
  seatPosition: number;
};

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
  const authUserId = useSelector((s: RootState) =>
    s.auth.id ? Number(s.auth.id) : null,
  );

  const [joinError, setJoinError] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<MahjongRoomState | null>(null);
  const [centerMessage, setCenterMessage] = useState<string | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceFaces, setDiceFaces] = useState<[number, number] | null>(null);
  const [roundPlayers, setRoundPlayers] = useState<RoundPlayer[]>([]);
  const [firstPlayerHighlightId, setFirstPlayerHighlightId] = useState<
    number | null
  >(null);

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
    let roundToastTimer: number | null = null;
    let diceTimer: number | null = null;
    let firstPlayerHighlightTimer: number | null = null;

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

      const handleRoundStarted = () => {
        if (cancelled) return;
        setCenterMessage("Round started");
        if (roundToastTimer) window.clearTimeout(roundToastTimer);
        roundToastTimer = window.setTimeout(() => {
          setCenterMessage((prev) => (prev === "Round started" ? null : prev));
        }, 1400);
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
            const nameRaw = (p as { name?: unknown }).name;

            const userId = Number(userIdRaw);
            const seatPosition = Number(seatRaw);
            const name = typeof nameRaw === "string" ? nameRaw : "";

            if (!Number.isFinite(userId) || !Number.isFinite(seatPosition))
              return null;
            return { userId, name, seatPosition };
          })
          .filter((p): p is RoundPlayer => !!p);
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
      };

      const handleStartRollingDice = () => {
        if (cancelled) return;
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

      const handleFirstPlayerSelected = (payload: unknown) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) return;
        const userIdRaw = (payload as { user_id_to_play_first?: unknown })
          .user_id_to_play_first;
        const userId = Number(userIdRaw);
        if (!Number.isFinite(userId)) return;

        setFirstPlayerHighlightId(userId);
        if (firstPlayerHighlightTimer)
          window.clearTimeout(firstPlayerHighlightTimer);
        firstPlayerHighlightTimer = window.setTimeout(() => {
          setFirstPlayerHighlightId(null);
        }, 2200);
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

      socket.off(
        "mahjong:user_to_play",
        handleFirstPlayerSelected,
      );
      socket.on(
        "mahjong:user_to_play",
        handleFirstPlayerSelected,
      );

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
      if (roundToastTimer) window.clearTimeout(roundToastTimer);
      if (diceTimer) window.clearInterval(diceTimer);
      if (firstPlayerHighlightTimer)
        window.clearTimeout(firstPlayerHighlightTimer);
      const socket = getSocket();
      socket?.off("mahjong:join_room_success", handleJoinSuccess);
      socket?.off("mahjong:waiting_for_players");
      socket?.off("mahjong:countdown_started");
      socket?.off("mahjong:countdown");
      socket?.off("mahjong:round_started");
      socket?.off("mahjong:update_round_players");
      socket?.off("mahjong:start_rolling_dice");
      socket?.off("mahjong:dice_rolled");
      socket?.off("mahjong:user_to_play");
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
          hand={hand}
          discards={discards}
          highlightDiscard={mustDiscard}
          onDiscard={discardAt}
          centerMessage={centerMessage}
        />
      </div>

      {/* Overlays (HTML) */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {(diceRolling || diceFaces) ? (
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              transform: "translate(-50%, -50%) translateY(-70px)",
            }}
          >
            <div className="rounded-[18px] bg-black/35 px-4 py-3 shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-sm ring-1 ring-amber-100/10">
              <div className="flex items-center gap-4">
                <Dice3D face={diceFaces?.[0] ?? 1} rolling={diceRolling} />
                <Dice3D face={diceFaces?.[1] ?? 1} rolling={diceRolling} />
              </div>
            </div>
          </div>
        ) : null}

        {(() => {
          if (roundPlayers.length === 0) return null;

          const authPlayer =
            authUserId != null
              ? (roundPlayers.find((p) => p.userId === authUserId) ?? null)
              : null;
          const fallbackAuthPlayer = authPlayer ?? roundPlayers[0] ?? null;
          const others = roundPlayers.filter((p) => p !== fallbackAuthPlayer);
          const seatOrder = ["right", "top", "left"] as const;
          const seats: Array<{
            position: "bottom" | "right" | "top" | "left";
            player: RoundPlayer;
          }> = [];

          if (fallbackAuthPlayer) {
            seats.push({ position: "bottom", player: fallbackAuthPlayer });
          }

          for (let i = 0; i < others.length && i < seatOrder.length; i++) {
            const other = others[i];
            if (!other) continue;
            seats.push({ position: seatOrder[i], player: other });
          }

          const Seat = ({
            player,
            position,
          }: {
            player: RoundPlayer;
            position: "bottom" | "right" | "top" | "left";
          }) => {
            const base =
              "absolute flex items-center gap-2 rounded-full border border-amber-100/20 bg-black/40 px-3 py-2 text-xs text-amber-100 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm";
            const pos =
              position === "bottom"
                ? "left-1/2 bottom-6 -translate-x-1/2"
                : position === "top"
                  ? "left-1/2 top-6 -translate-x-1/2"
                  : position === "left"
                    ? "left-6 top-1/2 -translate-y-1/2"
                    : "right-6 top-1/2 -translate-y-1/2";

            const name = player.name;
            const initials =
              (player.name || "")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase())
                .join("") || "?";

            const isHighlighted =
              player != null && firstPlayerHighlightId != null
                ? player.userId === firstPlayerHighlightId
                : false;

            return (
              <div
                className={`${base} ${pos} ${
                  isHighlighted
                    ? "animate-[seat-pop_0.55s_ease-in-out_5] ring-4 ring-amber-200/80 shadow-[0_0_0_14px_rgba(255,210,125,0.18),0_34px_90px_rgba(0,0,0,0.55)]"
                    : ""
                }`}
              >
                <Avatar className="size-8 border border-amber-100/20 bg-black/30">
                  <AvatarFallback className="bg-black/30 text-amber-100 font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-[140px] truncate font-semibold">
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
          <div className="dice3d-face dice3d-face-front">1</div>
          <div className="dice3d-face dice3d-face-right">2</div>
          <div className="dice3d-face dice3d-face-top">3</div>
          <div className="dice3d-face dice3d-face-bottom">4</div>
          <div className="dice3d-face dice3d-face-left">5</div>
          <div className="dice3d-face dice3d-face-back">6</div>
        </div>
      </div>
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
      return "rotateX(90deg) rotateY(0deg)";
    case 4:
      return "rotateX(-90deg) rotateY(0deg)";
    case 5:
      return "rotateX(0deg) rotateY(90deg)";
    case 6:
      return "rotateX(0deg) rotateY(180deg)";
    default:
      return "rotateX(0deg) rotateY(0deg)";
  }
}
