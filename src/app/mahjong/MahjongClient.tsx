"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { useSelector } from "react-redux";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MahjongTile,
} from "@/lib/mahjong72";
import { fetchMahjongJoinToken } from "@/lib/mahjongRoomApi";
import { connectSocket, getSocket } from "@/lib/wsClient";
import type { RootState } from "@/redux/store";
import { fetchWsJwtToken } from "@/lib/wsTokenApi";

type MahjongRoomState = unknown;

type RoundPlayer = {
  userId: number;
  name: string;
  seatPosition: number;
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

  const [joinError, setJoinError] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<MahjongRoomState | null>(null);
  const [centerMessage, setCenterMessage] = useState<string | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceFaces, setDiceFaces] = useState<[number, number] | null>(null);
  const [roundPlayers, setRoundPlayers] = useState<RoundPlayer[]>([]);
  const [firstPlayerHighlightId, setFirstPlayerHighlightId] = useState<
    number | null
  >(null);
  const [activeSides, setActiveSides] = useState<
    Array<"bottom" | "right" | "top" | "left">
  >([]);
  const [opponentHandCounts, setOpponentHandCounts] = useState<
    Partial<Record<"right" | "top" | "left", number>>
  >({});

  const [,] = useState<MahjongTile[]>([]);
  const [hand, setHand] = useState<MahjongTile[]>([]);
  const [discards, setDiscards] = useState<MahjongTile[]>([]);

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

      const handleInitialHandState = (payload: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(payload)) return;

        // Use the seated player count to decide which wall sides to render.
        // (Avatars use the same bottom->right->top->left order.)
        const count = payload.length;
        if (count >= 1) {
          const sides: Array<"bottom" | "right" | "top" | "left"> = ["bottom"];
          if (count >= 2) sides.push("right");
          if (count >= 3) sides.push("top");
          if (count >= 4) sides.push("left");
          setActiveSides(sides);
        }

        // Map non-self players' tileCount to the corresponding side so the small
        // wall blocks match the hidden hand size (commonly 13).
        const nextOpponentCounts: Partial<Record<"right" | "top" | "left", number>> =
          {};
        for (const p of payload) {
          if (typeof p !== "object" || p === null) continue;
          if ((p as { isSelf?: unknown }).isSelf === true) continue;
          const seatRaw =
            (p as { seat_position?: unknown; seatPosition?: unknown })
              .seat_position ?? (p as { seat_position?: unknown; seatPosition?: unknown }).seatPosition;
          const seat = Number(seatRaw);
          const tilesRaw = (p as { tiles?: unknown }).tiles;
          const tileCountFromTiles = Array.isArray(tilesRaw) ? tilesRaw.length : NaN;
          const tileCountRaw = (p as { tileCount?: unknown }).tileCount;
          const tileCountFromField = Number(tileCountRaw);
          const tileCount = Number.isFinite(tileCountFromTiles)
            ? tileCountFromTiles
            : tileCountFromField;
          if (!Number.isFinite(tileCount) || tileCount <= 0) continue;
          if (seat === 2) nextOpponentCounts.right = tileCount;
          if (seat === 3) nextOpponentCounts.top = tileCount;
          if (seat === 4) nextOpponentCounts.left = tileCount;
        }
        setOpponentHandCounts(nextOpponentCounts);

        const self = payload.find(
          (p) => typeof p === "object" && p !== null && (p as { isSelf?: unknown }).isSelf === true,
        ) as
          | {
              tiles?: unknown;
              tileCount?: unknown;
              seat_position?: unknown;
              seatPosition?: unknown;
            }
          | undefined;

        const tilesRaw = self?.tiles;
        if (!Array.isArray(tilesRaw)) return;

        const nextHand: MahjongTile[] = [];
        for (const t of tilesRaw) {
          if (typeof t !== "object" || t === null) continue;
          const typeRaw = (t as { type?: unknown }).type;
          const numberRaw = (t as { number?: unknown }).number;
          if (typeRaw === "hidden") continue;

          const rank = Number(numberRaw);
          if (!Number.isFinite(rank) || rank < 1 || rank > 9) continue;

          // WS uses "dot" | "bamboo". Our internal suit uses "dots" | "bamboo".
          const suit: MahjongTile["suit"] | null =
            typeRaw === "bamboo" ? "bamboo" : typeRaw === "dot" ? "dots" : null;
          if (!suit) continue;

          nextHand.push({ suit, rank });
        }

        if (nextHand.length > 0) {
          // Preserve server order for now.
          setHand(nextHand);
        }
        // Reset discards when a new initial state arrives.
        setDiscards([]);
      };

      const handleStartShuffling = () => {
        if (cancelled) return;
        // Visible cue for the "start shuffling" server event.
        setCenterMessage("Shuffling Tiles");
        // Lightweight debug log for parity with example client snippet.
        console.log("Shuffling Tiles");
      };

      const handleFirstPlayerSelected = (payload: unknown) => {
        if (cancelled) return;
        if (typeof payload !== "object" || payload === null) return;
        const p = payload as {
          user_id?: unknown;
          userId?: unknown;
          user_id_to_play_first?: unknown;
          user_name?: unknown;
          userName?: unknown;
        };
        // Server now sends `{ user_id, user_name }`, but keep backward-compat with older payloads.
        const userIdRaw = p.user_id ?? p.userId ?? p.user_id_to_play_first;
        const userId = Number(userIdRaw);
        if (!Number.isFinite(userId)) return;

        setFirstPlayerHighlightId(userId);
        const nameRaw = p.user_name ?? p.userName;
        if (typeof nameRaw === "string" && nameRaw.trim()) {
          setCenterMessage(`${nameRaw} to play first`);
        } else {
          setCenterMessage("User to play first selected");
        }
        if (firstPlayerHighlightTimer)
          window.clearTimeout(firstPlayerHighlightTimer);
        firstPlayerHighlightTimer = window.setTimeout(() => {
          setFirstPlayerHighlightId(null);
          setCenterMessage(null);
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

      socket.off("mahjong:initial_hand_state", handleInitialHandState);
      socket.on("mahjong:initial_hand_state", handleInitialHandState);

      socket.off("mahjong:start_shuffling", handleStartShuffling);
      socket.on("mahjong:start_shuffling", handleStartShuffling);

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
      socket?.off("mahjong:initial_hand_state");
      socket?.off("mahjong:start_shuffling");
      socket?.off("mahjong:user_to_play");
    };
  }, [token, roomId]);

  useEffect(() => {
    if (roundPlayers.length === 0) return;
    const authPlayer =
      authUserId != null
        ? (roundPlayers.find((p) => p.userId === authUserId) ?? null)
        : null;
    const self = authPlayer ?? roundPlayers[0] ?? null;
    const others = self ? roundPlayers.filter((p) => p !== self) : [];

    const sides: Array<"bottom" | "right" | "top" | "left"> = [];
    if (self) sides.push("bottom");
    if (others.length >= 1) sides.push("right");
    if (others.length >= 2) sides.push("top");
    if (others.length >= 3) sides.push("left");
    setActiveSides(sides);
  }, [roundPlayers, authUserId]);

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
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold text-amber-200">
              Mahjong (72 Tiles)
            </div>
            {roomId ? (
              <div className="text-xs text-amber-50/70">
                Room ID: {roomId}{" "}
                {joinError
                  ? "(Join error)"
                  : roomState
                    ? "(Joined)"
                    : "(Joining...)"}
              </div>
            ) : null}
          </div>
          <div className="text-xs text-amber-50/70">Win = 4 melds + 1 pair</div>
        </div>
      </div>

      {/* Right-side control panel removed (WS drives game state). */}

      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <MahjongPixiTable
          hand={hand}
          discards={discards}
          highlightDiscard={false}
          centerMessage={centerMessage}
          activeSides={activeSides}
          opponentHandCounts={opponentHandCounts}
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
                ? "left-1/2 bottom-2 -translate-x-1/2"
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
