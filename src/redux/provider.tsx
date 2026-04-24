"use client";

import { Provider } from "react-redux";
import { store } from "./store";
import { useEffect } from "react";
import { useAppSelector } from "./hook";
import {
  connectSocket,
  disconnectSocket,
  emitWsRefresh,
  updateSocketAuth,
} from "@/lib/wsClient";
import { fetchWsJwtToken } from "@/lib/wsTokenApi";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <WsLifecycle />
      {children}
    </Provider>
  );
}

function WsLifecycle() {
  const token = useAppSelector((s) => s.auth.token);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }

    let mounted = true;

    const start = async () => {
      const jwtToken = await fetchWsJwtToken();
      if (!mounted) return;

      const socket = connectSocket({ token: jwtToken });

      const onRefreshRequired = async () => {
        const refreshed = await fetchWsJwtToken();
        if (!mounted) return;
        updateSocketAuth({ token: refreshed });
        emitWsRefresh({ token: refreshed });
      };

      const onRefreshFailed = () => {
        disconnectSocket();
      };

      socket.off("ws:refresh_required");
      socket.on("ws:refresh_required", onRefreshRequired);

      socket.off("ws:refresh_failed");
      socket.on("ws:refresh_failed", onRefreshFailed);
    };

    start();

    return () => {
      mounted = false;
    };
  }, [token]);

  return null;
}
