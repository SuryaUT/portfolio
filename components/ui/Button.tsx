import { type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";
import Link from "next/link";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
  external?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-jetbrains text-xs uppercase tracking-widest transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent/90 active:scale-[0.98]",
  outline:
    "border border-ink text-ink hover:bg-ink hover:text-bg active:scale-[0.98]",
  ghost: "text-ink-muted hover:text-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-4 text-[0.6875rem]",
  md: "h-10 px-6",
  lg: "h-12 px-8",
};

function classes(variant: Variant = "primary", size: Size = "md") {
  return `${base} ${variants[variant]} ${sizes[size]}`;
}

export function Button({ variant, size, className = "", ...props }: ButtonProps) {
  return (
    <button className={`${classes(variant, size)} ${className}`} {...props} />
  );
}

export function LinkButton({
  href,
  variant,
  size,
  external,
  className = "",
  children,
  ...props
}: LinkButtonProps) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${classes(variant, size)} ${className}`}
        {...props}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={`${classes(variant, size)} ${className}`} {...props}>
      {children}
    </Link>
  );
}
