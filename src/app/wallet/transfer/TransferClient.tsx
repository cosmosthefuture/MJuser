"use client";

import { ArrowLeft, PlayIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useLazyFindUserByPhoneQuery,
  useTransferMoneyMutation,
} from "@/redux/features/payment/PaymentApiSlice";
import { RootState } from "@/redux/store";

type FormValues = {
  amount: number;
  receiver_phone_number: string;
  password: string;
};

export default function TransferClient() {
  const { name, token } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [triggerFindUserByPhone] = useLazyFindUserByPhoneQuery();
  const [transferMoney] = useTransferMoneyMutation();

  const [receiverName, setReceiverName] = useState<string | null>(null);
  const [receiverId, setReceiverId] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    setMounted(true);
  }, []);

  const receiverPhone = watch("receiver_phone_number");
  const normalizedReceiverPhone = useMemo(() => {
    return receiverPhone ? receiverPhone.replace(/\s+/g, "") : "";
  }, [receiverPhone]);

  const lookupReceiver = useCallback(
    async (phoneNumber: string) => {
      setIsChecking(true);
      try {
        const res = await triggerFindUserByPhone({
          phone_number: phoneNumber,
        }).unwrap();

        const foundName = res?.data?.name;
        const foundId = res?.data?.id;

        if (!foundId || !foundName) {
          setReceiverName(null);
          setReceiverId(null);
          toast.error("User not found");
          return;
        }

        setReceiverName(foundName);
        setReceiverId(foundId);
        toast.success("User found");
      } catch (e) {
        const msg = (e as { data?: { response?: { message?: string } } })?.data
          ?.response?.message;
        setReceiverName(null);
        setReceiverId(null);
        toast.error(msg || "Check failed");
      } finally {
        setIsChecking(false);
      }
    },
    [triggerFindUserByPhone],
  );

  const handleCheckReceiver = async () => {
    const phone = getValues("receiver_phone_number")?.trim();
    if (!phone) return toast.error("Enter phone number");

    await lookupReceiver(phone);
  };

  const onSubmit = handleSubmit(async (data) => {
    if (!data.amount) return;
    if (!data.receiver_phone_number) return;
    if (!data.password) return;
    if (!receiverId) return toast.error("Please check phone number");

    setIsSending(true);
    try {
      await transferMoney({
        recipient_id: receiverId,
        password: data.password,
        amount: data.amount,
      }).unwrap();

      toast.success("Transfer success!");
      router.push("/wallet");
    } catch (e) {
      const msg = (e as { data?: { response?: { message?: string } } })?.data
        ?.response?.message;
      toast.error(msg || "Transfer failed");
    } finally {
      setIsSending(false);
    }
  });

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full flex-col items-center px-5 py-2 text-amber-100">
      <div className="mt-1 w-full space-y-2">
        <div className="flex items-center gap-2">
          <ArrowLeft size={22} onClick={() => router.back()} />
          <h1 className="text-3xl font-semibold">ငွေလဲမည်</h1>
        </div>
        <p className="mt-3 text-sm tracking-wide text-amber-200/90">
          {mounted && token && name ? `Hi ${name}!` : "Hi Guest!"}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 w-full space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
            Amount
          </p>
          <Input
            type="number"
            variant="dark"
            placeholder="Amount"
            {...register("amount", { required: true, valueAsNumber: true })}
            error={!!errors.amount}
            hint={errors.amount?.message}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
            Phone number
          </p>

          <div className="flex items-stretch gap-3">
            <Input
              type="tel"
              variant="dark"
              placeholder="Phone Number"
              {...register("receiver_phone_number", {
                required: true,
                onChange: () => {
                  setReceiverName(null);
                  setReceiverId(null);
                },
              })}
              error={!!errors.receiver_phone_number}
              hint={errors.receiver_phone_number?.message}
              className="flex-1"
            />

            <Button
              type="button"
              onClick={handleCheckReceiver}
              disabled={isChecking || !normalizedReceiverPhone}
              className="h-[46px] rounded-2xl border border-amber-100/15 bg-white/5 px-5 text-amber-200 hover:bg-white/10 disabled:opacity-60"
            >
              {isChecking ? "Checking..." : "Check"}
            </Button>
          </div>

          {receiverName ? (
            <p className="text-sm text-amber-200/90">User : {receiverName}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
            Password
          </p>
          <Input
            type="password"
            variant="dark"
            placeholder="Password"
            {...register("password", { required: true })}
            error={!!errors.password}
            hint={errors.password?.message}
          />
        </div>

        <Button
          type="submit"
          disabled={isSending}
          className="mx-auto flex w-40 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f9c86c] to-[#f5a623] text-[#3c0505] hover:brightness-110 disabled:opacity-60"
        >
          <PlayIcon size={16} />
          <span>{isSending ? "Sending..." : "Send"}</span>
        </Button>
      </form>
    </div>
  );
}
