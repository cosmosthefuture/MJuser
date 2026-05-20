"use client";

import React, { Suspense } from "react";
import AuthStage from "../components/AuthStage";
import LoginForm from "./components/LoginForm";

export default function loginPage() {
  return (
    <AuthStage
      compactMobile
      eyebrow=""
      linkHref="/signup"
      linkLabel="注册"
      linkPrompt="还没有账号？"
      subtitle="返回牌桌，同步您的余额，重新加入实时牌局。"
      title="登录"
    >
      <div className="w-full">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthStage>
  );
}
