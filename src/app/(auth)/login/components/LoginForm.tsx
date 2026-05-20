"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/redux/hook";
import { useSearchParams } from "next/navigation";
import { clearToken, setToken, setUserData } from "@/redux/features/AuthSlice";
import http from "@/redux/http";
import { Button } from "@/components/ui/button";
import { fcmService } from "@/services/fcmService";

type LoginFormValues = {
  phone_number: string;
  password: string;
};
type Errors = {
  phone_number?: string[];
  password?: string[];
};

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirectUrl");
  console.log("redirectUrl", redirectUrl);
  const [loading, setLoading] = useState(false);
  const {
    register,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    reValidateMode: "onChange",
  });

  useEffect(() => {
    const getToken = async () => {
      console.log("Login: Attempting to get FCM token...");
      const fcmToken = await fcmService.initializeToken();
      console.log("Login: FCM token result:", fcmToken);
    };

    getToken();
  }, []);

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setLoading(true);
    let isSuccess = false;

    try {
      console.log("Login: Attempting to get FCM token...");
      const fcmToken = await fcmService.initializeToken();
      console.log("Login: FCM token result:", fcmToken);

      const formData = new FormData();
      formData.append("phone_number", data.phone_number);
      formData.append("password", data.password);
      if (fcmToken) {
        formData.append("fcm_token", fcmToken);
        console.log("Login: Adding FCM token to request");
      } else {
        console.log("Login: No FCM token available");
      }

      const response = await http.login("/auth/login", formData);

      if (response.status === 422 && response.data.errors) {
        console.log("true", true);
        const apiErrors: Errors = response.data.errors;
        (Object.keys(apiErrors) as Array<keyof Errors>).forEach((key) => {
          const message = apiErrors[key]?.[0];
          if (message) {
            setError(key, { type: "manual", message });
          }
        });
        toast.error("登录失败。", {
          description: apiErrors.password
            ? apiErrors.password[0]
            : apiErrors.phone_number
              ? apiErrors.phone_number[0]
              : "请检查您的凭据并重试。",
        });
      } else if (response.status === 200) {
        const accessToken = response.data.data.accessToken;
        const user = response.data.data.user;
        dispatch(setToken(accessToken));
        if (user) {
          dispatch(
            setUserData({
              id: String(user.id),
              name: user.name || "",
              email: user.email || "",
              phone_number: user.phone_number || "",
              status: user.is_verified ? "verified" : "unverified",
              profile_status: null,
              balance: user.balance ?? null,
            }),
          );
        }
        toast.success("登录成功！", {
          description: "欢迎回来！",
        });
        isSuccess = true;
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("登录失败。", {
        description: "请检查您的凭据并重试。",
      });
    } finally {
      setLoading(false);
      if (isSuccess) {
        if (redirectUrl) {
          router.push(redirectUrl);
        } else {
          router.push("/");
        }
      }
    }
  };

  useEffect(() => {
    //clear authslice
    console.log("signup page renderes");
    dispatch(clearToken());
  }, [dispatch]);

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
            账号 ID
          </p>
          <div className="flex-1">
            <Input
              id="phone_number"
              type="tel"
              inputMode="numeric"
              placeholder="电话号码"
              autoComplete="tel"
              variant="casino"
              {...register("phone_number", {
                required: "请填写电话号码。",
                minLength: {
                  value: 6,
                  message: "请输入有效的电话号码。",
                },
              })}
              error={!!errors.phone_number}
              hint={errors.phone_number?.message}
              className="auth-input-light h-[2.6rem] rounded-[13px] border-[#cfc0a0] bg-white px-3.5 py-2 text-[14px] font-medium text-[#4f3517] shadow-none selection:bg-[#d7a64b] selection:text-[#fffaf0] focus:border-[#b98736] focus:bg-white placeholder:text-[#c7b289]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
            密码
          </p>
          <div className="flex-1">
            <Input
              id="password"
              type="password"
              placeholder="密码"
              autoComplete="off"
              variant="casino"
              {...register("password", {
                required: "请填写密码。",
                minLength: {
                  value: 8,
                  message: "密码长度必须至少为 8 个字符。",
                },
                maxLength: {
                  value: 20,
                  message: "密码长度不能超过 20 个字符。",
                },
              })}
              error={!!errors.password}
              hint={errors.password?.message}
              className="auth-input-light h-[2.6rem] rounded-[13px] border-[#cfc0a0] bg-white px-3.5 py-2 text-[14px] font-medium text-[#4f3517] shadow-none selection:bg-[#d7a64b] selection:text-[#fffaf0] focus:border-[#b98736] focus:bg-white placeholder:text-[#c7b289]"
            />
          </div>
        </div>
      </div>

      <Button
        disabled={loading}
        type="submit"
        className="mt-1 flex h-[2.75rem] w-full items-center justify-center rounded-full border border-[#8c6a2e] bg-[#2a2418] px-5 text-[14px] font-bold uppercase tracking-[0.2em] text-[#f3d58b] shadow-none transition disabled:opacity-70"
      >
        {loading ? "登录中..." : "登录"}
      </Button>
    </form>
  );
}
