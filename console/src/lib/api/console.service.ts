import { useApiMutation } from "@/hooks/use-mutation";
import { useApiQuery } from "@/hooks/use-query";
import { Project } from "@/types";
import { CreateProjectInput } from "@/types/api";

export const useConsoleService = () => {
  // Get all projects for a user
  const useGetProjects = () =>
    useApiQuery<Project[]>("/api/console/projects", {
      queryKey: ["fetchProjects"],
      useCache: true,
      cacheKey: "projects-list",
    });

  // Create a new project
  const useCreateProject = () =>
    useApiMutation<Project, CreateProjectInput>({
      method: "post",
      url: "/api/console/project",
      invalidateQueries: ["fetchProjects"],
      optimisticKey: "projects-list",
      optimisticData: (variables) => ({
        id: `temp-${Date.now()}`,
        api_key: `temp-key-${Date.now()}`,
        ...variables,
        userId: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

  // Delete a project
  const useDeleteProject = () =>
    useApiMutation<void, { api_key: string }>({
      method: "delete",
      url: (variables) => `/api/console/project/${variables.api_key}`,
      invalidateQueries: ["fetchProjects"],
    });

  // Get single project by API key
  const useGetProject = (apiKey: string) =>
    useApiQuery<Project>(`/api/console/project/${apiKey}`, {
      queryKey: ["fetchProject", apiKey],
      useCache: true,
      cacheKey: `project-${apiKey}`,
      enabled: !!apiKey,
    });

  return {
    useGetProjects,
    useCreateProject,
    useDeleteProject,
    useGetProject,
  };
};
