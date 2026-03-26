"use client";

import { ArrowLeft, PlayIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useCreateWithdrawRequestMutation } from "@/redux/features/payment/PaymentApiSlice";

export default function WithdrawClient() {
  const { name, token } = useSelector((state: RootState) => state.auth);
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [createWithdraw, { isLoading }] = useCreateWithdrawRequestMutation();
  const router = useRouter();

  const payloadRaw = searchParams.get("payload");
  const payload = payloadRaw
    ? (() => {
        try {
          return JSON.parse(atob(payloadRaw)) as { id: number };
        } catch {
          return null;
        }
      })()
    : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{
    amount: number;
    receiver_phone_number: string;
    password: string;
  }>();

  useEffect(() => {
    setMounted(true);
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    if (!payload) return toast.error("Missing payment method");
    try {
      await createWithdraw({
        payment_method_id: payload.id,
        amount: data.amount,
        receiver_phone_number: data.receiver_phone_number,
        password: data.password,
      }).unwrap();
      toast.success("Withdraw request submitted!");
      router.push("/wallet/payment-lists?type=withdraw");
    } catch (e) {
      const msg = (e as { data?: { response?: { message?: string } } })?.data
        ?.response?.message;
      toast.error(msg || "Submission failed");
    }
  });

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full flex-col items-center px-5 py-2 text-amber-100">
      <div className="mt-1 w-full space-y-2">
        <Link href="/wallet" className="flex items-center gap-2">
          <ArrowLeft size={22} />
          <h1 className="text-3xl font-semibold">ငွေထုတ်မည်</h1>
        </Link>
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
            Receiver Phone Number
          </p>
          <Input
            type="tel"
            variant="dark"
            placeholder="Phone Number"
            {...register("receiver_phone_number", { required: true })}
            error={!!errors.receiver_phone_number}
            hint={errors.receiver_phone_number?.message}
          />
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
          disabled={isLoading}
          className="mx-auto flex w-40 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f9c86c] to-[#f5a623] text-[#3c0505] hover:brightness-110 disabled:opacity-60"
        >
          <PlayIcon size={16} />
          <span>{isLoading ? "Sending..." : "Send"}</span>
        </Button>
      </form>
    </div>
  );
}
