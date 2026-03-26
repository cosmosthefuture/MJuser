"use client";

import React, { Suspense } from "react";
import AuthStage from "../components/AuthStage";
import LoginForm from "./components/LoginForm";

export default function loginPage() {
  return (
    <AuthStage
      eyebrow="Welcome Back"
      linkHref="/signup"
      linkLabel="Register"
      linkPrompt="New here?"
      subtitle="Return to the felt, sync your balance, and get back to the live tables."
      title="Login"
    >
      <div className="w-full">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthStage>
  );
}
