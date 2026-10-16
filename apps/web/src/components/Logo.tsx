type LogoProps = {
  variant?: "full" | "mark";
  className?: string;
};

/** Adaptive mark + wordmark — colors from CSS variables (--logo-*). */
export function Logo({ variant = "full", className }: LogoProps) {
  return (
    <div className={`logo ${className ?? ""}`} aria-label="Livlyf">
      <svg className="logo__mark" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect className="logo__tile" width="48" height="48" rx="14" />
        <path
          className="logo__pulse"
          d="M10 32c6-14 14-20 24-20 4 0 8 1 11 3"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path className="logo__l" d="M16 12v22h14" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle className="logo__dot" cx="34" cy="14" r="3" />
      </svg>
      {variant === "full" && <span className="logo__word">livlyf</span>}
    </div>
  );
}
