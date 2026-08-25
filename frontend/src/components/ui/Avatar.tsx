import { cn } from "@/utils/cn";

interface AvatarProps {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({ name, color = "bg-brand-600", size = "md", className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-white",
        color,
        sizes[size],
        className
      )}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
