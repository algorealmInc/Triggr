interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "sm", className = "" }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Mobile / compact logo (icon only) */}
      <div className="relative block sm:hidden">
        <img
          src="/triggr.png" // icon-only logo
          alt="Triggr"
          className={`${sizeClasses[size]} max-w-[200px] h-auto object-contain`}
        />
      </div>

      {/* Desktop / larger screens (full logo with text) */}
      <div className="relative hidden sm:block">
        <img
          src="/triggr-logo.png" // full logo (icon + text)
          alt="Triggr"
          className="max-w-[200px] h-auto object-contain"
        />
      </div>
    </div>
  );
}
