import { Suspense } from "react";
import MahjongClient from "./MahjongClient";

export default function MahjongPage() {
  return (
    <Suspense>
      <MahjongClient />
    </Suspense>
  );
}
