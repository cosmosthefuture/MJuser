import { appApi } from "@/redux/services/appApi";

type PaymentMethod = {
  id: number;
  type: string;
  account_username: string;
  phone_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type PaymentMethodsResponse = {
  response: { status: string; message: string };
  data: PaymentMethod[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
};

type FindUserByPhoneResponse = {
  response: { status: string; message: string };
  data: {
    id: number;
    name: string;
    phone_number: string;
  };
};

export const paymentApiSlice = appApi.injectEndpoints({
  endpoints: (build) => ({
    getPaymentMethods: build.query<
      PaymentMethodsResponse,
      { page: number; per_page: number }
    >({
      query: ({ page, per_page }) =>
        `payment-methods/all?page=${page}&per_page=${per_page}`,
      providesTags: () => [{ type: "paymentApi" }],
    }),
    createDepositRequest: build.mutation<
      { response: { status: string; message: string } },
      {
        payment_method_id: number;
        amount: number;
        last_six_digits_of_payment_slip: string;
        payment_slip_image: File;
      }
    >({
      query: (body) => {
        const form = new FormData();
        form.append("payment_method_id", String(body.payment_method_id));
        form.append("amount", String(body.amount));
        form.append(
          "last_six_digits_of_payment_slip",
          body.last_six_digits_of_payment_slip,
        );
        form.append("payment_slip_image", body.payment_slip_image);
        return {
          url: "deposit-requests/create",
          method: "POST",
          body: form,
        };
      },
      invalidatesTags: ["paymentApi"],
    }),
    createWithdrawRequest: build.mutation<
      { response: { status: string; message: string } },
      {
        payment_method_id: number;
        amount: number;
        receiver_phone_number: string;
        password: string;
      }
    >({
      query: (body) => ({
        url: "withdraw-requests/create",
        method: "POST",
        body: {
          payment_method_id: body.payment_method_id,
          amount: body.amount,
          receiver_phone_number: body.receiver_phone_number,
          password: body.password,
        },
      }),
      invalidatesTags: ["paymentApi"],
    }),

    findUserByPhone: build.query<
      FindUserByPhoneResponse,
      { phone_number: string }
    >({
      query: ({ phone_number }) =>
        `find-by-phone?phone_number=${encodeURIComponent(phone_number)}`,
    }),

    transferMoney: build.mutation<
      { response: { status: string; message: string } },
      { recipient_id: number; password: string; amount: number }
    >({
      query: (body) => ({
        url: "transfer-money",
        method: "POST",
        body: {
          recipient_id: body.recipient_id,
          password: body.password,
          amount: body.amount,
        },
      }),
    }),
  }),
});

export const {
  useGetPaymentMethodsQuery,
  useCreateDepositRequestMutation,
  useCreateWithdrawRequestMutation,
  useLazyFindUserByPhoneQuery,
  useTransferMoneyMutation,
} = paymentApiSlice;
