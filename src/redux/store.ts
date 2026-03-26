import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query/react";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { useDispatch } from "react-redux";
import CounterReducer from "./features/CounterSlice";
import AuthReducer from "./features/AuthSlice";
import samplePostsReducer from "./features/SamplePostsSlice";
import trackingTokenReducer from "./features/TrackingTokenSlice";
// Import the API service
import { appApi } from "./services/appApi";

const rootReducer = combineReducers({
  // Add the API service reducer
  [appApi.reducerPath]: appApi.reducer,
  samplePosts: samplePostsReducer,
  counter: CounterReducer,
  auth: AuthReducer,
  trackingToken: trackingTokenReducer,
});

// Configure persist options
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "trackingToken"], // List of reducers to persist
  blacklist: [appApi.reducerPath], // Don't persist API cache
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  devTools: true, //process.env.NODE_ENV !== "production",
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
        ignoredActionPaths: [
          "meta.arg",
          "payload.register",
          "meta.baseQueryMeta",
        ],
        ignoredPaths: ["auth.someNonSerializableField"],
      },
    })
      // Add the api middleware to enable caching, invalidation, polling, etc.
      .concat(appApi.middleware),
});

export const persistor = persistStore(store);

// Enable the RTK-Query refetchOnFocus/refetchOnReconnect features
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
