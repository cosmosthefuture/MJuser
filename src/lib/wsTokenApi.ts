import http from "@/redux/http";

type GenerateWsTokenResponse = {
  response: { status: string; message: string };
  data: {
    ws_token: string;
    expires_in_sec: number;
  };
};

export async function fetchWsJwtToken() {
  const res = await http.http.post<GenerateWsTokenResponse>(
    "/web-socket/token/generate"
  );

  const wsToken = res.data?.data?.ws_token;

  if (!wsToken) {
    throw new Error("WS token not found in response");
  }

  return wsToken;
}
