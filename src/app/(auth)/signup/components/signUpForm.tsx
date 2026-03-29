"use client";
import { useState, useEffect } from "react";
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
  name: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  agent_code?: string;
};
type Errors = {
  phone_number?: string[];
  name?: string[];
  username?: string[];
  email?: string[];
  password?: string[];
  password_confirmation?: string[];
  agent_code?: string[];
};

export default function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const {
    register,
    setError,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    reValidateMode: "onChange",
  });

  const onSubmit: SubmitHandler<SignUpFormValues> = async (data) => {
    setLoading(true);
    try {
      console.log("Signup: Attempting to get FCM token...");
      const fcmToken = await fcmService.initializeToken();
      console.log("Signup: FCM token result:", fcmToken);

      const payload = {
        phone_number: data.phone_number,
        name: data.name,
        username: data.username,
        email: data.email,
        password: data.password,
        password_confirmation: data.password_confirmation,
        ...(data.agent_code ? { agent_code: data.agent_code } : {}),
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
              : apiErrors.username
                ? apiErrors.username[0]
                : apiErrors.email
                  ? apiErrors.email[0]
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
    <form
      className="space-y-3"
      onSubmit={handleSubmit(onSubmit)}
      action="#"
      method="POST"
    >
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
            Name
          </p>
          <div className="flex-1">
            <Input
              id="name"
              type="text"
              placeholder="Name"
              autoComplete="off"
              variant="casino"
              {...register("name", {
                required: "Name is required.",
              })}
              error={!!errors.name}
              hint={errors.name?.message}
              className="auth-input-light h-[2.6rem] rounded-[13px] border-[#cfc0a0] bg-white px-3.5 py-2 text-[14px] font-medium text-[#4f3517] shadow-none selection:bg-[#d7a64b] selection:text-[#fffaf0] focus:border-[#b98736] focus:bg-white placeholder:text-[#c7b289]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
            User
          </p>
          <div className="flex-1">
            <Input
              id="username"
              type="text"
              placeholder="Username"
              autoComplete="username"
              variant="casino"
              {...register("username", {
                required: "Username is required.",
              })}
              error={!!errors.username}
              hint={errors.username?.message}
              className="auth-input-light h-[2.6rem] rounded-[13px] border-[#cfc0a0] bg-white px-3.5 py-2 text-[14px] font-medium text-[#4f3517] shadow-none selection:bg-[#d7a64b] selection:text-[#fffaf0] focus:border-[#b98736] focus:bg-white placeholder:text-[#c7b289]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
            Email
          </p>
          <div className="flex-1">
            <Input
              id="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              variant="casino"
              {...register("email", {
                required: "Email is required.",
              })}
              error={!!errors.email}
              hint={errors.email?.message}
              className="auth-input-light h-[2.6rem] rounded-[13px] border-[#cfc0a0] bg-white px-3.5 py-2 text-[14px] font-medium text-[#4f3517] shadow-none selection:bg-[#d7a64b] selection:text-[#fffaf0] focus:border-[#b98736] focus:bg-white placeholder:text-[#c7b289]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
            Phone
          </p>
          <div className="flex-1">
            <Input
              id="phone_number"
              type="tel"
              inputMode="numeric"
              placeholder="Phone Number"
              autoComplete="tel"
              variant="casino"
              className="auth-input-light h-[2.6rem] rounded-[13px] border-[#cfc0a0] bg-white px-3.5 py-2 text-[14px] font-medium text-[#4f3517] shadow-none selection:bg-[#d7a64b] selection:text-[#fffaf0] focus:border-[#b98736] focus:bg-white placeholder:text-[#c7b289]"
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

        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
            Agent
          </p>
          <div className="flex-1">
            <Input
              id="agent_code"
              type="text"
              placeholder="Agent Code (Optional)"
              autoComplete="off"
              variant="casino"
              {...register("agent_code")}
              error={!!errors.agent_code}
              hint={errors.agent_code?.message}
              className="auth-input-light h-[2.6rem] rounded-[13px] border-[#cfc0a0] bg-white px-3.5 py-2 text-[14px] font-medium text-[#4f3517] shadow-none selection:bg-[#d7a64b] selection:text-[#fffaf0] focus:border-[#b98736] focus:bg-white placeholder:text-[#c7b289]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
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
              className="auth-input-light h-[2.6rem] rounded-[13px] border-[#cfc0a0] bg-white px-3.5 py-2 text-[14px] font-medium text-[#4f3517] shadow-none selection:bg-[#d7a64b] selection:text-[#fffaf0] focus:border-[#b98736] focus:bg-white placeholder:text-[#c7b289]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
            Confirm
          </p>
          <div className="flex-1">
            <Input
              id="password_confirmation"
              type="password"
              placeholder="Confirm Password"
              autoComplete="off"
              variant="casino"
              {...register("password_confirmation", {
                required: "Password confirmation is required.",
                validate: (value: string) =>
                  value === getValues("password") || "Passwords do not match.",
              })}
              error={!!errors.password_confirmation}
              hint={errors.password_confirmation?.message}
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
        {loading ? "Registering..." : "Register"}
      </Button>
    </form>
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
