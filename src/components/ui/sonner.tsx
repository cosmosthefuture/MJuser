"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";
import "./toast.css";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        style: {
          background: "hsl(48, 26%, 12%)",
          color: "hsl(48, 100%, 91%)",
          border: "1px solid hsl(48, 100%, 25%)",
        },
        classNames: {
          success: "toast-success",
          error: "toast-error",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
