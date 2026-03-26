"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Button } from "@/components/ui/button";
import {
  PhoneCall,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentPage() {
  const { name, token } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full flex-col items-center px-5 py-2 text-amber-100 pb-12">
      <div className="mt-1 w-full space-y-2">
        <div className="flex items-center gap-2">
          <ArrowLeft size={18} onClick={() => router.back()} />
          <h1 className="text-3xl font-semibold">Payment</h1>
        </div>
        <p className="text-sm tracking-wide text-amber-200/90">
          {mounted && token && name ? `Hi ${name}!` : "Hi Guest!"}
        </p>
        <h2 className="text-4xl font-semibold leading-tight text-[#c63a63] sm:text-5xl">
          Play &amp; Win
        </h2>
      </div>

      {/* Deposit and Withdraw Buttons */}
      <div className="mt-8 w-full ">
        <Link
          href="/wallet/payment-lists?type=deposit"
          className="w-full "
          prefetch={false}
        >
          <Button className="w-full py-8 rounded-2xl border border-amber-300/80 bg-[#220300] text-amber-300 hover:bg-[#300404] hover:border-amber-200 flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <ArrowDownRight size={20} />
            <span className="text-xl">ငွေသွင်းမည်</span>
          </Button>
        </Link>
        <Link
          href="/wallet/payment-lists?type=withdrawal"
          className="w-full mt-3"
          prefetch={false}
        >
          <Button className="w-full py-8 mt-3 rounded-2xl border border-amber-300/80 bg-[#220300] text-amber-300 hover:bg-[#300404] hover:border-amber-200 flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <ArrowUpRight size={20} />
            <span className="text-xl">ငွေထုတ်မည်</span>
          </Button>
        </Link>
        <Link href="/wallet/transfer" className="w-full mt-3" prefetch={false}>
          <Button className="w-full py-8 mt-3 rounded-2xl border border-amber-300/80 bg-[#220300] text-amber-300 hover:bg-[#300404] hover:border-amber-200 flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <ArrowUpRight size={20} />
            <span className="text-xl">ငွေလဲမည်</span>
          </Button>
        </Link>
      </div>

      {/* Contact Section */}
      <div className="mt-8 w-full space-y-4">
        <p className="text-center text-amber-200/90">ဆက်သွယ်ရန်</p>
        <Button className="w-3/4 mx-auto rounded-full bg-[#6e1111] text-amber-100 hover:bg-[#811616] flex items-center justify-center gap-2">
          <PhoneCall size={20} />
          <span>092012345</span>
        </Button>
        <Button className="w-3/4 mx-auto rounded-full bg-[#6e1111] text-amber-100 hover:bg-[#811616] flex items-center justify-center gap-2">
          <PhoneCall size={20} />
          <span>092012345</span>
        </Button>
      </div>
    </div>
  );
}
