import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  tracking_token: string | null;
}

const initialState: AuthState = {
  tracking_token: null,
};

const authSlice = createSlice({
  name: "trackingToken",
  initialState,
  reducers: {
    setTrackingToken: (state, action: PayloadAction<string>) => {
      state.tracking_token = action.payload;
    },
    clearTrackingToken: (state) => {
      state.tracking_token = null;
    },
  },
});

export const { setTrackingToken, clearTrackingToken } = authSlice.actions;

export default authSlice.reducer;
