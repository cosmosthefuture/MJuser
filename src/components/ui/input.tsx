import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  hint?: string;
  variant?: "default" | "dark";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, hint, variant = "default", ...props }, ref) => {
    const inputId =
      props.id ||
      `input-${props.placeholder?.toLowerCase().replace(/\s+/g, "-")}`;
    // const placeholder = props.placeholder;
    const internalPlaceholder = " ";
    const isDark = variant === "dark";

    const baseInputClasses =
      "peer block w-full appearance-none border px-3 py-3 text-sm focus:outline-none focus:ring-0 ";
    // const lightInputClasses = "rounded-lg text-gray-900 border-gray-300 focus:border-green-400 dark:border-gray-600 dark:focus:border-green-400 dark:text-white";
    const darkInputClasses =
      "rounded-2xl text-amber-100 border-white/30 bg-white/5 focus:border-amber-300 focus:bg-white/10 placeholder:text-amber-100/60";

    return (
      <div className="">
        <input
          id={inputId}
          type={type}
          ref={ref}
          placeholder={internalPlaceholder}
          autoComplete="off"
          className={cn(
            baseInputClasses,
            isDark ? darkInputClasses : darkInputClasses,
            error &&
              (isDark
                ? "border-red-400 focus:border-red-400"
                : "border-red-500 focus:border-red-500"),
            className
          )}
          {...props}
        />

        {error && hint && (
          <p
            className={`mt-1.5 text-xs ${
              error ? "text-red-500" : "text-gray-500"
            }`}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
