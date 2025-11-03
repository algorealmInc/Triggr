import { useState } from "react";
import { Plus, Trash2, User, CreditCard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { CreateProjectModal } from "./create-project-modal";
import { DeleteProjectDialog } from "./delete-project-dialog";

interface Project {
  id: string;
  name: string;
  contractNodeAddress: string;
  contractHash: string;
  description?: string;
  createdAt: Date;
}

interface DashboardProps {
  onLogout: () => void;
  onSelectProject: (project: Project) => void;
  onNavigateToProfile: () => void;
  onNavigateToBilling: () => void;
}

export function Dashboard({ onLogout, onSelectProject, onNavigateToProfile, onNavigateToBilling }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const handleCreateProject = (projectData: Omit<Project, "id" | "createdAt">) => {
    const newProject: Project = {
      ...projectData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
    };
    setProjects(prev => [...prev, newProject]);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
  };

  const confirmDeleteProject = () => {
    if (projectToDelete) {
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Triggr Console
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={onNavigateToProfile}>
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onNavigateToBilling}>
              <CreditCard className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Your Projects</h2>
          <p className="text-muted-foreground">
            Manage your web3 applications and smart contracts
          </p>
        </div>

        {/* Create Project Button */}
        <div className="mb-8">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-105"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card className="text-center py-12 shadow-elevated">
            <CardContent>
              <div className="text-muted-foreground text-lg mb-4">
                No projects yet
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Get started by creating your first project
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                variant="outline"
                className="transition-all duration-300 hover:shadow-glow"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer transition-all duration-300 hover:shadow-elevated hover:scale-105 group"
                onClick={() => onSelectProject(project)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {project.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Node Address</p>
                      <p className="text-sm font-mono truncate">{project.contractNodeAddress}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Contract Hash</p>
                      <p className="text-sm font-mono truncate">{project.contractHash}</p>
                    </div>
                    {project.description && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Description</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      <DeleteProjectDialog
        project={projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={confirmDeleteProject}
      />
    </div>
  );
}