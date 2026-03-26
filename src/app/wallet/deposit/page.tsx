import { Suspense } from "react";
import DepositClient from "./DepositClient";

export default function DepositPage() {
  return (
    <Suspense>
      <DepositClient />
    </Suspense>
  );
}
