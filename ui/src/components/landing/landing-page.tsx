import { Button } from "@/components/ui/button";
import { HeroSection } from "./hero-section";
import { Database } from "lucide-react";

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">Triggr</span>
          </div>
          
          <div className="flex items-center gap-6">
            <a href="#docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </a>
            <Button variant="ghost" size="sm">Sign In</Button>
            <Button size="sm">Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="pt-16">
        <HeroSection />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border bg-card/50 backdrop-blur-sm py-4 px-6 mt-auto">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-muted-foreground text-center">
            Copyright &copy; 2025 Algorealm, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};