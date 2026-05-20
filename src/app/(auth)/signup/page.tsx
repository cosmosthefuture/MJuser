import { Suspense } from "react";
import AuthStage from "../components/AuthStage";
import SignUpForm from "./components/signUpForm";

export default function SignUpPage() {
  return (
    <AuthStage
      eyebrow=""
      linkHref="/login"
      linkLabel="登录"
      linkPrompt="已经有账号了？"
      subtitle="创建账号，验证您的手机，直接进入大厅。"
      title="注册"
    >
      <div className="w-full">
        <Suspense fallback={null}>
          <SignUpForm />
        </Suspense>
      </div>
    </AuthStage>
  );
}
