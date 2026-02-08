"use client";

import { type InputHTMLAttributes, forwardRef } from "react";

const checkboxBaseClasses =
  "w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-primary focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

export const Checkbox = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={`${checkboxBaseClasses} ${className}`}
      {...props}
    />
  )
);

Checkbox.displayName = "Checkbox";
