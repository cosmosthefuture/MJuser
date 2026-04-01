import { Suspense } from "react";
import GameRulesClient from "./GameRulesClient";

export default function GameRulesPage() {
  return (
    <Suspense>
      <GameRulesClient />
    </Suspense>
  );
}
