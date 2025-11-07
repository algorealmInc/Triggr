import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card/50 backdrop-blur-sm py-6 px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex justify-center items-center gap-3">
        <Logo size="sm" />
        <p className="text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} Algorealm, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
