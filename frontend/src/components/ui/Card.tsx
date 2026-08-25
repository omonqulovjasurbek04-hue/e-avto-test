import React from "react";
import { cn } from "../../utils/cn";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-all duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pb-3", className)} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-bold tracking-tight text-slate-900 dark:text-white", className)}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-slate-500 dark:text-slate-400 mt-1", className)} {...props}>
      {children}
    </p>
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-3", className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center p-6 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = "CardFooter";
