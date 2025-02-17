import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  // You can optionally get darkMode from props or context.
  // For demonstration, suppose we pass a prop `isDark` to override the background:
  const { isDark } = props; // if you pass isDark={true} when in dark mode
  const darkBgStyle = isDark ? { backgroundColor: "#3a3a3a" } : {};
  
  return (
    <input
      type={type}
      style={darkBgStyle}
      className={cn(
        "flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 py-1 text-base shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-neutral-800 dark:bg-[#3a3a3a] dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300 dark:text-white",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
