import { Suspense } from "react";
import GameRoomsClient from "./GameRoomsClient";

export default function GameRoomsPage() {
  return (
    <Suspense>
      <GameRoomsClient />
    </Suspense>
  );
}
