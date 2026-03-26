"use client";

import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useGetPaymentMethodsQuery } from "@/redux/features/payment/PaymentApiSlice";
import { ArrowLeft } from "lucide-react";

export default function PaymentListsClient() {
  const { name, token } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") ?? "deposit";
  const target = type === "withdrawal" ? "/wallet/withdraw" : "/wallet/deposit";
  const heading = type === "withdrawal" ? "ငွေထုတ်မည်" : "ငွေသွင်းမည်";
  const [mounted, setMounted] = useState(false);
  const { data } = useGetPaymentMethodsQuery({ page: 1, per_page: 10 });

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full flex-col items-center px-5 py-2 text-amber-100">
      <div className="mt-1 w-full space-y-2">
        <div className="flex  items-center gap-2">
          <ArrowLeft size={18} onClick={() => router.back()} />
          <h1 className="text-3xl font-semibold">Payment</h1>
        </div>
        <p className="text-sm tracking-wide text-amber-200/90">
          {mounted && token && name ? `Hi ${name}!` : "Hi Guest!"}
        </p>
        <h2 className="text-3xl text-center font-semibold leading-tight text-amber-200 sm:text-4xl">
          {heading}
        </h2>
      </div>

      <div className="mt-8 w-full space-y-4">
        {data?.data?.map((m) => {
          const img =
            m.type.toLowerCase() === "kpay"
              ? "/images/kpay.png"
              : "/images/wave.png";
          const label = m.type.toLowerCase() === "kpay" ? "KBZ Pay" : "Wave";
          const href = `${target}?method=${m.type.toLowerCase()}&payload=${encodeURIComponent(
            btoa(JSON.stringify(m)),
          )}`;
          return (
            <Button
              key={`${m.type}-${m.id}`}
              asChild
              className="w-full py-8 rounded-2xl border border-amber-300/80 bg-[#220300] text-amber-200 hover:bg-[#300404] hover:border-amber-200 px-4"
            >
              <Link href={href} className="flex items-center gap-3">
                <Image
                  src={img}
                  alt={label}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-md object-contain bg-white"
                />
                <span className="text-lg">{label}</span>
              </Link>
            </Button>
          );
        })}
      </div>

      <div className="mt-8 w-full space-y-4">
        <p className="text-center text-amber-200/90">ဆက်သွယ်ရန်</p>
        <Button className="w-3/4 mx-auto rounded-full bg-[#6e1111] text-amber-100 hover:bg-[#811616] flex items-center justify-center gap-2">
          <span className="sr-only">Call</span>
          <span>092012345</span>
        </Button>
        <Button className="w-3/4 mx-auto rounded-full bg-[#6e1111] text-amber-100 hover:bg-[#811616] flex items-center justify-center gap-2">
          <span className="sr-only">Call</span>
          <span>092012345</span>
        </Button>
      </div>
    </div>
  );
}
