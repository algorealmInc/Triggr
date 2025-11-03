import { useState } from "react";
import { ArrowLeft, Database, Zap, Menu, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { DatabasePage } from "./database-page";
import { TriggersPage } from "./triggers-page";
import { ProjectSettingsPage } from "./project-settings-page";
import { Footer } from "@/components/footer";
import { useIsMobile } from "@/hooks/use-mobile";

interface Project {
  id: string;
  name: string;
  contractNodeAddress: string;
  contractHash: string;
  description?: string;
  createdAt: Date;
}

interface ProjectLayoutProps {
  project: Project;
  onBack: () => void;
}

type ActivePage = "database" | "triggers" | "settings";

export function ProjectLayout({ project, onBack }: ProjectLayoutProps) {
  const isMobile = useIsMobile();
  const [activePage, setActivePage] = useState<ActivePage>("database");
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  const navigationItems = [
    {
      id: "database" as const,
      label: "Database",
      icon: Database,
      description: "Manage collections and documents",
    },
    {
      id: "triggers" as const,
      label: "Triggers",
      icon: Zap,
      description: "Deploy and manage rules",
    },
    {
      id: "settings" as const,
      label: "Project Settings",
      icon: Settings,
      description: "Configuration and API keys",
    },
  ];

  const renderContent = () => {
    switch (activePage) {
      case "database":
        return <DatabasePage project={project} />;
      case "triggers":
        return <TriggersPage project={project} />;
      case "settings":
        return <ProjectSettingsPage project={project} />;
      default:
        return <DatabasePage project={project} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <div className="flex flex-1">
        {/* Mobile Overlay */}
        {isMobile && isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`${
            isMobile 
              ? `fixed inset-y-0 left-0 z-50 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`
              : isSidebarOpen ? "w-64" : "w-16"
          } bg-card border-r border-border transition-all duration-300 flex flex-col`}
        >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className={`${isSidebarOpen ? "block" : "hidden"} space-y-1`}>
              <h2 className="font-semibold text-lg truncate">{project.name}</h2>
              <p className="text-xs text-muted-foreground">Project Console</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex-shrink-0"
            >
              {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = activePage === item.id;
              const Icon = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 text-left ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-primary-foreground" : ""}`} />
                  {isSidebarOpen && (
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className={`text-xs ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {item.description}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={onBack}
              className={`${isSidebarOpen ? "w-full justify-start" : "w-auto"} transition-all duration-300`}
            >
              <ArrowLeft className="h-4 w-4" />
              {isSidebarOpen && <span className="ml-2">Back to Dashboard</span>}
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="bg-card/50 backdrop-blur-sm border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold capitalize truncate">{activePage}</h1>
                  <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                    {navigationItems.find(item => item.id === activePage)?.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}