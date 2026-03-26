import { Suspense } from "react";
import AuthStage from "../components/AuthStage";
import SignUpForm from "./components/signUpForm";

export default function SignUpPage() {
  return (
    <AuthStage
      eyebrow=""
      linkHref="/login"
      linkLabel="Login"
      linkPrompt="Already have an account?"
      subtitle="Create an account, confirm your phone, and step straight into the lobby."
      title="Register"
    >
      <div className="w-full">
        <Suspense fallback={null}>
          <SignUpForm />
        </Suspense>
      </div>
    </AuthStage>
  );
}
