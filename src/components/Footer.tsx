import { Dice1, List, User2 } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full px-4 pb-4">
      <div className="mx-auto flex max-w-sm items-center justify-around rounded-[28px] border border-[#dfc390] bg-[#f8edd6]/95 px-5 py-3 text-[#7a4b1f] shadow-[0_18px_40px_rgba(109,69,20,0.14)]">
        <Link
          href="/"
          className="flex min-w-20 flex-col items-center gap-1 rounded-[18px] px-3 py-2 text-xs font-semibold tracking-[0.18em] transition hover:bg-[#f2dfb8]"
        >
          <Dice1 size={20} />
          Play
        </Link>
        <Link
          href="/wallet"
          className="flex min-w-20 flex-col items-center gap-1 rounded-[18px] px-3 py-2 text-xs font-semibold tracking-[0.18em] transition hover:bg-[#f2dfb8]"
        >
          <List size={20} />
          Wallet
        </Link>
        <Link
          href="/profile"
          className="flex min-w-20 flex-col items-center gap-1 rounded-[18px] px-3 py-2 text-xs font-semibold tracking-[0.18em] transition hover:bg-[#f2dfb8]"
        >
          <User2 size={20} />
          Profile
        </Link>
      </div>
    </footer>
  );
}
