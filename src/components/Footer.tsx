import { Dice1, List, User2 } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="sticky bottom-0 z-50 w-full border-t border-amber-200/20 bg-[#1a0100]/90">
      <div className="mx-auto flex max-w-sm justify-around px-8 py-4 text-amber-200">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-xs font-medium tracking-wide"
        >
          <Dice1 size={20} />
          Play
        </Link>
        <Link
          href="/wallet"
          className="flex flex-col items-center gap-1 text-xs font-medium tracking-wide"
        >
          <List size={20} />
          Wallet
        </Link>
        <Link
          href="/profile"
          className="flex flex-col items-center gap-1 text-xs font-medium tracking-wide"
        >
          <User2 size={20} />
          Profile
        </Link>
      </div>
    </footer>
  );
}
