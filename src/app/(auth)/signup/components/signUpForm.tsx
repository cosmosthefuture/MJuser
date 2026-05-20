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
  password: string;
  password_confirmation: string;
  agent_code?: string;
};
type Errors = {
  phone_number?: string[];
  name?: string[];
  username?: string[];
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
        toast.error("注册失败。", {
          description: apiErrors.password
            ? apiErrors.password[0]
            : apiErrors.phone_number
              ? apiErrors.phone_number[0]
              : apiErrors.username
                ? apiErrors.username[0]
                  : apiErrors.name
                  ? apiErrors.name[0]
                  : "请检查您的信息并重试。",
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
        toast.success("注册成功！", {
          description: response.data.response?.message || "账号已创建。",
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
      toast.error("注册失败。", {
        description: "请稍后再试。",
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
            姓名
          </p>
          <div className="flex-1">
            <Input
              id="name"
              type="text"
              placeholder="姓名"
              autoComplete="off"
              variant="casino"
              {...register("name", {
                required: "请填写姓名。",
              })}
              error={!!errors.name}
              hint={errors.name?.message}
              className="auth-input-light h-[2.6rem] rounded-[13px] border-[#cfc0a0] bg-white px-3.5 py-2 text-[14px] font-medium text-[#4f3517] shadow-none selection:bg-[#d7a64b] selection:text-[#fffaf0] focus:border-[#b98736] focus:bg-white placeholder:text-[#c7b289]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
            用户
          </p>
          <div className="flex-1">
            <Input
              id="username"
              type="text"
              placeholder="用户名"
              autoComplete="username"
              variant="casino"
              {...register("username", {
                required: "请填写用户名。",
              })}
              error={!!errors.username}
              hint={errors.username?.message}
              className="auth-input-light h-[2.6rem] rounded-[13px] border-[#cfc0a0] bg-white px-3.5 py-2 text-[14px] font-medium text-[#4f3517] shadow-none selection:bg-[#d7a64b] selection:text-[#fffaf0] focus:border-[#b98736] focus:bg-white placeholder:text-[#c7b289]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
            电话
          </p>
          <div className="flex-1">
            <Input
              id="phone_number"
              type="tel"
              inputMode="numeric"
              placeholder="电话号码"
              autoComplete="tel"
              variant="casino"
              className="auth-input-light h-[2.6rem] rounded-[13px] border-[#cfc0a0] bg-white px-3.5 py-2 text-[14px] font-medium text-[#4f3517] shadow-none selection:bg-[#d7a64b] selection:text-[#fffaf0] focus:border-[#b98736] focus:bg-white placeholder:text-[#c7b289]"
              {...register("phone_number", {
                required: "请填写电话号码。",
                minLength: {
                  value: 6,
                  message: "请输入有效的电话号码。",
                },
              })}
              error={!!errors.phone_number}
              hint={errors.phone_number?.message}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
            代理
          </p>
          <div className="flex-1">
            <Input
              id="agent_code"
              type="text"
              placeholder="代理代码（可选）"
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

        <div className="flex items-center gap-2.5">
          <p className="w-[5.25rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[#89652e]">
            确认
          </p>
          <div className="flex-1">
            <Input
              id="password_confirmation"
              type="password"
              placeholder="确认密码"
              autoComplete="off"
              variant="casino"
              {...register("password_confirmation", {
                required: "请再次输入密码以确认。",
                validate: (value: string) =>
                  value === getValues("password") || "两次输入的密码不一致。",
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
        {loading ? "注册中..." : "注册"}
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
