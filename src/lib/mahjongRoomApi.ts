import http from "@/redux/http";

type JoinMahjongRoomResponse = {
  response: { status: string; message: string };
  data: {
    token: string;
  };
};

export async function fetchMahjongJoinToken(roomId: number) {
  const res = await http.http.post<JoinMahjongRoomResponse>(
    `/mah-jong-game-rooms/${roomId}/join`,
  );

  const joinToken = res.data?.data?.token;
  if (!joinToken) {
    throw new Error("Join token not found in response");
  }

  return joinToken;
}
