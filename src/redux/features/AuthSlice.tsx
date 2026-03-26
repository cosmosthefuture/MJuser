import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  token: string | null;
  name: string | null;
  email: string | null;
  id: string | null;
  phone_number: string | null;
  status: string | null;
  profile_status: string | null;
  balance: string | null;
}

const initialState: AuthState = {
  token: null,
  name: null,
  email: null,
  id: null,
  phone_number: null,
  status: null,
  profile_status: null,
  balance: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    clearToken: (state) => {
      state.token = null;
      state.name = null;
      state.email = null;
      state.id = null;
      state.phone_number = null;
      state.status = null;
      state.profile_status = null;
      state.balance = null;
    },
    setUserData: (
      state,
      action: PayloadAction<{
        id: string;
        name: string;
        email: string;
        phone_number: string;
        status: string;
        profile_status: string | null;
        balance?: string | null;
      }>
    ) => {
      state.id = action.payload.id;
      state.name = action.payload.name;
      state.email = action.payload.email;
      state.phone_number = action.payload.phone_number;
      state.status = action.payload.status;
      state.profile_status = action.payload.profile_status;
      state.balance = action.payload.balance ?? null;
    },
    clearUserData: (state) => {
      state.id = null;
      state.name = null;
      state.email = null;
      state.status = null;
      state.profile_status = null;
      state.balance = null;
    },
    setBalance: (state, action: PayloadAction<string>) => {
      state.balance = action.payload;
    },
  },
});

export const { setToken, clearToken, setUserData, clearUserData, setBalance } =
  authSlice.actions;

export default authSlice.reducer;
