import { Suspense } from "react";
import PaymentListsClient from "./PaymentListsClient";

export default function PaymentListsPage() {
  return (
    <Suspense>
      <PaymentListsClient />
    </Suspense>
  );
}
