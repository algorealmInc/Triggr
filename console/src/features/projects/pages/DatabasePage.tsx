import { useParams } from "react-router-dom";
import { DatabasePage as DatabaseContent } from "../components/database-page";
import { ProjectLayoutWrapper } from "./ProjectLayoutWrapper";
import { useConsoleService } from "@/lib/api/console.service";

interface Project {
  id: string;
  name: string;
  contract_address: string;
  contract_hash: string;
  description?: string;
  createdAt: Date;
}

export default function DatabasePage() {
  const { projectId } = useParams();
  const { useGetProject } = useConsoleService();
  const projectQuery = useGetProject(projectId);
  const projectData = projectQuery?.data?.project ?? {};

  return (
    <ProjectLayoutWrapper>
      <DatabaseContent project={projectData as Project} />
    </ProjectLayoutWrapper>
  );
}
