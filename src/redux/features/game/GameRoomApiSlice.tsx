import { appApi } from "@/redux/services/appApi";
import { setBalance } from "@/redux/features/AuthSlice";

export type GameRoom = {
  id: number;
  game_rule_id: number;
  game_id: number;
  room_name: string;
  room_code: string;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  game: {
    id: number;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
  game_rule: {
    id: number;
    rule_name: string;
    max_bet_amount: number;
    min_bet_amount: number;
    time_per_round: number;
    user_limit: number;
    status: string;
    game_id: number;
    created_by: number;
    updated_by: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
};

export type PlaceCoinflipBetResponse = {
  response: { status: string; message: string };
  data: [];
};

export type GameRoomsResponse = {
  response: { status: string; message: string };
  data: GameRoom[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
};

export type GameRoomDetailResponse = {
  response: { status: string; message: string };
  data: GameRoom;
};

export type WalletBalanceResponse = {
  response: { status: string; message: string };
  data: { "wallet-balance": string };
};

export const gameRoomApiSlice = appApi.injectEndpoints({
  endpoints: (build) => ({
    getGameRooms: build.query<
      GameRoomsResponse,
      { page: number; per_page: number; game_id: number }
    >({
      query: ({ page, per_page, game_id }) =>
        `game-rooms/all?page=${page}&per_page=${per_page}&game_id=${game_id}`,
      providesTags: ["gameRooms"],
    }),
    placeCoinflipBet: build.mutation<
      PlaceCoinflipBetResponse,
      { roundId: number; bet_amount: number; bet_side: "HEAD" | "TAIL" }
    >({
      query: ({ roundId, bet_amount, bet_side }) => ({
        url: `game-rounds/${roundId}/coin-flip/place-bet`,
        method: "POST",
        body: { bet_amount, bet_side },
      }),
    }),
    getGameRoomById: build.query<GameRoomDetailResponse, number>({
      query: (id) => `game-rooms/${id}`,
    }),
    getWalletBalance: build.query<WalletBalanceResponse, void>({
      query: () => "wallet-balance",
      providesTags: ["walletBalance"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const balance = data?.data?.["wallet-balance"];
          if (balance != null) {
            dispatch(setBalance(balance));
          }
        } catch {
          // ignore, handled by callers
        }
      },
    }),
  }),
});

export const {
  useGetGameRoomsQuery,
  usePlaceCoinflipBetMutation,
  useGetGameRoomByIdQuery,
  useGetWalletBalanceQuery,
} = gameRoomApiSlice;
