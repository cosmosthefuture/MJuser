import { Suspense } from "react";
import NotificationsClient from "./NotificationsClient";

export default function NotificationsPage() {
  return (
    <Suspense>
      <NotificationsClient />
    </Suspense>
  );
}
