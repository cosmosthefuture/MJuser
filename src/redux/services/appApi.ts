// src/redux/api/appApi.ts

import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { RootState } from "@/redux/store";
import { clearToken } from "../features/AuthSlice";
import { removeCookie } from "@/utils/cookie";

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    headers.set("Accept", "application/json");
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    api.dispatch(clearToken());
    // Redirect to sign-in page
    await removeCookie("userInfo");
    window.location.href = "/login";
  }

  if (result.data) {
    const data = result.data as { message?: string };
    if (data.message === "Unauthenticated.") {
      console.log("Unauthenticated");
      await removeCookie("userInfo");
      api.dispatch(clearToken());
      // Redirect to sign-in page
      window.location.href = "/login";
    }
  }

  return result;
};

export const appApi = createApi({
  reducerPath: "appApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "paymentApi",
    "notificationsApi",
    "games",
    "gameRooms",
    "walletBalance",
  ],
  endpoints: () => ({}), // 👈 leave empty for now
});

// Export hooks for usage in functional components
