"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppSelector } from "@/redux/hook";
import { getUserAvatarSrc } from "@/lib/avatar";
type Props = {
  logoutHandler: () => void;
};

export function NavProfile({ logoutHandler }: Props) {
  const { name, id } = useAppSelector((state) => state.auth);
  const avatarSrc = getUserAvatarSrc({ userId: id, name });
  const initials =
    (name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";
  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="py-4 bg-transparent">
            <div className="flex items-center gap-2">
              <Avatar className="size-10 rounded-md border border-emerald-200/20 bg-emerald-950/40 shadow-[0_12px_30px_rgba(0,0,0,0.35)] ring-2 ring-emerald-300/25">
                <AvatarImage
                  src={avatarSrc}
                  alt={name ?? "User"}
                  className="rounded-md"
                />
                <AvatarFallback className="rounded-md bg-emerald-950/40 text-[#EFA02C] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className="ml-3 text-[#EFA02C] font-bold">{name}</p>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[200px] gap-4">
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/"
                    className="flex-row items-center gap-2"
                    onClick={logoutHandler}
                  >
                    <LogOut />
                    Log out
                  </Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
