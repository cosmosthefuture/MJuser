"use client";

import Image from "next/image";
import { ArrowLeft, Copy, PlayIcon } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useCreateDepositRequestMutation } from "@/redux/features/payment/PaymentApiSlice";

export default function DepositClient() {
  const { name, token } = useSelector((state: RootState) => state.auth);
  const searchParams = useSearchParams();

  const payloadRaw = searchParams.get("payload");
  const payload = payloadRaw
    ? (() => {
        try {
          return JSON.parse(atob(payloadRaw)) as {
            id: number;
            type: string;
            account_username: string;
            phone_number: string;
          };
        } catch {
          return null;
        }
      })()
    : null;

  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [createDeposit, { isLoading }] = useCreateDepositRequestMutation();
  const router = useRouter();

  const { register, handleSubmit, watch } = useForm<{
    amount: number;
    last_six_digits_of_payment_slip: string;
    payment_slip_image: FileList;
  }>();

  useEffect(() => {
    setMounted(true);
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    if (!payload) return toast.error("Missing payment method");
    const file = data.payment_slip_image[0];
    if (!file) return toast.error("Please select slip image");
    try {
      await createDeposit({
        payment_method_id: payload.id,
        amount: data.amount,
        last_six_digits_of_payment_slip: data.last_six_digits_of_payment_slip,
        payment_slip_image: file,
      }).unwrap();
      toast.success("Deposit request submitted!");
      router.push("/wallet/payment-lists?type=deposit");
    } catch (e) {
      const msg = (e as { data?: { response?: { message?: string } } })?.data
        ?.response?.message;
      toast.error(msg || "Submission failed");
    }
  });

  const watchedFile = watch("payment_slip_image")?.[0];
  useEffect(() => {
    if (watchedFile) {
      const url = URL.createObjectURL(watchedFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else setPreview(null);
  }, [watchedFile]);

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full flex-col items-center px-5 pt-2 pb-22 text-amber-100">
      <div className="mt-1 w-full space-y-2">
        <Link href="/wallet" className="flex items-center gap-2">
          <ArrowLeft size={22} />
          <h1 className="text-3xl font-semibold">ငွေသွင်းမည်</h1>
        </Link>
        <p className="mt-2 text-sm tracking-wide text-amber-200/90">
          {mounted && token && name ? `Hi ${name}!` : "Hi Guest!"}
        </p>
      </div>

      <div className="mt-6 w-full rounded-2xl border border-amber-300 bg-[#2a0500] p-4 text-amber-100 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {payload ? (
              <>
                <Image
                  src={
                    payload.type === "kpay"
                      ? "/images/kpay.png"
                      : "/images/wave.png"
                  }
                  alt={payload.type === "kpay" ? "KBZ Pay" : "Wave"}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-md object-contain bg-white"
                />
                <div>
                  <p className="text-base font-semibold">
                    {payload.account_username}
                  </p>
                  <p className="text-sm">{payload.phone_number}</p>
                </div>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-amber-200">
            <Button
              variant="ghost"
              className="h-8 w-8 rounded-full border border-amber-300/50 bg-white/5 hover:bg-white/10"
              onClick={() => {
                const phone = payload?.phone_number;
                if (!phone) return;
                navigator.clipboard.writeText(phone);
                toast.success("Phone copied!");
              }}
            >
              <Copy size={16} />
            </Button>
          </div>
        </div>
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
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
            Last 6 digits of slip
          </p>
          <Input
            type="text"
            maxLength={6}
            variant="dark"
            placeholder="123456"
            {...register("last_six_digits_of_payment_slip", {
              required: true,
            })}
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
            Payment slip image
          </p>
          <input
            type="file"
            accept="image/*"
            {...register("payment_slip_image", { required: true })}
            className="w-full rounded-2xl border border-amber-100/30 bg-[#2c0e08]/80 text-amber-100 px-4 py-1 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-300 file:px-4 file:py-2 file:text-sm file:text-[#3c0505] hover:file:brightness-110"
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Slip preview"
              className="mt-3 h-40 w-full rounded-xl object-cover"
            />
          )}
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="mx-auto  flex w-40 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f9c86c] to-[#f5a623] text-[#3c0505] hover:brightness-110 disabled:opacity-60"
        >
          <PlayIcon size={16} />
          <span>{isLoading ? "Sending..." : "Send"}</span>
        </Button>
      </form>
    </div>
  );
}
