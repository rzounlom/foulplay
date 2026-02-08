"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "primary-destructive"
  | "secondary-destructive"
  | "tertiary-destructive"
  | "success"
  | "outline-primary"
  | "outline-success"
  | "outline-destructive"
  | "outline-info";

export type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<
  ButtonVariant,
  string
> = {
  primary:
    "bg-primary text-white border border-transparent shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  secondary:
    "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400",
  tertiary:
    "bg-transparent text-neutral-700 dark:text-neutral-200 border border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400",
  "primary-destructive":
    "bg-red-600 text-white border border-transparent shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500",
  "secondary-destructive":
    "bg-white dark:bg-neutral-800 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 shadow-sm hover:bg-red-50 dark:hover:bg-red-950/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500",
  "tertiary-destructive":
    "bg-transparent text-red-600 dark:text-red-400 border border-transparent hover:bg-red-50 dark:hover:bg-red-950/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500",
  success:
    "bg-emerald-600 text-white border border-transparent shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
  "outline-primary":
    "bg-transparent text-primary border border-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  "outline-success":
    "bg-transparent text-emerald-600 dark:text-emerald-400 border border-emerald-500 dark:border-emerald-600 hover:bg-emerald-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
  "outline-destructive":
    "bg-transparent text-red-600 dark:text-red-400 border border-red-500 dark:border-red-600 hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500",
  "outline-info":
    "bg-transparent text-sky-600 dark:text-sky-400 border border-sky-500 dark:border-sky-500 hover:bg-sky-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs font-medium rounded-md",
  md: "px-4 py-2 text-sm font-medium rounded-lg",
  lg: "px-5 py-2.5 text-sm font-medium rounded-lg",
};

const disabledStyles =
  "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /** Optional: show full width */
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center gap-2 transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin w-4 h-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
