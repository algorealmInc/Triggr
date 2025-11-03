import { useParams } from "react-router-dom";
import { ProjectSettingsPage as SettingsContent } from "../components/project-settings-page";
import { ProjectLayoutWrapper } from "./ProjectLayoutWrapper";
import { useConsoleService } from "@/lib/api/console.service";

interface Project {
  id: string;
  name: string;
  api_key: string;
  contract_address: string;
  description?: string;
  createdAt: Date;
}

export default function SettingsPage() {
  const { projectId } = useParams();
  const { useGetProject } = useConsoleService();
  const projectQuery = useGetProject(projectId);
  const projectData = projectQuery?.data?.project ?? {};

  return (
    <ProjectLayoutWrapper>
      <SettingsContent project={projectData as Project} />
    </ProjectLayoutWrapper>
  );
}
