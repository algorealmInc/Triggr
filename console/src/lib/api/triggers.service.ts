import { useApiMutation } from "@/hooks/use-mutation";
import { useApiQuery } from "@/hooks/use-query";
import { useParams } from "react-router-dom";
import { AxiosRequestConfig } from "axios";

// Types based on your API structure
export interface Trigger {
  id: string;
  description: string;
  dsl: string; // JSON string of events array
  active: boolean;
  created: number;
  last_run: number;
}

export interface CreateTriggerInput {
  id: string;
  contract_addr: string;
  description: string;
  trigger: string; // JSON string: const events = [...]
}

export interface UpdateTriggerStateInput {
  active: boolean;
}

export const useTriggerService = () => {
  const params = useParams();
  const projectId = params.projectId || "";

  // Prepare request config with x-api-key when projectId exists
  const requestConfig: AxiosRequestConfig | undefined = projectId
    ? {
        headers: {
          "x-api-key": projectId,
        },
      }
    : undefined;

  // Get all triggers
  const useListTriggers = (contractId: string) =>
    useApiQuery<Trigger[]>(`/api/trigger/${contractId}`, {
      queryKey: ["fetchTriggers", contractId],
      useCache: true,
      cacheKey: `triggers-${contractId}`,
      enabled: !!contractId,
      requestConfig,
    });

  // Get a single trigger by ID
  const useGetTrigger = (triggerId: string) =>
    useApiQuery<Trigger>(`/api/trigger/${triggerId}`, {
      queryKey: ["fetchTrigger", triggerId],
      useCache: true,
      cacheKey: `trigger-${triggerId}`,
      enabled: !!triggerId,
      requestConfig,
    });

  // Create a new trigger
  const useCreateTrigger = () =>
    useApiMutation<Trigger, CreateTriggerInput>({
      method: "post",
      url: "/api/trigger",
      invalidateQueries: ["fetchTriggers"],
      optimisticKey: "triggers",
      optimisticData: (variables) => ({
        ...variables,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      requestConfig,
    });

  // Update trigger state (activate/deactivate)
  const useUpdateTriggerState = () =>
    useApiMutation<
      Trigger,
      UpdateTriggerStateInput & { contractId: string; triggerId: string }
    >({
      method: "put",
      url: (variables) =>
        `/api/trigger/${variables.contractId}/${variables.triggerId}/state`,
      invalidateQueries: ["fetchTriggers", "fetchTrigger"],
      transformPayload: (variables) => ({
        active: variables.active,
      }),
      optimisticKey: "trigger",
      optimisticData: (variables) =>
        ({
          id: variables.triggerId,
          active: variables.active,
          updatedAt: new Date().toISOString(),
        } as Partial<Trigger>),
      requestConfig,
    });

  // Delete a trigger
  const useDeleteTrigger = () =>
    useApiMutation<void, { triggerId: string; contractAddress: string }>({
      method: "delete",
      url: (variables) =>
        `/api/trigger/${variables.contractAddress}/${variables.triggerId}`,
      invalidateQueries: ["fetchTriggers"],
      requestConfig,
    });

  return {
    useListTriggers,
    useGetTrigger,
    useCreateTrigger,
    useUpdateTriggerState,
    useDeleteTrigger,
  };
};
