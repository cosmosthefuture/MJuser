"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  NotificationItem,
  useCancelMoneyTransferMutation,
  useConfirmMoneyTransferMutation,
  useGetNotificationsQuery,
} from "@/redux/features/notifications/NotificationsApiSlice";

function NotificationCard({
  item,
  onConfirm,
  onCancel,
  isBusy,
}: {
  item: NotificationItem;
  onConfirm: () => void;
  onCancel: () => void;
  isBusy: boolean;
}) {
  const transferStatus = item?.data?.status;
  const showActions =
    item.type === "money_transfer" &&
    !item.is_read &&
    transferStatus !== "accepted";

  return (
    <div className="rounded-3xl border border-amber-100/10 bg-black/60 px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <div className="flex items-start gap-4">
        <div className="mt-1 h-3 w-3 rounded-full bg-amber-200/90" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-amber-200">{item.title}</p>
          <p className="mt-3 text-sm text-amber-100/80">{item.message}</p>

          {showActions ? (
            <div className="mt-5 flex items-center justify-center gap-4">
              <Button
                type="button"
                onClick={onConfirm}
                disabled={isBusy}
                className="h-10 w-28 rounded-full bg-gradient-to-r from-[#f9c86c] to-[#f5a623] text-[#3c0505] hover:brightness-110 disabled:opacity-60"
              >
                Confirm
              </Button>
              <Button
                type="button"
                onClick={onCancel}
                disabled={isBusy}
                className="h-10 w-28 rounded-full bg-[#cf1c1c] text-white hover:bg-[#e02121] disabled:opacity-60"
              >
                Cancel
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsClient() {
  const router = useRouter();

  const { data, isLoading, refetch } = useGetNotificationsQuery({
    page: 1,
    per_page: 10,
  });

  const [confirmMoneyTransfer, { isLoading: isConfirming }] =
    useConfirmMoneyTransferMutation();
  const [cancelMoneyTransfer, { isLoading: isCanceling }] =
    useCancelMoneyTransferMutation();

  const [busyId, setBusyId] = useState<number | null>(null);

  const items = useMemo(() => data?.data ?? [], [data?.data]);

  const isBusy = (notificationId: number) =>
    busyId === notificationId || isConfirming || isCanceling;

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full flex-col px-5 py-2 text-amber-100 pb-14">
      <div className="mt-1 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeft size={22} onClick={() => router.back()} />
            <h1 className="text-xl font-semibold">Notifications</h1>
          </div>
        </div>
      </div>

      <div className="mt-6 w-full space-y-5">
        {isLoading ? (
          <div className="rounded-3xl border border-amber-100/10 bg-black/60 px-5 py-6 text-sm text-amber-200/80">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-amber-100/10 bg-black/60 px-5 py-6 text-sm text-amber-200/80">
            No notifications
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="space-y-5">
              <NotificationCard
                item={item}
                isBusy={isBusy(item.id)}
                onConfirm={async () => {
                  const recordId = item?.data?.id;
                  if (!recordId) return toast.error("Missing record_id");

                  setBusyId(item.id);
                  try {
                    await confirmMoneyTransfer({
                      record_id: recordId,
                      notification_id: item.id,
                    }).unwrap();
                    toast.success("Confirmed");
                    await refetch();
                  } catch (e) {
                    const msg = (
                      e as { data?: { response?: { message?: string } } }
                    )?.data?.response?.message;
                    toast.error(msg || "Confirm failed");
                  } finally {
                    setBusyId(null);
                  }
                }}
                onCancel={async () => {
                  const recordId = item?.data?.id;
                  if (!recordId) return toast.error("Missing record_id");

                  setBusyId(item.id);
                  try {
                    await cancelMoneyTransfer({
                      record_id: recordId,
                      notification_id: item.id,
                    }).unwrap();
                    toast.success("Canceled");
                    await refetch();
                  } catch (e) {
                    const msg = (
                      e as { data?: { response?: { message?: string } } }
                    )?.data?.response?.message;
                    toast.error(msg || "Cancel failed");
                  } finally {
                    setBusyId(null);
                  }
                }}
              />

              <div className="h-px w-full bg-amber-200/20" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
