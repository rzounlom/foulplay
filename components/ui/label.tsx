"use client";

import { type LabelHTMLAttributes, forwardRef } from "react";

const baseClasses =
  "block text-sm font-medium text-neutral-700 dark:text-neutral-300";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Optional red asterisk for required fields */
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = "", required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={`${baseClasses} ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
);

Label.displayName = "Label";
