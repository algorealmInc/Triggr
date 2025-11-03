import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import heroConsole from "@/assets/hero-console.jpg";

interface SignupPageProps {
  onSignup: () => void;
  onNavigateToLogin: () => void;
}

export function SignupPage({ onSignup, onNavigateToLogin }: SignupPageProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = () => {
    if (validateForm()) {
      toast({
        title: "Welcome to Triggr! 🎉",
        description: "Your account has been created successfully.",
      });
      onSignup();
    }
  };

  const handlePolkadotSignup = () => {
    toast({
      title: "Welcome to Triggr! 🎉",
      description: "Successfully signed up with Polkadot.",
    });
    onSignup();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSignup();
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-subtle">
      {/* Background Hero Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 dark:opacity-10"
        style={{ backgroundImage: `url(${heroConsole})` }}
      />
      
      {/* Header with Theme Toggle */}
      <header className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative z-10 p-8">
        <Card className="w-full max-w-md shadow-elevated border-2 backdrop-blur-sm bg-card/80 animate-fade-in">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Create Your Account
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Join Triggr and start building
            </p>
          </CardHeader>
          
          <CardContent className="space-y-5">
            {/* Signup Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrors({ ...errors, username: "" });
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter username"
                  className="transition-all duration-300 focus:shadow-glow"
                />
                {errors.username && (
                  <p className="text-sm text-destructive animate-fade-in">{errors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors({ ...errors, email: "" });
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter email"
                  className="transition-all duration-300 focus:shadow-glow"
                />
                {errors.email && (
                  <p className="text-sm text-destructive animate-fade-in">{errors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors({ ...errors, password: "" });
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter password"
                  className="transition-all duration-300 focus:shadow-glow"
                />
                {errors.password && (
                  <p className="text-sm text-destructive animate-fade-in">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors({ ...errors, confirmPassword: "" });
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Confirm password"
                  className="transition-all duration-300 focus:shadow-glow"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive animate-fade-in">{errors.confirmPassword}</p>
                )}
              </div>
              
              <Button 
                onClick={handleSignup}
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
              >
                Sign Up
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Polkadot Signup */}
            <Button
              onClick={handlePolkadotSignup}
              className="w-full bg-polkadot hover:bg-polkadot/90 text-polkadot-foreground transition-all duration-300 hover:shadow-glow font-medium"
            >
              Sign up with Polkadot
            </Button>

            {/* Login Link */}
            <div className="text-center pt-2">
              <button
                onClick={onNavigateToLogin}
                className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 underline-offset-4 hover:underline"
              >
                Already have an account? Log in
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
