import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  hint?: string;
}

const Input2 = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, hint, ...props }, ref) => {
    const inputId =
      props.id ||
      `input-${props.placeholder?.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <div className="">
        <input
          id={inputId}
          type={type}
          ref={ref}
          autoComplete="off"
          className={cn(
            "peer block w-full appearance-none rounded-lg border bg-white p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-0 autofill:pt-6 autofill:pb-2 autofill:leading-tight autofill:scale-100 autofill:bg-white",
            error
              ? "border-red-500 focus:border-red-500 dark:border-red-500 dark:focus:border-red-500"
              : "border-gray-300 focus:border-green-400 dark:border-gray-600 dark:focus:border-green-400",
            "dark:text-white",
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

Input2.displayName = "Input2";

export { Input2 };
