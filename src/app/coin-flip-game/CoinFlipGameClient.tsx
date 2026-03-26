"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Coins } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { toast } from "sonner";
import { enterCoinflipRoom } from "@/lib/coinflipApi";
import {
  getSocket,
  joinCoinflipGameRoom,
  leaveCoinflipGameRoom,
} from "@/lib/wsClient";
import { useAppSelector } from "@/redux/hook";
import {
  useGetGameRoomByIdQuery,
  useGetWalletBalanceQuery,
  usePlaceCoinflipBetMutation,
} from "@/redux/features/game/GameRoomApiSlice";
import { skipToken } from "@reduxjs/toolkit/query";

type FlipAngles = {
  x: number;
  y: number;
  z: number;
};

type CoinflipWsBetInfo = {
  user_id: number;
  user_name: string;
  bet_amount: number;
  bet_side: "HEAD" | "TAIL";
  possible_winning_amount?: number;
};

type CoinflipTotals = {
  HEAD: number;
  TAIL: number;
  POT: number;
};

type CoinflipWinningChance = {
  HEAD: number;
  TAIL: number;
};

type CoinflipBetInfosPayload = {
  round_id: number;
  totals: CoinflipTotals;
  winning_chance: CoinflipWinningChance;
  bet_users: CoinflipWsBetInfo[];
};

type CoinflipRoundStatePayload = {
  round_id: number;
  round_number: number;
  status: string;
  remaining_time: number;
  bet_infos: CoinflipBetInfosPayload | CoinflipWsBetInfo[];
};

type CoinflipBetUpdatedPayload = {
  round_id: number;
  bet_infos: CoinflipBetInfosPayload | CoinflipWsBetInfo[];
};

type CoinflipRoundFinishedPayload = {
  winner_side?: "HEAD" | "TAIL";
  bet_side?: "HEAD" | "TAIL";
  result?: "HEAD" | "TAIL";
  data?: {
    winner_side?: "HEAD" | "TAIL";
    result?: "HEAD" | "TAIL";
  };
  round_result?: {
    response: { status: string; message: string };
    data?: {
      winning_side?: "HEAD" | "TAIL";
      user_result_lists?: {
        user_id: number;
        user_name: string;
        status: string;
        winning_amount: number;
      }[];
    };
  };
};

const chatMessages = [
  { id: 1, author: "Neo", text: "Calling heads!" },
  { id: 2, author: "Ava", text: "Tails never fails." },
  { id: 3, author: "Lynn", text: "Anyone feeling lucky?" },
  { id: 4, author: "Rey", text: "Flipping soon..." },
];

export default function CoinFlipGameClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameRoomIdParam = searchParams.get("game_room_id");
  const roomId = gameRoomIdParam ? Number(gameRoomIdParam) : null;
  const wsDebugEnabled = process.env.NEXT_PUBLIC_WS_DEBUG === "1";

  const flipIntervalRef = useRef<number | null>(null);
  const resultTimeoutRef = useRef<number | null>(null);

  const userId = useAppSelector((s) => s.auth.id);
  const userName = useAppSelector((s) => s.auth.name);

  const [timeLeft, setTimeLeft] = useState(0);
  const [timerText, setTimerText] = useState<string | null>(null);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [bets, setBets] = useState<CoinflipWsBetInfo[]>([]);
  const [totals, setTotals] = useState<CoinflipTotals | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [isWsReconnecting, setIsWsReconnecting] = useState(false);

  const [activeTab, setActiveTab] = useState("bets");
  const [selectedSide, setSelectedSide] = useState<"head" | "tail">("head");
  const [isFlipping, setIsFlipping] = useState(false);
  const [betAmount, setBetAmount] = useState("");
  const [result, setResult] = useState<"head" | "tail">("head");
  const [flipAngles, setFlipAngles] = useState<FlipAngles>({
    x: 0,
    y: 0,
    z: 0,
  });

  const [placeBet, { isLoading: isPlacingBet }] = usePlaceCoinflipBetMutation();

  const { data: room } = useGetGameRoomByIdQuery(roomId ?? skipToken);
  const { refetch: refetchWalletBalance } = useGetWalletBalanceQuery();

  const minBetAmount = room?.data.game_rule.min_bet_amount;
  const maxBetAmount = room?.data.game_rule.max_bet_amount;

  const headsAmount = totals?.HEAD ?? 0;
  const tailsAmount = totals?.TAIL ?? 0;
  const totalAmount = totals?.POT ?? headsAmount + tailsAmount;
  const headsPercent =
    totalAmount > 0 ? Math.round((headsAmount / totalAmount) * 100) : 50;
  const tailsPercent = 100 - headsPercent;

  const applyBetInfos = (betInfos: unknown) => {
    if (!betInfos) return;

    // New payload shape: { totals, winning_chance, bet_users }
    if (typeof betInfos === "object" && !Array.isArray(betInfos)) {
      const obj = betInfos as Partial<CoinflipBetInfosPayload>;
      if (obj.totals && typeof obj.totals === "object") {
        const t = obj.totals as Partial<CoinflipTotals>;
        if (
          typeof t.HEAD === "number" &&
          typeof t.TAIL === "number" &&
          typeof t.POT === "number"
        ) {
          setTotals({ HEAD: t.HEAD, TAIL: t.TAIL, POT: t.POT });
        }
      }

      if (Array.isArray(obj.bet_users)) {
        setBets(obj.bet_users as CoinflipWsBetInfo[]);
      }

      return;
    }

    // Back-compat: old payload shape bet_infos: CoinflipWsBetInfo[]
    if (Array.isArray(betInfos)) {
      setTotals(null);
      setBets(betInfos as CoinflipWsBetInfo[]);
    }
  };

  const extractWinnerSide = (d: unknown): "head" | "tail" | null => {
    if (typeof d !== "object" || d === null) return null;
    const payload = d as CoinflipRoundFinishedPayload;
    const winner =
      payload.round_result?.data?.winning_side ??
      payload.winner_side ??
      payload.result ??
      payload.bet_side ??
      payload.data?.winner_side ??
      payload.data?.result;

    if (winner === "HEAD") return "head";
    if (winner === "TAIL") return "tail";
    return null;
  };

  useEffect(() => {
    if (!roomId || Number.isNaN(roomId)) return;
    if (!userId || !userName) return;

    const userIdNumber = Number(userId);
    if (!Number.isFinite(userIdNumber)) return;

    let mounted = true;

    let emitJoin: (() => void) | null = null;
    let onRoomJoined: ((d: unknown) => void) | null = null;
    let onCurrentRoundState: ((d: unknown) => void) | null = null;
    let onRoundStarted: ((d: unknown) => void) | null = null;
    let onRoundTicked: ((d: unknown) => void) | null = null;
    let onCountdownRestart: ((d: unknown) => void) | null = null;
    let onBetUpdated: ((d: unknown) => void) | null = null;
    let onWsConnected: ((d: unknown) => void) | null = null;
    let onRoomFull: ((d: unknown) => void) | null = null;
    let onRoundLocked: (() => void) | null = null;
    let onStartFlipping: (() => void) | null = null;
    let onRoundFinished: ((d: unknown) => void) | null = null;
    let onWaitNewRound: (() => void) | null = null;
    let onUserLeft: ((d: unknown) => void) | null = null;
    let onWsConnect: (() => void) | null = null;
    let onWsDisconnect: ((reason: unknown) => void) | null = null;
    let onWsConnectError: ((err: unknown) => void) | null = null;
    let onWsReconnectAttempt: ((attempt: unknown) => void) | null = null;
    let onWsReconnected: ((attempt: unknown) => void) | null = null;

    const join = async () => {
      const enterRes = await enterCoinflipRoom(roomId).catch((err) => {
        if (wsDebugEnabled) console.log("[coinflip] enter room failed", err);
        return err;
      });

      if (!enterRes?.ok) {
        const message =
          enterRes?.response?.data?.response?.message ||
          enterRes?.message ||
          "Unable to enter room.";
        toast.error(message);
        setRoomError(message);
        router.back();
        return;
      }

      if (!mounted) return;

      const socket = getSocket();
      if (!socket) {
        setRoomError("Websocket not connected");
        return;
      }

      onWsConnect = () => {
        setIsWsReconnecting(false);
      };
      onWsDisconnect = () => {
        setIsWsReconnecting(true);
      };
      onWsConnectError = () => {
        setIsWsReconnecting(true);
      };
      onWsReconnectAttempt = () => {
        setIsWsReconnecting(true);
      };
      onWsReconnected = () => {
        setIsWsReconnecting(false);
      };

      socket.off("connect", onWsConnect);
      socket.on("connect", onWsConnect);
      socket.off("disconnect", onWsDisconnect);
      socket.on("disconnect", onWsDisconnect);
      socket.off("connect_error", onWsConnectError);
      socket.on("connect_error", onWsConnectError);
      socket.io.off("reconnect_attempt", onWsReconnectAttempt);
      socket.io.on("reconnect_attempt", onWsReconnectAttempt);
      socket.io.off("reconnect", onWsReconnected);
      socket.io.on("reconnect", onWsReconnected);

      leaveCoinflipGameRoom({
        roomId,
        user: { id: userIdNumber, name: userName },
      });

      setRoomError(null);

      emitJoin = () =>
        joinCoinflipGameRoom({
          roomId,
          user: {
            id: userIdNumber,
            name: userName,
          },
        });

      if (wsDebugEnabled) {
        console.log("[coinflip] setup listeners", {
          roomId,
          socketId: socket.id,
        });
      }

      socket.off("connect", emitJoin);
      socket.on("connect", emitJoin);
      if (socket.connected) emitJoin();

      onWsConnected = (d: unknown) => {
        if (wsDebugEnabled) console.log("[coinflip] ws:connected", d);
      };

      onRoomJoined = (d: unknown) => {
        if (wsDebugEnabled) console.log("[coinflip] room_joined", d);
      };

      onRoundStarted = (d: unknown) => {
        if (typeof d !== "object" || d === null) return;
        if (wsDebugEnabled) console.log("[coinflip] round_started", d);
        setTimerText(null);
        if (resultTimeoutRef.current) {
          window.clearTimeout(resultTimeoutRef.current);
          resultTimeoutRef.current = null;
        }
        if (flipIntervalRef.current) {
          window.clearInterval(flipIntervalRef.current);
          flipIntervalRef.current = null;
        }
        setIsFlipping(false);
        if (
          "round_id" in d &&
          typeof (d as { round_id?: unknown }).round_id === "number"
        ) {
          setRoundId((d as { round_id: number }).round_id);
        }
        if (
          "remaining_time" in d &&
          typeof (d as { remaining_time?: unknown }).remaining_time === "number"
        ) {
          setTimeLeft((d as { remaining_time: number }).remaining_time);
        }
      };

      onCurrentRoundState = (d: unknown) => {
        if (typeof d !== "object" || d === null) return;
        if (wsDebugEnabled) console.log("[coinflip] current_round_state", d);
        const payload = d as Partial<CoinflipRoundStatePayload>;
        if (typeof payload.round_id === "number") setRoundId(payload.round_id);
        if (typeof payload.remaining_time === "number") {
          setTimeLeft(payload.remaining_time);
        }
        if ("bet_infos" in payload) {
          applyBetInfos(payload.bet_infos);
        }
      };

      onRoundTicked = (d: unknown) => {
        if (typeof d !== "object" || d === null) return;
        setTimerText(null);
        if (
          "remaining_time" in d &&
          typeof (d as { remaining_time?: unknown }).remaining_time === "number"
        ) {
          setTimeLeft((d as { remaining_time: number }).remaining_time);
        }
      };

      onCountdownRestart = (d: unknown) => {
        if (typeof d !== "object" || d === null) return;
        if (wsDebugEnabled) console.log("[coinflip] countdown_restart", d);
        setTimerText(null);
        if (
          "remaining_time" in d &&
          typeof (d as { remaining_time?: unknown }).remaining_time === "number"
        ) {
          setTimeLeft((d as { remaining_time: number }).remaining_time);
        }
      };

      onBetUpdated = (d: unknown) => {
        if (typeof d !== "object" || d === null) return;
        if (wsDebugEnabled) console.log("[coinflip] bet_updated", d);
        const payload = d as Partial<CoinflipBetUpdatedPayload>;
        if (typeof payload.round_id === "number") setRoundId(payload.round_id);
        if ("bet_infos" in payload) {
          applyBetInfos(payload.bet_infos);
        }
      };

      onRoundLocked = () => {
        if (wsDebugEnabled) console.log("[coinflip] round_locked", { roomId });
        setTimerText("LOCKED");
        setTimeLeft(0);
      };

      onStartFlipping = () => {
        if (wsDebugEnabled)
          console.log("[coinflip] start_flipping", { roomId });
        setTimerText("FLIPPING...");
        setTimeLeft(0);
        setIsFlipping(true);

        if (flipIntervalRef.current) {
          window.clearInterval(flipIntervalRef.current);
          flipIntervalRef.current = null;
        }

        // keep spinning until round_finished arrives
        flipIntervalRef.current = window.setInterval(() => {
          setFlipAngles((prev) => ({
            x: prev.x + 360,
            y: prev.y + 540,
            z: prev.z + 180,
          }));
        }, 250);
      };

      onRoundFinished = (d: unknown) => {
        if (wsDebugEnabled) console.log("[coinflip] round_finished", d);
        setTimeLeft(0);

        if (flipIntervalRef.current) {
          window.clearInterval(flipIntervalRef.current);
          flipIntervalRef.current = null;
        }

        if (resultTimeoutRef.current) {
          window.clearTimeout(resultTimeoutRef.current);
          resultTimeoutRef.current = null;
        }

        const winnerSide = extractWinnerSide(d);
        if (!winnerSide) {
          setIsFlipping(false);
          return;
        }

        setIsFlipping(false);
        setResult(winnerSide);

        resultTimeoutRef.current = window.setTimeout(() => {
          setTimerText("RESULT");

          // toast current user's win/lose from round_result.user_result_lists
          if (typeof d === "object" && d !== null && userId) {
            try {
              const payload = d as CoinflipRoundFinishedPayload;
              const lists = payload.round_result?.data?.user_result_lists;
              if (Array.isArray(lists)) {
                const me = lists.find(
                  (u) =>
                    typeof u.user_id === "number" &&
                    u.user_id === Number(userId),
                );
                if (me) {
                  if (me.status === "win") {
                    toast.success(
                      `You win ${me.winning_amount.toLocaleString()} MMKs`,
                    );
                  } else if (me.status === "lost") {
                    toast.error("You lost this round");
                  } else {
                    toast.message(me.status || "Round finished");
                  }
                }
              }
            } catch {
              // ignore parse errors
            }
          }

          refetchWalletBalance();
        }, 1300);

        setFlipAngles({ x: 0, y: 0, z: 0 });
      };

      onWaitNewRound = () => {
        if (wsDebugEnabled)
          console.log("[coinflip] wait_new_round", { roomId });
        setTimerText("WAITING FOR NEW ROUND");
        if (resultTimeoutRef.current) {
          window.clearTimeout(resultTimeoutRef.current);
          resultTimeoutRef.current = null;
        }
        if (flipIntervalRef.current) {
          window.clearInterval(flipIntervalRef.current);
          flipIntervalRef.current = null;
        }
        setIsFlipping(false);
        setTimeLeft(0);
        setRoundId(null);
        setTotals(null);
        setBets([]);
      };

      onUserLeft = (d: unknown) => {
        if (wsDebugEnabled) console.log("[coinflip] user_left", d);
      };

      onRoomFull = (d: unknown) => {
        if (typeof d !== "object" || d === null) return;
        if (wsDebugEnabled) console.log("[coinflip] room_full", d);
        const message = (d as { message?: unknown }).message;
        if (typeof message === "string") setRoomError(message);
      };

      socket.off("ws:connected", onWsConnected);
      socket.on("ws:connected", onWsConnected);

      socket.off("coinflip-game:room_joined", onRoomJoined);
      socket.on("coinflip-game:room_joined", onRoomJoined);

      socket.off("coinflip:round_started", onRoundStarted);
      socket.on("coinflip:round_started", onRoundStarted);

      socket.off("coinflip:current_round_state", onCurrentRoundState);
      socket.on("coinflip:current_round_state", onCurrentRoundState);

      socket.off("coinflip:round_ticked", onRoundTicked);
      socket.on("coinflip:round_ticked", onRoundTicked);

      socket.off("coinflip:countdown_restart", onCountdownRestart);
      socket.on("coinflip:countdown_restart", onCountdownRestart);

      socket.off("coinflip:bet_updated", onBetUpdated);
      socket.on("coinflip:bet_updated", onBetUpdated);

      socket.off("coinflip:round_locked", onRoundLocked);
      socket.on("coinflip:round_locked", onRoundLocked);

      socket.off("coinflip:start_flipping", onStartFlipping);
      socket.on("coinflip:start_flipping", onStartFlipping);

      socket.off("coinflip:round_finished", onRoundFinished);
      socket.on("coinflip:round_finished", onRoundFinished);

      socket.off("coinflip:wait_new_round", onWaitNewRound);
      socket.on("coinflip:wait_new_round", onWaitNewRound);

      socket.off("coinflip:user_left", onUserLeft);
      socket.on("coinflip:user_left", onUserLeft);

      socket.off("game:room_full", onRoomFull);
      socket.on("game:room_full", onRoomFull);
    };

    join();

    return () => {
      mounted = false;

      if (resultTimeoutRef.current) {
        window.clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = null;
      }

      if (flipIntervalRef.current) {
        window.clearInterval(flipIntervalRef.current);
        flipIntervalRef.current = null;
      }

      const socket = getSocket();
      if (!socket) return;

      leaveCoinflipGameRoom({
        roomId,
        user: { id: userIdNumber, name: userName },
      });

      if (emitJoin) socket.off("connect", emitJoin);
      if (onWsConnected) socket.off("ws:connected", onWsConnected);
      if (onRoomJoined) socket.off("coinflip-game:room_joined", onRoomJoined);
      if (onRoundStarted) socket.off("coinflip:round_started", onRoundStarted);
      if (onCurrentRoundState) {
        socket.off("coinflip:current_round_state", onCurrentRoundState);
      }
      if (onRoundTicked) socket.off("coinflip:round_ticked", onRoundTicked);
      if (onCountdownRestart) {
        socket.off("coinflip:countdown_restart", onCountdownRestart);
      }
      if (onBetUpdated) socket.off("coinflip:bet_updated", onBetUpdated);
      if (onRoundLocked) socket.off("coinflip:round_locked", onRoundLocked);
      if (onStartFlipping) {
        socket.off("coinflip:start_flipping", onStartFlipping);
      }
      if (onRoundFinished) {
        socket.off("coinflip:round_finished", onRoundFinished);
      }
      if (onWaitNewRound) {
        socket.off("coinflip:wait_new_round", onWaitNewRound);
      }
      if (onUserLeft) socket.off("coinflip:user_left", onUserLeft);
      if (onRoomFull) socket.off("game:room_full", onRoomFull);
      if (onWsConnect) socket.off("connect", onWsConnect);
      if (onWsDisconnect) socket.off("disconnect", onWsDisconnect);
      if (onWsConnectError) socket.off("connect_error", onWsConnectError);
      if (onWsReconnectAttempt)
        socket.io.off("reconnect_attempt", onWsReconnectAttempt);
      if (onWsReconnected) socket.io.off("reconnect", onWsReconnected);
    };
  }, [roomId, userId, userName, wsDebugEnabled, refetchWalletBalance, router]);

  const formattedTime = `0:${timeLeft.toString().padStart(2, "0")}`;

  const handlePlaceBet = async () => {
    if (!roundId) {
      toast.error("Round not started");
      return;
    }
    const numeric = Number(betAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast.error("Invalid bet amount");
      return;
    }
    // if (typeof minBetAmount === "number" && numeric < minBetAmount) {
    //   toast.error(`Minimum bet is ${minBetAmount}`);
    //   return;
    // }
    if (typeof maxBetAmount === "number" && numeric > maxBetAmount) {
      toast.error(`Maximum bet is ${maxBetAmount}`);
      return;
    }

    try {
      const res = await placeBet({
        roundId,
        bet_amount: numeric,
        bet_side: selectedSide === "head" ? "HEAD" : "TAIL",
      }).unwrap();

      const msg = res?.response?.message;
      if (typeof msg === "string" && msg) toast.success(msg);
      setBetAmount("");
      refetchWalletBalance();
    } catch (e) {
      const message = (e as { data?: { response?: { message?: unknown } } })
        ?.data?.response?.message;
      toast.error(
        typeof message === "string" ? message : "Failed to place bet",
      );
    }
  };

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full flex-col px-5 pt-0 pb-22 text-amber-100">
      <div className="flex items-center justify-start">
        <ArrowLeft size={18} onClick={() => router.back()} />
      </div>

      {roomError ? (
        <div className="rounded-2xl border border-amber-100/15 bg-black/70 px-4 py-3 text-sm text-amber-100">
          {roomError}
        </div>
      ) : null}
      {isWsReconnecting ? (
        <div className="mt-3 animate-pulse rounded-2xl border-2 border-red-500/60 bg-red-900/60 px-4 py-3 text-center text-sm font-bold text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
          <span className="animate-pulse">RECONNECTING TO THE GAME...</span>
        </div>
      ) : null}

      {minBetAmount != null && maxBetAmount != null && (
        <div className="mt-4 flex items-center justify-center gap-8 text-sm font-medium text-amber-200/90">
          <span className="bg-black/40 px-3 py-1 rounded-full border border-amber-100/20">
            Min: {minBetAmount} MMK
          </span>
          <span className="bg-black/40 px-3 py-1 rounded-full border border-amber-100/20">
            Max: {maxBetAmount} MMK
          </span>
        </div>
      )}
      <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.1em] text-amber-200/80">
        <span>
          {headsAmount} MMKs ({headsPercent}%)
        </span>
        <span>
          {tailsAmount} MMKs ({tailsPercent}%)
        </span>
      </div>

      <div className="my-2 h-2 w-full overflow-hidden rounded-full bg-[#120702]">
        <div className="relative h-full w-full">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#f9c86c] to-[#f7a531]"
            style={{ width: `${headsPercent}%` }}
          />
          <div
            className="absolute inset-y-0 bg-gradient-to-r from-[#f45d4c] to-[#ad1d1d]"
            style={{ left: `${headsPercent}%`, width: `${tailsPercent}%` }}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-col items-center space-y-2 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-200/70">
          {timerText ? timerText : "Flipping will start in"}
        </p>

        <p className="min-h-[32px] text-2xl font-light text-amber-50">
          {timerText === "RESULT"
            ? result === "head"
              ? "HEAD"
              : "TAIL"
            : formattedTime === "0:00"
              ? "\u00A0"
              : formattedTime}
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center space-y-6">
        <div
          className="relative h-48 w-48 flex items-center justify-center"
          style={{ perspective: "1200px" }}
        >
          <motion.div
            className="relative h-40 w-40"
            style={{ transformStyle: "preserve-3d" }}
            animate={{
              rotateX: isFlipping ? flipAngles.x : 0,
              rotateY: isFlipping ? flipAngles.y : result === "head" ? 0 : 180,
              rotateZ: isFlipping ? flipAngles.z : 0,
            }}
            transition={{ duration: 1.5, ease: "linear" }}
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full"
                style={{
                  transform: `translateZ(${i - 5}px)`,
                  background:
                    "repeating-linear-gradient(90deg,#9b6a12 0 3px,#f5d27a 3px 6px)",
                  opacity: 0.95,
                }}
              />
            ))}

            <div
              className="absolute inset-0 rounded-full flex flex-col items-center justify-center overflow-hidden"
              style={{
                transform: "translateZ(6px)",
                backfaceVisibility: "hidden",
                background:
                  "radial-gradient(circle at 30% 25%, #fff6d6 0%, #f4d68b 40%, #c8871a 78%, #6b3e05 100%)",
                boxShadow:
                  "0 24px 55px rgba(0,0,0,.65), inset 0 4px 10px rgba(255,255,255,.65), inset 0 -10px 18px rgba(0,0,0,.35)",
              }}
            >
              <div className="absolute inset-0">
                <Image
                  src="/images/coin-flip-heads.png"
                  alt="Heads"
                  fill
                  sizes="160px"
                  className="object-cover"
                  priority
                />
              </div>

              <div
                className="absolute inset-3 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 180deg, rgba(255,255,255,.18), rgba(0,0,0,.0), rgba(255,255,255,.12), rgba(0,0,0,.0), rgba(255,255,255,.18))",
                  boxShadow:
                    "inset 0 0 0 2px rgba(255,244,214,.35), inset 0 0 0 10px rgba(0,0,0,.12)",
                }}
              />

              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "linear-gradient(125deg, rgba(255,255,255,0) 25%, rgba(255,255,255,.35) 45%, rgba(255,255,255,0) 65%)",
                  mixBlendMode: "screen",
                  opacity: 0.55,
                }}
                animate={isFlipping ? { rotateZ: 360 } : { rotateZ: 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />

              <div className="relative flex flex-col items-center justify-center" />
            </div>

            <div
              className="absolute inset-0 rounded-full flex flex-col items-center justify-center overflow-hidden"
              style={{
                transform: "rotateY(180deg) translateZ(6px)",
                backfaceVisibility: "hidden",
                background:
                  "radial-gradient(circle at 30% 25%, #ffeecb 0%, #f1c56a 42%, #b36b12 80%, #4a2503 100%)",
                boxShadow:
                  "0 24px 55px rgba(0,0,0,.65), inset 0 4px 10px rgba(255,255,255,.55), inset 0 -10px 18px rgba(0,0,0,.35)",
              }}
            >
              <div className="absolute inset-0">
                <Image
                  src="/images/coin-flip-tails.png"
                  alt="Tails"
                  fill
                  sizes="160px"
                  className="object-cover"
                  priority
                />
              </div>

              <div
                className="absolute inset-3 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 180deg, rgba(255,255,255,.14), rgba(0,0,0,.0), rgba(255,255,255,.10), rgba(0,0,0,.0), rgba(255,255,255,.14))",
                  boxShadow:
                    "inset 0 0 0 2px rgba(255,244,214,.30), inset 0 0 0 10px rgba(0,0,0,.14)",
                }}
              />

              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "linear-gradient(125deg, rgba(255,255,255,0) 25%, rgba(255,255,255,.28) 45%, rgba(255,255,255,0) 65%)",
                  mixBlendMode: "screen",
                  opacity: 0.5,
                }}
                animate={isFlipping ? { rotateZ: -360 } : { rotateZ: 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />

              <div className="relative flex flex-col items-center justify-center" />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-amber-100/10 bg-black/70 p-4">
        <p className="text-center text-xs uppercase tracking-[0.4em] text-amber-200/65">
          Choose & Bet
        </p>

        <div className="mt-4 flex gap-3">
          {["head", "tail"].map((side) => (
            <button
              key={side}
              onClick={() => setSelectedSide(side as "head" | "tail")}
              className={`w-full rounded-full py-2 uppercase tracking-[0.3em] text-sm font-semibold ${
                selectedSide === side
                  ? "bg-gradient-to-r from-[#f9c86c] to-[#f5a623] text-[#2f0503]"
                  : "bg-[#140804] text-amber-200/70"
              }`}
            >
              {side}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <Input
            placeholder={isWsReconnecting ? "Reconnecting..." : "Bet Amount"}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={betAmount ?? ""}
            onChange={(e) => {
              if (isWsReconnecting) return;
              const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
              setBetAmount(digitsOnly);
            }}
            disabled={isWsReconnecting}
            className={`rounded-full bg-[#1a130c] ${isWsReconnecting ? "opacity-60 cursor-not-allowed" : ""}`}
          />
          <Button
            onClick={handlePlaceBet}
            disabled={isPlacingBet || isWsReconnecting}
            className="rounded-full bg-gradient-to-r from-[#f9c86c] to-[#f5a623] text-[#3b0500] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Coins size={16} /> Bet
          </Button>
        </div>
      </div>
      <div className="mt-8 rounded-3xl bg-black/70 p-1 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 rounded-[28px] border border-amber-100/25 bg-black/60 p-0.5">
            <TabsTrigger
              value="bets"
              className="rounded-[22px] border border-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.4em] text-amber-300 transition data-[state=active]:border-amber-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#f9c86c]/35 data-[state=active]:to-[#f5a623]/25 data-[state=active]:text-[#2f0503]"
            >
              Bet List
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="rounded-[22px] border border-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.4em] text-amber-300 transition data-[state=active]:border-amber-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#f9c86c]/35 data-[state=active]:to-[#f5a623]/25 data-[state=active]:text-[#2f0503]"
            >
              Live Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="bets"
            className="mt-4 rounded-3xl border border-amber-100/15 bg-[#090703] p-4"
          >
            <div className="rounded-2xl">
              <div className="grid grid-cols-4 gap-3 border-b border-amber-100/5 px-4 py-3 text-xs uppercase tracking-[0.2em] text-amber-200/60">
                <span>ID</span>
                <span>Player</span>
                <span>Side</span>
                <span className="text-right">Bet</span>
              </div>
              <div className="max-h-60 divide-y divide-amber-100/5 overflow-y-auto pr-1">
                {bets.map((bet, idx) => (
                  <div
                    key={`${bet.user_id}-${idx}`}
                    className="grid grid-cols-4 gap-3 px-4 py-3 text-sm text-amber-100"
                  >
                    <span>{idx + 1}</span>
                    <span>{bet.user_name}</span>
                    <span>{bet.bet_side}</span>
                    <span className="text-right">{bet.bet_amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="chat"
            className="mt-4 rounded-3xl border border-amber-100/15 bg-[#090703] p-4"
          >
            <div className="max-h-60 space-y-3 overflow-y-auto pr-1">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="w-full rounded-2xl border border-amber-100/10 bg-[#0d0b08] px-4 py-3 text-sm"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-200/60">
                    {msg.author}
                  </p>
                  <p className="text-amber-50">{msg.text}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
