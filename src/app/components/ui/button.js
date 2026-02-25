 
"use client";

import { forwardRef } from "react";
import { cn } from "../../lib/utils";  

const Button = forwardRef(
  ({ variant = "default", size = "default", className, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500";

    const variants = {
      default: "bg-[#249B73] text-white hover:bg-[#249B73] disabled:bg-green-300 disabled:cursor-not-allowed",
      outline:
        "border border-gray-300 text-gray-700 bg-transparent hover:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed",
      ghost:
        "text-gray-700 bg-transparent hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed",
      icon: "bg-transparent hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed",
    };

    const sizes = {
      default: "px-4 py-2 text-sm",
      sm: "px-3 py-1.5 text-xs",
      icon: "h-8 w-8",
    };

    const computedStyles = cn(
      baseStyles,
      variants[variant],
      sizes[size],
      disabled && "opacity-75",
      className
    );

    return (
      <button
        ref={ref}
        className={computedStyles}
        disabled={disabled}
        aria-disabled={disabled ? "true" : undefined}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
 