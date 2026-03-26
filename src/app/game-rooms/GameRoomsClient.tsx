"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import LobbyTableCard from "@/components/lobby/LobbyTableCard";
import { getGamePresentation } from "@/components/lobby/lobbyTheme";
import LoadingSpinner from "@/components/loadingSpinner";
import { getSocket } from "@/lib/wsClient";
import { useGetGameRoomsQuery } from "@/redux/features/game/GameRoomApiSlice";
import { RootState } from "@/redux/store";

type RoomUserCountItem = {
  room_id: number;
  user_count: number;
};

function LobbyNotice({
  ctaHref,
  ctaLabel,
  description,
  title,
}: {
  ctaHref?: string;
  ctaLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <div className="mt-8 rounded-[34px] border border-[#d9bc84] bg-[#f8edd7]/95 p-3 shadow-[0_24px_60px_rgba(112,69,20,0.16)]">
      <div className="rounded-[28px] border border-[#ecd8b0] bg-[#fff8ea]/92 p-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#af7739]">
          Lobby Notice
        </p>
        <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.03em] text-[#4f2709]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#7c5128]">{description}</p>

        {ctaHref && ctaLabel && (
          <Link
            href={ctaHref}
            className="mt-6 inline-flex rounded-full bg-[#9b2c35] px-5 py-3 text-sm font-semibold text-[#fff8e4] shadow-[0_18px_34px_rgba(100,33,21,0.22)] transition hover:brightness-105"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

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

      setRoomUserCounts((prev) => ({
        ...prev,
        [payload.room_id as number]: payload.user_count as number,
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

  const rooms = roomsData?.data?.filter((room) => room.status === "open") || [];
  const activeGame = rooms[0]?.game;
  const presentation = activeGame
    ? getGamePresentation(activeGame.id, activeGame.name)
    : getGamePresentation(Number(gameId || 0), "Live Table");
  const isCoinflipGame = gameId === "2";

  return (
    <div className="relative z-10 mx-auto flex min-h-full w-full flex-1 flex-col px-4 pb-28 pt-2 text-[#4f2809]">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8bb82] bg-[#f7ebd4]/95 text-[#75471e] transition hover:bg-[#fff5e2]"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="rounded-full border border-[#d8bb82] bg-[#f8edd5]/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a87438]">
          {rooms.length} Open Rooms
        </div>
      </div>

      {isLoading && <LoadingSpinner />}

      {!gameId && (
        <LobbyNotice
          ctaHref="/"
          ctaLabel="Back To Lobby"
          description="Choose a game from the lobby first, then the room list will open with live tables."
          title="Game Not Found"
        />
      )}

      {gameId && !token && (
        <LobbyNotice
          ctaHref={`/login?redirectUrl=${encodeURIComponent(`/game-rooms?game_id=${gameId}`)}`}
          ctaLabel="Login To Continue"
          description="This lobby only opens for signed-in players so we can sync live room counts and wallet balance."
          title="Login Required"
        />
      )}

      {gameId && token && (
        <>
          <div className="mt-5 rounded-[34px] border border-[#d8bb82] bg-[#f8edd7]/95 p-3 shadow-[0_24px_60px_rgba(112,69,20,0.16)]">
            <div className="rounded-[28px] border border-[#ecd8b0] bg-[#fff8ea]/92 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#af7739]">
                {presentation.eyebrow}
              </p>
              <h1 className="mt-3 text-[2.25rem] font-semibold leading-none tracking-[-0.04em] text-[#4f2709]">
                {activeGame?.name || "Game Rooms"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#7c5128]">
                Pick an open table, check the live player count, and move
                directly into the next round.
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-[#9b2c35]">
              Failed to load rooms. Please try again.
            </p>
          )}

          {!isLoading && !error && rooms.length === 0 && (
            <LobbyNotice
              ctaHref="/"
              ctaLabel="Explore Other Games"
              description="There are no open tables for this game right now. Check back later or return to the main lobby."
              title="No Open Rooms"
            />
          )}

          {!isLoading && !error && rooms.length > 0 && (
            <section className="mt-5 grid gap-4">
              {rooms.map((room, index) => {
                const playerCount = roomUserCounts[room.id] ?? 0;
                const userLimit = room.game_rule?.user_limit ?? 0;
                const playHref = isCoinflipGame
                  ? `/coin-flip-game?game_room_id=${room.id}`
                  : undefined;

                return (
                  <LobbyTableCard
                    key={room.id}
                    actionLabel={playHref ? "Join Room" : "Unavailable"}
                    badge={playHref ? "Open" : "Soon"}
                    disabled={!playHref}
                    eyebrow={room.room_code || `Room ${room.id}`}
                    href={playHref}
                    imageAlt={room.room_name}
                    imageSrc={presentation.imageSrc}
                    stats={[
                      {
                        label: "Round",
                        value: `${room.game_rule?.time_per_round ?? 0}s`,
                      },
                      {
                        label: "Players",
                        value: userLimit ? `${playerCount}/${userLimit}` : `${playerCount}`,
                      },
                      {
                        label: "Bet",
                        value: `${room.game_rule?.min_bet_amount ?? 0}-${room.game_rule?.max_bet_amount ?? 0}`,
                      },
                    ]}
                    subtitle={`Enter ${room.room_name} and settle into the next live ${activeGame?.name?.toLowerCase() || "game"} round.`}
                    themeIndex={index}
                    title={room.room_name}
                  />
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
