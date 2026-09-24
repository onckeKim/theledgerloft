import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet" | "danger";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-sans font-semibold leading-none transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";
const variants: Record<Variant, string> = {
  primary: "bg-btn text-btn-fg border border-btn hover:bg-btn-hover no-underline",
  secondary: "bg-transparent text-fg border border-fg hover:bg-sunken no-underline",
  quiet: "bg-transparent text-fg underline underline-offset-4 border-0 px-2",
  danger: "bg-transparent text-negative border border-negative hover:bg-sunken no-underline",
};
const sizes: Record<Size, string> = {
  md: "min-h-11 px-6 text-body",
  sm: "min-h-9 px-3 text-body-sm",
};

type StyleProps = { variant?: Variant; size?: Size; block?: boolean };

export function buttonClasses({ variant = "primary", size = "md", block }: StyleProps = {}) {
  return cn(
    base,
    variants[variant],
    variant !== "quiet" && sizes[size],
    variant === "quiet" && "min-h-11",
    block && "w-full",
  );
}

export function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses({ variant, size, block }), className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant,
  size,
  block,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={cn(buttonClasses({ variant, size, block }), className)} {...props} />;
}
