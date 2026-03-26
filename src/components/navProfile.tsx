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
type Props = {
  logoutHandler: () => void;
};

export function NavProfile({ logoutHandler }: Props) {
  const { name } = useAppSelector((state) => state.auth);
  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="py-4 bg-transparent">
            <div className="flex flex-row flex-wrap items-center gap-12 space-x-3">
              <Avatar>
                <AvatarImage
                  src="https://github.com/shadcn.png"
                  alt="@shadcn"
                />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </div>
            <p className="ml-3">{name}</p>
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
