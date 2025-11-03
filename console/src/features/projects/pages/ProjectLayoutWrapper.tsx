import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Database, Zap, Menu, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Logo } from "@/components/logo";
import { useConsoleService } from "@/lib/api/console.service";
import { LoadingFallback } from "@/app/routes/AppRoutes";

interface ProjectLayoutWrapperProps {
  children: React.ReactNode;
}

interface Project {
  id: string;
  name: string;
  contractNodeAddress: string;
  contractHash: string;
  description?: string;
  createdAt: Date;
}

type PageType = "database" | "triggers" | "settings";

export function ProjectLayoutWrapper({ children }: ProjectLayoutWrapperProps) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const projectQuery = useConsoleService().useGetProject(projectId);
  const project = projectQuery?.data?.project ?? [];
  const projectName = project.id

  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  const getActivePage = (): PageType => {
    const path = location.pathname;
    if (path.includes("/database")) return "database";
    if (path.includes("/triggers")) return "triggers";
    if (path.includes("/settings")) return "settings";
    return "database";
  };

  const activePage = getActivePage();

  const navigationItems = [
    {
      id: "database" as const,
      label: "Database",
      icon: Database,
      description: "Manage collections and documents",
      path: `/projects/${projectId}/database`,
    },
    {
      id: "triggers" as const,
      label: "Triggers",
      icon: Zap,
      description: "Deploy and manage rules",
      path: `/projects/${projectId}/triggers`,
    },
    {
      id: "settings" as const,
      label: "Project Settings",
      icon: Settings,
      description: "Configuration and API keys",
      path: `/projects/${projectId}/settings`,
    },
  ];

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
                    <h2 className="font-semibold text-base truncate">
                      {projectName}
                    </h2>
                    <p className="text-xs text-muted-foreground text-[11px]">
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
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) setIsSidebarOpen(false);
                    }}
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
                  <h1 className="text-lg md:text-xl font-bold capitalize truncate">
                    {activePage}
                  </h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
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
            {!projectQuery.isLoading && children}
          </main>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
