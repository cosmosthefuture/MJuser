import { Suspense } from "react";
import TransferClient from "./TransferClient";

export default function TransferPage() {
  return (
    <Suspense>
      <TransferClient />
    </Suspense>
  );
}
