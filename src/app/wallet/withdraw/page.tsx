import { Suspense } from "react";
import WithdrawClient from "./WithdrawClient";

export default function WithdrawPage() {
  return (
    <Suspense>
      <WithdrawClient />
    </Suspense>
  );
}
