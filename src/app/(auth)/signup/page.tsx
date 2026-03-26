import Link from "next/link";
import SignUpForm from "./components/signUpForm";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <div className="relative z-10 mx-auto flex w-full flex-1 flex-col items-center px-5 py-8 pb-20 text-amber-100">
      <div className="mt-6 w-full space-y-2">
        <p className="text-sm tracking-wide text-amber-200/90">
          Hi Future Champion!
        </p>
        <h1 className="text-4xl font-semibold leading-tight text-amber-200 sm:text-5xl">
          Register
          <br />
          <span className="font-light text-amber-300">Then Play &amp; Win</span>
        </h1>
      </div>

      <div className="mt-10 w-full max-w-sm">
        <Suspense fallback={null}>
          <SignUpForm />
        </Suspense>

        <div className="mt-6 text-center text-sm">
          <span className="text-amber-200/70">Already have an account?</span>{" "}
          <Link
            href="/login"
            className="font-semibold text-amber-300 hover:text-amber-200"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
