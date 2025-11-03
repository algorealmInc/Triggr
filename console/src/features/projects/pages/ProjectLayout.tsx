import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Database, Zap, Menu, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatabasePage } from "../components/database-page";
import { TriggersPage } from "../components/triggers-page";
import { ProjectSettingsPage } from "../components/project-settings-page";
import { Footer } from "@/components/footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Logo } from "@/components/logo";
import { useConsoleService } from "@/lib/api/console.service";
import { LoadingFallback } from "@/app/routes/AppRoutes";

interface Project {
  id: string;
  name: string;
  contractNodeAddress: string;
  contractHash: string;
  description?: string;
  createdAt: Date;
}

type ActivePage = "database" | "triggers" | "settings";

export default function ProjectLayout() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Get project from route state or use mock data
  const projectQuery = useConsoleService().useGetProject(projectId);
  const project = projectQuery?.data?.project ?? [];

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

  if (projectQuery.isLoading) {
    return <LoadingFallback />;
  }

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
              ? `fixed inset-y-0 left-0 z-50 ${
                  isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`
              : isSidebarOpen
              ? "w-64"
              : "w-20"
          } bg-card border-r border-border transition-all duration-300 flex flex-col`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              {isSidebarOpen ? (
                <>
                  <div className="space-y-1 min-w-0 flex-1">
                    <h2 className="font-semibold text-lg truncate">
                      {project.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Project Console
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="w-full flex flex-col items-center gap-3">
                  <Logo size="sm" showText={false} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarOpen(true)}
                    className="flex-shrink-0"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
                    className={`w-full flex items-center ${
                      isSidebarOpen ? "space-x-3 px-3" : "justify-center px-2"
                    } py-2.5 rounded-lg transition-all duration-300 text-left ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    title={!isSidebarOpen ? item.label : undefined}
                  >
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 ${
                        isActive ? "text-primary-foreground" : ""
                      }`}
                    />
                    {isSidebarOpen && (
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{item.label}</div>
                        <div
                          className={`text-xs ${
                            isActive
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}
                        >
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
              onClick={() => navigate("/")}
              className={`${
                isSidebarOpen ? "w-full justify-start" : "w-full justify-center"
              } transition-all duration-300`}
              title={!isSidebarOpen ? "Back to Dashboard" : undefined}
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
                  <h1 className="text-xl md:text-2xl font-bold capitalize truncate">
                    {activePage}
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                    {
                      navigationItems.find((item) => item.id === activePage)
                        ?.description
                    }
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            {!projectQuery.isLoading && renderContent()}
          </main>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
