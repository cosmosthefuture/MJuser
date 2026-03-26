"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import Link from "next/link";
import { Gamepad2, Users, Clock, ArrowLeft } from "lucide-react";
import { useGetGameRoomsQuery } from "@/redux/features/game/GameRoomApiSlice";
import { useEffect, useState } from "react";
import Image from "next/image";
import LoadingSpinner from "@/components/loadingSpinner";
import { getSocket } from "@/lib/wsClient";

type RoomUserCountItem = {
  room_id: number;
  user_count: number;
};

export default function GameRoomsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get("game_id");
  const { token } = useSelector((state: RootState) => state.auth);
  const [isClient, setIsClient] = useState(false);
  const [roomUserCounts, setRoomUserCounts] = useState<Record<number, number>>(
    {},
  );

  const {
    data: roomsData,
    isLoading,
    error,
  } = useGetGameRoomsQuery({
    page: 1,
    per_page: 10,
    game_id: gameId ? parseInt(gameId) : 0,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    if (!socket) return;

    const onList = (data: unknown) => {
      if (!Array.isArray(data)) return;
      setRoomUserCounts((prev) => {
        const next = { ...prev };
        for (const item of data as RoomUserCountItem[]) {
          if (
            item &&
            typeof item.room_id === "number" &&
            typeof item.user_count === "number"
          ) {
            next[item.room_id] = item.user_count;
          }
        }
        return next;
      });
    };

    const onUpdated = (data: unknown) => {
      if (typeof data !== "object" || data === null) return;
      const payload = data as Partial<RoomUserCountItem>;
      if (typeof payload.room_id !== "number") return;
      if (typeof payload.user_count !== "number") return;
      const roomId = payload.room_id;
      const userCount = payload.user_count;
      setRoomUserCounts((prev) => ({
        ...prev,
        [roomId]: userCount,
      }));
    };

    socket.off("room:list_with_user_count", onList);
    socket.on("room:list_with_user_count", onList);

    socket.off("room:user_count_updated", onUpdated);
    socket.on("room:user_count_updated", onUpdated);

    return () => {
      socket.off("room:list_with_user_count", onList);
      socket.off("room:user_count_updated", onUpdated);
    };
  }, [token]);

  if (!isClient) {
    return null;
  }

  if (!gameId) {
    return (
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full flex-col items-center px-5 py-8 text-amber-100">
        <div className="flex w-full items-center justify-start">
          <ArrowLeft size={18} onClick={() => router.back()} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-amber-200">
            Game Not Found
          </h1>
          <p className="mt-4 text-amber-100">
            Please select a game from the home page.
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full flex-col items-center px-5 py-8 text-amber-100">
        <div className="flex w-full items-center justify-start">
          <ArrowLeft size={18} onClick={() => router.back()} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-amber-200">
            Login Required
          </h1>
          <p className="mt-4 text-amber-100">Please login to play games.</p>
        </div>
      </div>
    );
  }

  const rooms = roomsData?.data?.filter((room) => room.status === "open") || [];
  const isCoinflipGame = gameId === "2";

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full flex-col px-5 py-2 text-amber-100">
      <div className="flex items-center justify-start">
        <ArrowLeft size={18} onClick={() => router.back()} />
      </div>
      {isLoading && <LoadingSpinner />}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-400">
            Failed to load rooms. Please try again.
          </p>
        </div>
      )}

      {!isLoading && !error && rooms.length > 0 && (
        <>
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-amber-200">
              {rooms[0]?.game?.name || "Game Rooms"}
            </h1>
          </div>

          <section className="mt-6 grid grid-cols-2 gap-4">
            {rooms.map((room) => (
              <article
                key={room.id}
                className="flex flex-col items-center rounded-[32px] border border-[#EA2121] bg-[#14100b] p-4 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
              >
                <header className="mb-3 text-base font-semibold tracking-wide text-amber-100">
                  {room.room_name}
                </header>

                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-amber-100/25 to-transparent ring-1 ring-amber-100/20">
                  <div className="h-20 w-20 rounded-full bg-amber-200/20 flex items-center justify-center">
                    {isCoinflipGame ? (
                      <Image
                        src="/images/coin_flip_one.webp"
                        alt={room.room_name}
                        width={80}
                        height={80}
                        className="h-16 w-16 object-contain"
                      />
                    ) : (
                      <Gamepad2 size={32} className="text-amber-300" />
                    )}
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-amber-100">
                  <div className="flex items-center pl-10 gap-2 text-sm text-amber-100">
                    <Clock size={14} className="text-amber-300" />
                    <span>{room.game_rule?.time_per_round}s</span>
                  </div>
                  <div className="flex items-center pl-10 gap-2 text-sm text-amber-100">
                    <Users size={16} />
                    <span>{roomUserCounts[room.id] ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-amber-100/90">
                    <span>Min Bet: {room.game_rule?.min_bet_amount}</span>
                    <span>Max Bet: {room.game_rule?.max_bet_amount}</span>
                  </div>
                </div>
                <div className="mt-4 flex justify-center">
                  <Link
                    href={
                      isCoinflipGame ? `/coin-flip-game?game_room_id=${room.id}` : "#"
                    }
                    className={`inline-flex items-center gap-2 rounded-full px-6 py-2 text-[#3b0500] ${
                      isCoinflipGame
                        ? "bg-amber-100/90 hover:bg-amber-100"
                        : "cursor-not-allowed bg-amber-100/50"
                    }`}
                    aria-disabled={!isCoinflipGame}
                    onClick={(e) => {
                      if (isCoinflipGame) return;
                      e.preventDefault();
                    }}
                  >
                    <Gamepad2 size={16} className="text-[#3b0500]" />
                    {isCoinflipGame ? "Play" : "Unavailable"}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
