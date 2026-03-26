import http from "@/redux/http";

type RawEnterCoinflipRoomResponse = {
  response: { status: "success" | "error"; message: string };
  data: { room_id: number } | [];
};

export type EnterCoinflipRoomResult =
  | { ok: true; roomId: number; message: string }
  | { ok: false; message: string };

export async function enterCoinflipRoom(
  roomId: number,
): Promise<EnterCoinflipRoomResult> {
  const res = await http.http.post<RawEnterCoinflipRoomResponse>(
    `/game-rooms/${roomId}/coin-flip/enter`,
  );
  const body = res.data;

  if (
    body?.response?.status === "success" &&
    body.data &&
    !Array.isArray(body.data) &&
    typeof body.data.room_id === "number"
  ) {
    return {
      ok: true,
      roomId: body.data.room_id,
      message: body.response.message,
    };
  }

  return {
    ok: false,
    message: body?.response?.message ?? "Something went wrong!",
  };
}
