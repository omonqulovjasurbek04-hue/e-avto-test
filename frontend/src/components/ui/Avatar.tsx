import { useState } from "react";
import { cn } from "@/utils/cn";
import { assetUrl } from "@/utils/assetUrl";

interface AvatarProps {
  name: string;
  /** Profile photo; the initials show while it is missing or fails to load. */
  src?: string | null;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({ name, src, color = "bg-brand-600", size = "md", className }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const url = assetUrl(src);
  const showPhoto = Boolean(url) && failed !== url;
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        !showPhoto && color,
        sizes[size],
        className
      )}
      aria-label={name}
    >
      {showPhoto ? (
        <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setFailed(url ?? null)} />
      ) : (
        initials
      )}
    </div>
  );
}
