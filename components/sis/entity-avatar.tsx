"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarColor, initials } from "@/lib/sis/format";
import { cn } from "@/lib/utils";

/** Initials avatar in a stable brand color; courses and groups render as a rounded square. */
export function EntityAvatar({
  name,
  seed,
  src,
  kind = "person",
  size = "md",
  className,
}: {
  name?: string | null;
  seed?: string | number | null;
  src?: string | null;
  kind?: "person" | "course" | "group";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dims = {
    xs: "size-5 text-[9px]",
    sm: "size-6 text-[10px]",
    md: "size-8 text-xs",
    lg: "size-10 text-sm",
    xl: "size-14 text-lg",
  }[size];
  const shape = kind === "person" ? "rounded-full" : "rounded-md";
  const color = avatarColor(seed ?? name);
  return (
    <Avatar className={cn(dims, shape, "shrink-0", className)}>
      {src ? <AvatarImage src={src} alt={name ?? ""} /> : null}
      <AvatarFallback
        className={cn(shape, "font-semibold text-white")}
        style={{ backgroundColor: color }}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
