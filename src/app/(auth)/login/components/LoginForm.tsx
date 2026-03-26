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
    <div className="rounded-3xl bg-white/5 p-6 backdrop-blur-md ring-1 ring-amber-200/20 shadow-2xl shadow-amber-900/20">
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
            Phone Number
          </p>
          <Input
            id="phone_number"
            type="tel"
            inputMode="numeric"
            placeholder="Phone Number"
            autoComplete="tel"
            variant="dark"
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

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
            Password
          </p>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            autoComplete="off"
            variant="dark"
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

        <Button
          disabled={loading}
          type="submit"
          className="mt-4 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#f9c86c] to-[#f5a623] py-4 text-base font-semibold text-[#3c0505] shadow-lg shadow-amber-900/40 transition hover:brightness-110 disabled:opacity-70"
        >
          {loading ? (
            "Logging in..."
          ) : (
            <span className="flex items-center gap-2">
              <span className="inline-block text-lg">▶</span> Login
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
