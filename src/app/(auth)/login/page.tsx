"use client";

import Link from "next/link";
import React, { Suspense } from "react";
import LoginForm from "./components/LoginForm";
export default function loginPage() {
  return (
    <div className="relative z-10 mx-auto flex w-full flex-1 flex-col items-center overflow-y-auto px-5 py-8 pb-20 text-amber-100">
      <div className="mt-6 w-full space-y-2">
        <p className="text-sm tracking-wide text-amber-200/90">Hi Guest!</p>
        <h1 className="text-4xl font-semibold leading-tight text-amber-200 sm:text-5xl">
          Login
          <br />
          <span className="font-light text-amber-300">Play &amp; Win</span>
        </h1>
      </div>

      <div className="mt-10 w-full max-w-sm">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <div className="mt-6 text-center text-sm">
          <span className="text-amber-200/70">New here?</span>{" "}
          <Link
            href="/signup"
            className="font-semibold text-amber-300 hover:text-amber-200"
          >
            Register Now
          </Link>
        </div>
      </div>
    </div>
  );
}
