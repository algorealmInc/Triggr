import { Zap } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({
  size = "sm",
  showText = true,
  className = "",
}: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
        <div className="relative bg-primary rounded-lg p-1.5 shadow-lg">
          <Zap
            className={`${sizeClasses[size]} text-primary-foreground fill-primary-foreground`}
          />
        </div>
      </div>
      {showText && (
        <span
          className={`font-bold ${textSizeClasses[size]} bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent`}
        >
          Triggr
        </span>
      )}
    </div>
  );
}
