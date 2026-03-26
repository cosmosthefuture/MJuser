import React from "react";

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-amber-200">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-200/60 border-t-amber-100 shadow-[0_0_20px_rgba(255,214,102,0.35)]" />
    </div>
  );
}
