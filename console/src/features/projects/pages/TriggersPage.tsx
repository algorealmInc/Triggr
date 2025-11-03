import { useParams } from "react-router-dom";
import { TriggersPage as TriggersContent } from "../components/triggers-page";
import { ProjectLayoutWrapper } from "./ProjectLayoutWrapper";
import { useConsoleService } from "@/lib/api/console.service";

interface Project {
  id: string;
  contract_address: string;
  contract_events: any[];
  description?: string;
  createdAt: Date;
}

export default function TriggersPage() {
  const { projectId } = useParams();
  const { useGetProject } = useConsoleService();
  const projectQuery = useGetProject(projectId);
  const projectData = projectQuery?.data?.project ?? {};

  return (
    <ProjectLayoutWrapper>
      <TriggersContent project={projectData as Project} />
    </ProjectLayoutWrapper>
  );
}
