"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  ChevronRight,
  Lock,
  User2,
  LogOut,
  KeyRound,
  ListChecks,
  ArrowLeft,
} from "lucide-react";
import { useLogout } from "@/redux/http";
import { toast } from "sonner";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Profile() {
  const { name, phone_number } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const logout = useLogout();

  const displayName = name || "Guest";
  const displayPhone = phone_number || "-";

  const items: { id: string; icon: ReactNode; label: string }[] = [
    {
      id: "password",
      icon: <KeyRound size={18} />,
      label: "Password ပြောင်းမည်",
    },
    { id: "profile", icon: <User2 size={18} />, label: "အထူးသတ်မှတ်ချက်များ" },
    { id: "preferences", icon: <ListChecks size={18} />, label: "အကြိုက်များ" },
    {
      id: "activity",
      icon: <Lock size={18} />,
      label: "လုပ်ဆောင်မှုမှတ်တမ်းများ",
    },
    { id: "logout", icon: <LogOut size={18} />, label: "Logout ထွက်ရန်" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("You have been logged out successfully.");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(`Logout failed: ${error.response.data.message}`);
      } else {
        toast.error("Logout failed, please try again.");
      }
    }
  };

  const handleItemClick = (id: string) => {
    if (id === "logout") {
      void handleLogout();
      return;
    }
    // other items can be wired later
  };

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-5 pt-1 pb-24 text-amber-100">
      <div className="flex items-center justify-start">
        <ArrowLeft size={18} onClick={() => router.back()} />
      </div>
      <div className="mt-6 flex flex-col items-center space-y-3 text-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-amber-300/80 bg-black/60 shadow-[0_0_25px_rgba(0,0,0,0.6)]">
          <Image
            src="/images/avatar-placeholder.png"
            alt="Profile avatar"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-wide">{displayName}</p>
          <p className="text-sm text-amber-200/80">{displayPhone}</p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleItemClick(item.id)}
            className="flex w-full items-center justify-between rounded-2xl border border-amber-100/20 bg-black/60 px-4 py-3 text-sm text-amber-100 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
          >
            <span className="flex items-center gap-3">
              <span className="text-amber-300">{item.icon}</span>
              <span>{item.label}</span>
            </span>
            <ChevronRight size={18} className="text-amber-300" />
          </button>
        ))}
      </div>
    </div>
  );
}
