import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import heroConsole from "@/assets/hero-console.jpg";

interface LoginPageProps {
  onLogin: () => void;
  onNavigateToSignup: () => void;
}

export function LoginPage({ onLogin, onNavigateToSignup }: LoginPageProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");

  const handleLogin = () => {
    // Mock authentication - just check if fields are filled
    if (username && password) {
      onLogin();
    }
  };

  const handlePolkadotLogin = () => {
    // Mock Polkadot authentication
    onLogin();
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
        <Card className="w-full max-w-md shadow-elevated border-2 backdrop-blur-sm bg-card/80">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Welcome to Triggr
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Your web3 developer platform
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Username/Password Login */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="transition-all duration-300 focus:shadow-glow"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="transition-all duration-300 focus:shadow-glow"
                />
              </div>
              
              <Button 
                onClick={handleLogin}
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
              >
                Sign In
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

            {/* Polkadot Login */}
            <Button
              onClick={handlePolkadotLogin}
              className="w-full bg-polkadot hover:bg-polkadot/90 text-polkadot-foreground transition-all duration-300 hover:shadow-glow font-medium"
            >
              Login with Polkadot
            </Button>

            {/* Mock Credentials Info */}
            <div className="text-xs text-muted-foreground text-center bg-muted/50 p-3 rounded-md">
              <p className="font-medium mb-1">Demo Credentials:</p>
              <p>Username: admin</p>
              <p>Password: password</p>
            </div>

            {/* Signup Link */}
            <div className="text-center pt-2">
              <button
                onClick={onNavigateToSignup}
                className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 underline-offset-4 hover:underline"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}