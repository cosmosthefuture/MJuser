"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/hook";
import { useLogout } from "@/redux/http";
import { toast } from "sonner";
import axios from "axios";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { NavProfile } from "./navProfile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { List } from "lucide-react";

export default function Navbar() {
  const navLinks = [
    {
      label: "Home",
      path: "/",
    },
    {
      label: "Resources",
      path: "/resources",
    },
    {
      label: "About",
      path: "/sfg",
    },
  ];

  const { token } = useAppSelector((state) => state.auth);
  const [isMounted, setIsMounted] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const logout = useLogout();
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
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <nav className="bg-gray-50 w-100% shadow border-b border-gray-100">
        <div className="hidden md:flex lg:flex xl:flex  justify-between items-center px-10 md:px-10 lg:px-28 py-2">
          <div className="text-xl font-bold">
            <div className="">Game</div>
          </div>
          <div className="flex items-center space-x-8 relative">
            {navLinks.map((link, index) => (
              <div key={index} className="relative">
                <Link
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                  href={link.path}
                  className="relative"
                >
                  {link.label}
                  {hovered === index && (
                    <motion.div
                      className="absolute bottom-[-21px] left-0 w-full h-[2px] bg-[#6BE2A9]"
                      layoutId="underline"
                    />
                  )}
                  {pathname === link.path && (
                    <motion.div
                      className="absolute bottom-[-21px] left-0 w-full h-[2px] bg-[#6BE2A9]"
                      layoutId="underline"
                    />
                  )}
                </Link>
              </div>
            ))}
          </div>

          <div className="flex space-x-4">
            {isMounted ? (
              token ? (
                <div className="z-1000">
                  <NavProfile logoutHandler={logoutHandler} />
                </div>
              ) : (
                <Link href="/login">
                  <Button
                    variant="default"
                    className="text-white px-8 font-medium py-2"
                  >
                    Login
                  </Button>
                </Link>
              )
            ) : (
              <div className="w-28 h-10" />
            )}
          </div>
        </div>
      </nav>
      {/* mobile */}

      <nav className="bg-gray-50 w-full md:hidden lg:hidden xl:hidden shadow border-b border-gray-100 fixed top-0 z-50">
        <div className="flex justify-between items-center px-4 py-2">
          <p></p>
          <p>Game</p>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger>
              <List />
            </SheetTrigger>
            {isMounted && (
              <SheetContent side="top" className="h-[100vh]">
                <div className="flex flex-col items-center mt-10 space-y-4">
                  {navLinks.map((link, idx) => (
                    <Link
                      onMouseEnter={() => setHovered(idx)}
                      onMouseLeave={() => setHovered(null)}
                      key={idx}
                      href={link.path}
                      className="relative text-lg font-medium"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                      {hovered === idx && (
                        <motion.div
                          className="absolute bottom-[-8px] left-0 w-full h-[2px] bg-[#6BE2A9]"
                          layoutId="underlinemobile"
                        />
                      )}
                      {pathname === link.path && (
                        <motion.div
                          className="absolute bottom-[-8px] left-0 w-full h-[2px] bg-[#6BE2A9]"
                          layoutId="underlinemobile"
                        />
                      )}
                    </Link>
                  ))}
                  {token ? (
                    <>
                      <p
                        onMouseEnter={() => setHovered(9)}
                        onMouseLeave={() => setHovered(null)}
                        key={9}
                        className="relative text-lg font-medium"
                        onClick={() => {
                          logoutHandler();
                          setOpen(false);
                        }}
                      >
                        Logout
                        {hovered === 9 && (
                          <motion.div
                            className="absolute bottom-[-8px] left-0 w-full h-[2px] bg-[#6BE2A9]"
                            layoutId="underlinemobile"
                          />
                        )}
                        {pathname === "/logout" && (
                          <motion.div
                            className="absolute bottom-[-8px] left-0 w-full h-[2px] bg-[#6BE2A9]"
                            layoutId="underlinemobile"
                          />
                        )}
                      </p>
                    </>
                  ) : (
                    <Link
                      onMouseEnter={() => setHovered(10)}
                      onMouseLeave={() => setHovered(null)}
                      key={10}
                      href="/login"
                      className="relative text-lg font-medium"
                      onClick={() => setOpen(false)}
                    >
                      Login
                      {hovered === 10 && (
                        <motion.div
                          className="absolute bottom-[-8px] left-0 w-full h-[2px] bg-[#6BE2A9]"
                          layoutId="underlinemobile"
                        />
                      )}
                      {pathname === "/login" && (
                        <motion.div
                          className="absolute bottom-[-8px] left-0 w-full h-[2px] bg-[#6BE2A9]"
                          layoutId="underlinemobile"
                        />
                      )}
                    </Link>
                  )}
                </div>
              </SheetContent>
            )}
          </Sheet>
        </div>
      </nav>
    </>
  );
}
