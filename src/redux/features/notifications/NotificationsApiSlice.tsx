import { appApi } from "@/redux/services/appApi";

export type NotificationItem = {
  id: number;
  recipient_id: number;
  recipient_type: string;
  type: string;
  title: string;
  message: string;
  data: {
    id: number;
    sender_id: number;
    recipient_id: number;
    amount: number;
    status: string;
    created_at: string;
    updated_at: string;
    sender?: { id: number; name: string };
    recipient?: { id: number; name: string };
  };
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

type NotificationsResponse = {
  response: { status: string; message: string };
  data: NotificationItem[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
};

export const notificationsApiSlice = appApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<
      NotificationsResponse,
      { page: number; per_page: number }
    >({
      query: ({ page, per_page }) =>
        `notifications/all?page=${page}&per_page=${per_page}`,
      providesTags: () => [{ type: "notificationsApi" }],
    }),

    confirmMoneyTransfer: build.mutation<
      { response: { status: string; message: string } },
      { record_id: number; notification_id: number }
    >({
      query: (body) => ({
        url: "money-transfer/confirm",
        method: "POST",
        body: {
          record_id: body.record_id,
          notification_id: body.notification_id,
        },
      }),
      invalidatesTags: [{ type: "notificationsApi" }],
    }),

    cancelMoneyTransfer: build.mutation<
      { response: { status: string; message: string } },
      { record_id: number; notification_id: number }
    >({
      query: (body) => ({
        url: "money-transfer/cancel",
        method: "POST",
        body: {
          record_id: body.record_id,
          notification_id: body.notification_id,
        },
      }),
      invalidatesTags: [{ type: "notificationsApi" }],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useConfirmMoneyTransferMutation,
  useCancelMoneyTransferMutation,
} = notificationsApiSlice;
