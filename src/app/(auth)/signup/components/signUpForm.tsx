"use client";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import http from "@/redux/http";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/redux/store";
import { clearToken, setToken, setUserData } from "@/redux/features/AuthSlice";
import { useRouter } from "next/navigation";
import { fcmService } from "@/services/fcmService";

type SignUpFormValues = {
  phone_number: string;
  otp: string;
  name: string;
  password: string;
  password_confirmation: string;
  agent_code?: string;
};
type Errors = {
  phone_number?: string[];
  otp?: string[];
  name?: string[];
  password?: string[];
  password_confirmation?: string[];
};

export default function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const {
    register,
    setError,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    reValidateMode: "onChange",
  });

  const handleGetOtp = async () => {
    const phone = watch("phone_number");
    if (!phone || phone.length < 6) {
      setError("phone_number", {
        type: "manual",
        message: "Please enter a valid phone number.",
      });
      return;
    }
    setOtpLoading(true);
    try {
      const response = await http.verifyPhone("/auth/verify-phone", {
        phone_number: phone,
      });
      if (
        response.status === 200 &&
        response.data.response?.status === "success"
      ) {
        toast.success("OTP sent", {
          description: response.data.response.message,
        });
        setOtpCooldown(120);
      } else if (response.status === 422) {
        const apiErrors = response.data.errors as {
          phone_number?: string[];
        };
        const msg =
          apiErrors?.phone_number?.[0] ||
          response.data.response?.message ||
          "Validation error";
        setError("phone_number", { type: "manual", message: msg });
        toast.error("Failed to send OTP", { description: msg });
      }
    } catch {
      toast.error("Failed to send OTP", {
        description: "Please try again later.",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  const onSubmit: SubmitHandler<SignUpFormValues> = async (data) => {
    setLoading(true);
    try {
      console.log("Signup: Attempting to get FCM token...");
      const fcmToken = await fcmService.initializeToken();
      console.log("Signup: FCM token result:", fcmToken);

      const payload = {
        phone_number: data.phone_number,
        otp: data.otp,
        name: data.name,
        password: data.password,
        password_confirmation: data.password_confirmation,
        agent_code: data.agent_code,
        ...(fcmToken ? { fcm_token: fcmToken } : {}),
      };

      const response = await http.register("/auth/register", payload);

      if (response.status === 422 && response.data.errors) {
        const apiErrors: Errors = response.data.errors;
        (Object.keys(apiErrors) as Array<keyof Errors>).forEach((key) => {
          const message = apiErrors[key]?.[0];
          if (message) {
            setError(key, { type: "manual", message });
          }
        });
        toast.error("Registration failed.", {
          description: apiErrors.password
            ? apiErrors.password[0]
            : apiErrors.phone_number
              ? apiErrors.phone_number[0]
              : apiErrors.otp
                ? apiErrors.otp[0]
                : apiErrors.name
                  ? apiErrors.name[0]
                  : "Please check your credentials and try again.",
        });
      } else if (response.status === 200 || response.status === 201) {
        const accessToken = response.data.data?.access_token;
        const user = response.data.data?.user;
        if (accessToken) {
          dispatch(setToken(accessToken));
        }
        if (user) {
          dispatch(
            setUserData({
              id: String(user.id),
              name: user.name || "",
              email: user.email || "",
              phone_number: user.phone_number || "",
              status: user.is_verified ? "verified" : "unverified",
              profile_status: null,
            }),
          );
        }
        toast.success("Registration successful!", {
          description: response.data.response?.message || "Account created.",
        });
        try {
          await fcmService.initializeToken();
        } catch (e) {
          console.error("Failed to initialize FCM token after signup", e);
        }
        router.push("/login");
      }
    } catch (err) {
      console.error("Registration error:", err);
      toast.error("Registration failed.", {
        description: "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    dispatch(clearToken());
  }, [dispatch]);
  return (
    <div className="rounded-3xl bg-white/5 p-6 backdrop-blur-md ring-1 ring-amber-200/20 shadow-2xl shadow-amber-900/20">
      <form
        className="space-y-5"
        onSubmit={handleSubmit(onSubmit)}
        action="#"
        method="POST"
      >
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
            Name
          </p>
          <Input
            id="name"
            type="text"
            placeholder="Name"
            autoComplete="off"
            variant="dark"
            {...register("name", {
              required: "Name is required.",
            })}
            error={!!errors.name}
            hint={errors.name?.message}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
            Phone Number
          </p>
          <div className="relative">
            <Input
              id="phone_number"
              type="tel"
              inputMode="numeric"
              placeholder="Phone Number"
              autoComplete="tel"
              variant="dark"
              className="pr-28"
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
            <Button
              type="button"
              onClick={handleGetOtp}
              disabled={otpLoading || loading || otpCooldown > 0}
              className="absolute top-2 right-1 h-8 w-16 rounded-xl border border-amber-200/30 bg-white/10 px-0 text-xs font-semibold text-amber-100 hover:bg-white/20 text-center"
              variant="ghost"
            >
              {otpCooldown > 0 ? `${otpCooldown}s` : "GET OTP"}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
            Agent Code (Optional)
          </p>
          <Input
            id="agent_code"
            type="text"
            placeholder="Agent Code (Optional)"
            autoComplete="off"
            variant="dark"
            {...register("agent_code")}
            error={!!errors.agent_code}
            hint={errors.agent_code?.message}
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
            OTP
          </p>
          <Input
            id="otp"
            type="text"
            placeholder="OTP"
            autoComplete="off"
            variant="dark"
            {...register("otp", {
              required: "OTP is required.",
              minLength: {
                value: 6,
                message: "OTP must be 6 digits.",
              },
              maxLength: {
                value: 6,
                message: "OTP must be 6 digits.",
              },
            })}
            error={!!errors.otp}
            hint={errors.otp?.message}
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

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
            Confirm Password
          </p>
          <Input
            id="password_confirmation"
            type="password"
            placeholder="Confirm Password"
            autoComplete="off"
            variant="dark"
            {...register("password_confirmation", {
              required: "Password confirmation is required.",
              validate: (value: string) =>
                value === watch("password") || "Passwords do not match.",
            })}
            error={!!errors.password_confirmation}
            hint={errors.password_confirmation?.message}
          />
        </div>

        <Button
          disabled={loading}
          type="submit"
          className="w-full rounded-full bg-gradient-to-r from-[#f9c86c] to-[#f5a623] py-4 text-base font-semibold text-[#3c0505] shadow-lg shadow-amber-900/40 transition hover:brightness-110 disabled:opacity-70"
        >
          {loading ? (
            "Registering..."
          ) : (
            <span className="flex items-center justify-center gap-2">
              Register
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}

// function VerifyCode({ email }: { email: string }) {
//   const router = useRouter();
//   const [value, setValue] = useState<string>("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const dispatch = useAppDispatch();
//   const [timer, setTimer] = useState(60);
//   const [resendDisabled, setResendDisabled] = useState(true);

//   useEffect(() => {
//     let interval: NodeJS.Timeout | undefined;
//     if (resendDisabled) {
//       interval = setInterval(() => {
//         setTimer((prevTimer) => {
//           if (prevTimer === 1) {
//             clearInterval(interval as NodeJS.Timeout);
//             setResendDisabled(false);
//           }
//           return prevTimer - 1;
//         });
//       }, 1000);
//     }
//     return () => clearInterval(interval as NodeJS.Timeout);
//   }, [resendDisabled]);

//   const resendCode = async () => {
//     setLoading(true);
//     try {
//       const formData = new FormData();
//       const response = await http.resendcode(`/resend-code/${email}`, formData);
//       if (response.status === 200) {
//         toast.success("Code resent to your email!", {
//           description: "Please check your email!",
//         });
//         setTimer(60);
//         setResendDisabled(true);
//       }
//     } catch (err) {
//       console.error("Resend code error:", err);
//       toast.error("Failed to resend code.", {
//         description: "Please try again later.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const registerHandler = async () => {
//     setLoading(true);
//     try {
//       const formData = new FormData();
//       formData.append("email", email);
//       formData.append("code", value);

//       const response = await http.verifycode("/verify-code", formData);

//       if (response.status === 422) {
//         console.log("true", response.data.message);
//         const message = response.data.message;
//         setError(response.data.message);

//         toast.error(message);
//       } else if (response.status === 200) {
//         const { user } = response.data;
//         console.log("user data:", user);
//         dispatch(setToken(response.data.token));
//         dispatch(
//           setUserData({
//             id: user.id,
//             name: user.name,
//             email: user.email,
//             status: user.status,
//             profile_status: user.profile_status,
//           })
//         );

//         toast.success("Register successful!", {
//           description: "Welcome!",
//         });
//         const redirectUrl = "/";
//         router.push(redirectUrl);
//       }
//     } catch (err) {
//       if (axios.isAxiosError(err) && err.response?.data?.message) {
//         toast.error(`${err.response.data.message}`);
//       } else {
//         toast.error("An unknown error occurred.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };
//   return (
//     <div className="my-6 ">
//       <p className="text-center text-sm text-gray-500 my-2">
//         Please enter the one-time password sent to your email.
//       </p>
//       <div className="flex items-center justify-center my-4">
//         <InputOTP maxLength={6} value={value} onChange={setValue}>
//           <InputOTPGroup>
//             <InputOTPSlot index={0} className="p-5" />
//             <InputOTPSeparator />

//             <InputOTPSlot index={1} className="p-5" />
//             <InputOTPSeparator />

//             <InputOTPSlot index={2} className="p-5" />
//             <InputOTPSeparator />

//             <InputOTPSlot index={3} className="p-5" />
//             <InputOTPSeparator />

//             <InputOTPSlot index={4} className="p-5" />
//             <InputOTPSeparator />

//             <InputOTPSlot index={5} className="p-5" />
//           </InputOTPGroup>
//         </InputOTP>
//       </div>

//       <p className="text-center text-sm text-red-500 my-2">{error}</p>
//       <div className="text-center text-sm text-gray-500 my-2">
//         {resendDisabled ? (
//           <p>Resend code in {timer}s</p>
//         ) : (
//           <Button
//             onClick={resendCode}
//             disabled={loading}
//             className="text-black"
//             variant="link"
//           >
//             Resend Code
//           </Button>
//         )}
//       </div>
//       <Button
//         disabled={loading}
//         onClick={registerHandler}
//         className="mt-6 w-full flex justify-center py-6 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
//       >
//         {loading ? "Verifing Code " : "Verify Code"}
//       </Button>
//     </div>
//   );
// }
