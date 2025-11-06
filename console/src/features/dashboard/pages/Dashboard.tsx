import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { Plus, Trash2, LogOut, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateProjectModal } from "../components/create-project-modal";
import { DeleteProjectDialog } from "../components/delete-project-dialog";
import { ApiKeyDisplayModal } from "../components/api-key-display-modal";
import { Logo } from "@/components/logo";
import { useConsoleService } from "@/lib/api/console.service";

interface BackendProject {
  id: string;
  api_key: string;
  owner: string;
  description: string;
  contract_file_path?: string;
  project_name?: string;
  contract_hash?: string;
}

// Skeleton Loader Component
const ProjectSkeleton = () => {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-4 bg-card border border-border rounded-lg animate-pulse"
        >
          <div className="flex items-center gap-4 flex-1">
            {/* Icon skeleton */}
            <div className="p-2 bg-muted rounded">
              <div className="h-6 w-6 bg-muted-foreground/20 rounded" />
            </div>

            {/* Text skeleton */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
              <div className="h-3 w-48 bg-muted-foreground/20 rounded" />
            </div>
          </div>

          {/* Delete button skeleton */}
          <div className="h-8 w-8 bg-muted-foreground/20 rounded" />
        </div>
      ))}
    </div>
  );
};

// Empty State Component
const EmptyState = () => {
  return (
    <div className="p-12 bg-card border border-border rounded-lg text-center">
      <div className="mb-4 flex justify-center">
        <div className="p-3 bg-primary/10 rounded-lg">
          <File className="h-6 w-6 text-primary" />
        </div>
      </div>
      <p className="text-muted-foreground mb-4 font-medium">No projects yet</p>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Create your first Triggr project to get started with web3 integration
      </p>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<BackendProject | null>(
    null
  );
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyData, setApiKeyData] = useState<{
    projectId: string;
    apiKey: string;
    projectName: string;
  } | null>(null);

  const { useGetProjects, useDeleteProject, useCreateProject } =
    useConsoleService();

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useGetProjects();

  const createProjectMutation = useCreateProject();
  const deleteProjectMutation = useDeleteProject();

  const handleDeleteProject = (project: BackendProject) => {
    setProjectToDelete(project);
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete) {
      try {
        setDeleteLoading(true);
        await deleteProjectMutation.mutateAsync({
          api_key: projectToDelete.api_key,
        });
        setProjectToDelete(null);
      } catch (error) {
        // Error handled by mutation hook
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  const handleCreateProject = async (formData: FormData) => {
    const response = await createProjectMutation.mutateAsync(formData as any);
    if (response && response.project) {
      setIsCreateModalOpen(false);
      // Show API key modal before navigating
      setApiKeyData({
        projectId: response.project.api_key,
        apiKey: response.secret,
        projectName: response.project.project_name || response.project.id,
      });
      console.log({ apiKeyData });
      setIsApiKeyModalOpen(true);
    }
  };

  const handleContinueToProject = () => {
    if (apiKeyData) {
      navigate(`/projects/${apiKeyData.projectId}/database`, {
        state: { apiKeyData },
      });
      setApiKeyData(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo size="sm" />

          <div className="flex items-center space-x-2 sm:space-x-4">
            <a
              href="https://docs.triggr.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm h-8 px-2"
              onClick={() => signOut()}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Welcome Section */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Hello, Developer
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Welcome back to Triggr Console!
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Left Column - Get Started */}
          <div className="space-y-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Get started
            </h3>

            <div className="space-y-4">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full text-left p-6 bg-card border border-border rounded-lg hover:bg-muted transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold mb-1 group-hover:text-primary transition-colors">
                      Create a new Triggr project
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Integrate Triggr products to super-charge your web3 app
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Right Column - Projects List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Projects and workspaces
              </h3>
            </div>

            {projectsError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <p className="font-medium">Failed to load projects</p>
                <p className="text-xs mt-1">
                  {(projectsError as any)?.message}
                </p>
              </div>
            )}

            {projectsLoading ? (
              <ProjectSkeleton />
            ) : !projects || projects.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.api_key}
                    className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer group"
                    onClick={() =>
                      navigate(`/projects/${project.api_key}/database`, {
                        state: { project },
                      })
                    }
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2 bg-muted rounded">
                        <div className="h-6 w-6 text-muted-foreground">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-primary group-hover:text-primary/80 transition-colors">
                          {project.project_name || project.id}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.description || "No description provided"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 mt-12 sm:mt-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              © {new Date().getFullYear()} Triggr. All rights reserved.
            </p>
            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
              <a
                href="https://triggr.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Website
              </a>
              <a
                href="https://docs.triggr.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Documentation
              </a>
              <a
                href="https://github.com/triggr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
        isLoading={createProjectMutation.isPending}
      />

      <DeleteProjectDialog
        project={projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={confirmDeleteProject}
        isLoading={deleteLoading}
      />

      <ApiKeyDisplayModal
        isOpen={isApiKeyModalOpen}
        apiKey={apiKeyData?.apiKey || ""}
        projectName={apiKeyData?.projectName || ""}
        onClose={() => {
          setIsApiKeyModalOpen(false);
          setApiKeyData(null);
        }}
        onContinue={handleContinueToProject}
      />
    </div>
  );
}
