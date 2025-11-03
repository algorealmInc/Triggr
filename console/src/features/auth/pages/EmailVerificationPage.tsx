import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { useClerkAuth } from "../services/clerkAuth";
import { useToast } from "@/hooks/use-toast";

export default function EmailVerificationPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { verifyEmail, resendVerificationCode } = useClerkAuth();

  // Get email from navigation state
  const email = location.state?.email || "your email";

  // Refs for input fields
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newCode.every((digit) => digit !== "") && index === 5) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle paste
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, "").slice(0, 6).split("");
        const newCode = [...code];
        digits.forEach((digit, i) => {
          if (i < 6) newCode[i] = digit;
        });
        setCode(newCode);
        if (digits.length === 6) {
          handleVerify(newCode.join(""));
        }
      });
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join("");

    if (codeToVerify.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter all 6 digits",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const result = await verifyEmail(codeToVerify);
    setIsLoading(false);

    if (result?.success) {
      toast({
        title: "Email verified! 🎉",
        description: "Your account has been verified successfully.",
      });
      // Navigation handled by auth hook
    } else {
      toast({
        title: "Verification failed",
        description: result?.error || "Invalid verification code",
        variant: "destructive",
      });
      // Clear code on error
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    const result = await resendVerificationCode();
    setIsResending(false);

    if (result?.success) {
      toast({
        title: "Code sent!",
        description: "A new verification code has been sent to your email.",
      });
      setCanResend(false);
      setCountdown(60);
    } else {
      toast({
        title: "Failed to resend",
        description: result?.error || "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="absolute top-6 left-6 z-20">
        <Logo size="sm" />
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Back button */}
          <button
            onClick={() => navigate("/sign-up")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign up
          </button>

          <div className="bg-white rounded-lg border shadow-sm p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a verification code to
              </p>
              <p className="text-sm font-medium text-foreground mt-1">
                {email}
              </p>
            </div>

            {/* Code inputs */}
            <div className="mb-6">
              <div className="flex gap-2 justify-center mb-2">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-lg font-semibold"
                    disabled={isLoading}
                  />
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Enter the 6-digit code from your email
              </p>
            </div>

            {/* Verify button */}
            <Button
              onClick={() => handleVerify()}
              className="w-full h-11 font-semibold mb-4"
              disabled={isLoading || code.some((d) => d === "")}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify email"
              )}
            </Button>

            {/* Resend code */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              {canResend ? (
                <Button
                  onClick={handleResend}
                  variant="ghost"
                  className="text-primary hover:text-primary/90"
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Resend code"
                  )}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Resend code in {countdown}s
                </p>
              )}
            </div>

            {/* Help text */}
            <div className="mt-6 pt-6 border-t">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground text-center">
                  💡 <strong>Tip:</strong> Check your spam folder if you don't
                  see the email. The code expires in 10 minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
