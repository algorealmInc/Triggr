export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card/50 backdrop-blur-sm py-4 px-6 mt-auto">
      <div className="max-w-7xl mx-auto">
        <p className="text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} Algorealm, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
