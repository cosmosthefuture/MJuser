import { Suspense } from "react";
import CoinFlipGameClient from "./CoinFlipGameClient";

export default function CoinFlipGamePage() {
  return (
    <Suspense>
      <CoinFlipGameClient />
    </Suspense>
  );
}
