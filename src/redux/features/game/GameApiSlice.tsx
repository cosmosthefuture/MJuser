import { appApi } from "@/redux/services/appApi";

export type Game = {
  id: number;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GamesResponse = {
  response: { status: string; message: string };
  data: Game[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
};

export const gameApiSlice = appApi.injectEndpoints({
  endpoints: (build) => ({
    getGames: build.query<GamesResponse, { page: number; per_page: number }>({
      query: ({ page, per_page }) =>
        `games/all?page=${page}&per_page=${per_page}`,
      providesTags: ["games"],
    }),
  }),
});

export const { useGetGamesQuery } = gameApiSlice;
