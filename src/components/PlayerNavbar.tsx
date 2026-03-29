"use client";

import axios from "axios";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/redux/http";
import { toast } from "sonner";

type PlayerNavbarProps = {
  balance?: string | null;
  compact?: boolean;
  className?: string;
};

export default function PlayerNavbar({
  balance,
  compact = false,
  className = "",
}: PlayerNavbarProps) {
  const logout = useLogout();

  const parsedBalance = Number(balance);
  const balanceText = Number.isFinite(parsedBalance)
    ? parsedBalance.toLocaleString()
    : balance || "0";

  async function logoutHandler() {
    try {
      await logout();
      toast.success("You have been logged out successfully.");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(`Logout failed: ${error.response.data.message}`);
      } else {
        toast.error("An unknown error occurred during logout.");
      }
    }
  }

  return (
    <div className={`${className} flex items-center justify-end gap-3`}>
      <div
        className={`inline-flex items-center rounded-full border border-[#b48a3b]/70 bg-[linear-gradient(180deg,rgba(37,28,17,0.94)_0%,rgba(18,14,9,0.96)_100%)] font-semibold text-[#ffe3a1] shadow-[inset_0_1px_0_rgba(255,235,178,0.1),0_10px_18px_rgba(0,0,0,0.22)] backdrop-blur-sm ${
          compact ? "px-3.5 py-1 text-[10px]" : "px-4.5 py-2 text-sm"
        }`}
      >
        <span
          className={`mr-2 inline-flex items-center justify-center rounded-full bg-[#d3a54c] font-black text-[#2a1c0f] ${
            compact ? "h-4 w-4 text-[9px]" : "h-5 w-5 text-[10px]"
          }`}
        >
          $
        </span>
        <span className="tracking-[0.08em]">{balanceText} MMK</span>
      </div>
      <Button
        type="button"
        onClick={logoutHandler}
        className={`rounded-full mt-1 border border-[#5c4a24] bg-[linear-gradient(180deg,rgba(26,24,20,0.96)_0%,rgba(12,11,9,0.98)_100%)] font-bold uppercase tracking-[0.1em] text-[#f0cd79] shadow-[inset_0_1px_0_rgba(255,235,178,0.08),0_10px_18px_rgba(0,0,0,0.24)] ${
          compact ? "h-7 px-3.5 text-[10px]" : "h-10 px-5 text-sm"
        }`}
      >
        Logout
      </Button>
    </div>
  );
}
