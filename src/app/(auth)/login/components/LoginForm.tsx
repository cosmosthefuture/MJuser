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
        toast.error("Login failed.", {
          description: apiErrors.password
            ? apiErrors.password[0]
            : apiErrors.phone_number
              ? apiErrors.phone_number[0]
              : "Please check your credentials and try again.",
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
        toast.success("Login successful!", {
          description: "Welcome back!",
        });
        isSuccess = true;
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Login failed.", {
        description: "Please check your credentials and try again.",
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
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="w-28 shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-[#f1d58d]">
            Phone Number
          </p>
          <div className="flex-1">
            <Input
              id="phone_number"
              type="tel"
              inputMode="numeric"
              placeholder="Phone Number"
              autoComplete="tel"
              variant="casino"
              {...register("phone_number", {
                required: "Phone number is required.",
                minLength: {
                  value: 6,
                  message: "Please enter a valid phone number.",
                },
              })}
              error={!!errors.phone_number}
              hint={errors.phone_number?.message}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="w-28 shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-[#f1d58d]">
            Password
          </p>
          <div className="flex-1">
            <Input
              id="password"
              type="password"
              placeholder="Password"
              autoComplete="off"
              variant="casino"
              {...register("password", {
                required: "Password is required.",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters long.",
                },
                maxLength: {
                  value: 20,
                  message: "Password must be at most 20 characters long.",
                },
              })}
              error={!!errors.password}
              hint={errors.password?.message}
            />
          </div>
        </div>
      </div>

      <Button
        disabled={loading}
        type="submit"
        className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-[#9b2c35] px-5 text-base font-semibold text-[#fff8e4] shadow-[0_18px_34px_rgba(100,33,21,0.22)] transition hover:brightness-105 disabled:opacity-70"
      >
        {loading ? "Logging in..." : "Enter The Lobby"}
      </Button>
    </form>
  );
}
