import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { Check, Github } from "lucide-react";
import { useClerkAuth } from "../services/clerkAuth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signUpWithEmail, signUpWithGoogle, signUpWithGithub } =
    useClerkAuth();
  const { toast } = useToast();
  const { isLoaded, isSignedIn } = useAuth();

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Show loading state while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only redirect after Clerk has loaded AND user is signed in
  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (
      !hasMinLength ||
      !hasUppercase ||
      !hasLowercase ||
      !hasNumber ||
      !hasSpecialChar
    ) {
      newErrors.password = "Password does not meet requirements";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    const result = await signUpWithEmail(email, password);
    setIsLoading(false);

    if (result?.success) {
      toast({
        title: "Welcome to Triggr! 🎉",
        description: "Your account has been created successfully.",
      });
      // Navigation handled by auth hook
    } else if (result?.needsVerification) {
      // Handle email verification flow
      toast({
        title: "Verify your email",
        description: "Please check your email for a verification code.",
      });
      // You might want to navigate to a verification page here
    } else {
      toast({
        title: "Sign up failed",
        description: result?.error || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    await signUpWithGoogle();
  };

  const handleGithubSignup = async () => {
    setIsLoading(true);
    await signUpWithGithub();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSignup();
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <header className="absolute top-6 left-6 z-20">
        <Logo size="sm" />
      </header>

      <div className="hidden lg:flex lg:w-1/2 p-8 xl:p-12 items-center bg-primary/5">
        <div className="max-w-xl">
          <div className="mb-8">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-4">
              <span className="text-sm font-semibold text-primary">
                Web3 Developer Platform
              </span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Start building with Triggr Console
            </h1>
            <p className="text-lg text-muted-foreground">
              Join developers building the future of web3 applications
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-3">
              <div className="mt-1">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">
                  Try it free for 30 days with $200 in trial credits
                </h3>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Start building instantly</h3>
                <p className="text-sm text-muted-foreground">
                  Deploy Triggr smart contracts effortlessly and start building
                  web3 applications in minutes.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Scale cost-efficiently</h3>
                <p className="text-sm text-muted-foreground">
                  Handle millions of transactions with no surprise overages.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Integrate seamlessly</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with Polkadot, Substrate, and your preferred tools.
                  Visualize in Grafana or your preferred tool.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Enhance observability</h3>
                <p className="text-sm text-muted-foreground">
                  Optimize complex queries with recording rules, execute
                  alerting rules automatically, and receive immediate
                  notifications when issues arise.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-card">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Create your account
            </h2>
            <p className="text-sm text-muted-foreground">
              Get started with Triggr Console
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors({ ...errors, email: "" });
                }}
                onKeyPress={handleKeyPress}
                placeholder="you@example.com"
                className="h-11"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive animate-fade-in">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors({ ...errors, password: "" });
                }}
                onKeyPress={handleKeyPress}
                placeholder="••••••••••••••"
                className="h-11"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive animate-fade-in">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Password Requirements */}
            {password && (
              <div className="text-sm space-y-2 pt-2">
                <p className="font-medium text-muted-foreground mb-2">
                  Password requirements:
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-4 w-4 rounded-full flex items-center justify-center ${
                        hasMinLength
                          ? "bg-primary"
                          : "bg-muted border border-border"
                      }`}
                    >
                      {hasMinLength && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span
                      className={
                        hasMinLength
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      at least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-4 w-4 rounded-full flex items-center justify-center ${
                        hasUppercase && hasLowercase
                          ? "bg-primary"
                          : "bg-muted border border-border"
                      }`}
                    >
                      {hasUppercase && hasLowercase && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span
                      className={
                        hasUppercase && hasLowercase
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      1 uppercase letter, 1 lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-4 w-4 rounded-full flex items-center justify-center ${
                        hasNumber && hasSpecialChar
                          ? "bg-primary"
                          : "bg-muted border border-border"
                      }`}
                    >
                      {hasNumber && hasSpecialChar && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span
                      className={
                        hasNumber && hasSpecialChar
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      1 number and 1 special character
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleSignup}
              className="w-full h-11 font-semibold"
              variant="default"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              onClick={handleGoogleSignup}
              variant="outline"
              className="w-full h-11 font-semibold"
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google
            </Button>

            <Button
              onClick={handleGithubSignup}
              variant="outline"
              className="w-full h-11 font-semibold"
              disabled={isLoading}
            >
              <Github className="w-5 h-5 mr-2" />
              Sign up with GitHub
            </Button>

            <div className="text-center pt-2">
              <span className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/sign-in")}
                  className="text-primary hover:underline"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-4">
              By signing up you are agreeing to the Triggr Console Terms of
              Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
