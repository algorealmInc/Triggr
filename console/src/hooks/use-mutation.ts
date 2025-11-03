import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiResponse, ApiError } from "../types/api";
import { useApiStore } from "../store/api.store";
import { apiClient } from "@/lib/api/client";
import { AxiosRequestConfig } from "axios";

type HttpMethod = "post" | "put" | "patch" | "delete";

interface UseApiMutationOptions<TData = any, TVariables = any>
  extends Omit<
    UseMutationOptions<ApiResponse<TData>, ApiError, TVariables>,
    "mutationFn"
  > {
  method: HttpMethod;
  url: string | ((variables: TVariables) => string);
  invalidateQueries?: string[];
  optimisticData?: (variables: TVariables) => any;
  optimisticKey?: string;
  requestConfig?: AxiosRequestConfig;
  transformPayload?: (variables: TVariables) => any;
}

export const useApiMutation = <TData = any, TVariables = any>(
  options: UseApiMutationOptions<TData, TVariables>
) => {
  const queryClient = useQueryClient();
  const { setError, clearError, setOptimisticUpdate, clearOptimisticUpdate } =
    useApiStore();

  const {
    method,
    url: urlOrFn,
    invalidateQueries = [],
    optimisticData,
    optimisticKey,
    requestConfig,
    transformPayload,
    ...mutationOptions
  } = options;

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const url = typeof urlOrFn === "function" ? urlOrFn(variables) : urlOrFn;

      // Apply optimistic update
      if (optimisticData && optimisticKey) {
        const optimistic = optimisticData(variables);
        setOptimisticUpdate(optimisticKey, optimistic);
        queryClient.setQueryData([optimisticKey], optimistic);
      }

      try {
        // Transform payload if transformer is provided, otherwise use variables as-is
        const payload = transformPayload
          ? transformPayload(variables)
          : variables;

        const isFormData = payload instanceof FormData;

        // Merge requestConfig and ensure headers are handled correctly for FormData
        const baseHeaders = { ...(requestConfig?.headers ?? {}) } as Record<
          string,
          any
        >;

        if (isFormData) {
          // ✅ CRITICAL: Remove Content-Type to let axios set the boundary automatically
          delete baseHeaders["Content-Type"];
          delete baseHeaders["content-type"];

          console.log("📦 Sending FormData request");
          console.log("🔍 Headers after cleanup:", baseHeaders);
        } else {
          // default to JSON if not provided
          if (!baseHeaders["Content-Type"] && !baseHeaders["content-type"]) {
            baseHeaders["Content-Type"] = "application/json";
          }
        }

        const mergedConfig: AxiosRequestConfig = {
          ...(requestConfig ?? {}),
          headers: baseHeaders,
        };

        // ✅ FIX: Handle DELETE differently (no body parameter)
        let response: ApiResponse<TData>;

        if (method === "delete") {
          // DELETE requests: axios.delete(url, config)
          response = await apiClient.delete<TData>(url, {
            ...mergedConfig,
            data: payload, // DELETE can have data in config.data
          });
        } else {
          // POST/PUT/PATCH: axios[method](url, data, config)
          response = await apiClient[method]<TData>(
            url,
            payload as any,
            mergedConfig
          );
        }

        clearError(url);
        return response;
      } catch (error) {
        const apiError = error as ApiError;
        const errorUrl =
          typeof urlOrFn === "function"
            ? urlOrFn(error as any)
            : (urlOrFn as string);
        setError(
          typeof errorUrl === "string" ? errorUrl : String(errorUrl),
          apiError
        );

        // Rollback optimistic update on error
        if (optimisticKey) {
          clearOptimisticUpdate(optimisticKey);
          queryClient.invalidateQueries({ queryKey: [optimisticKey] });
        }

        throw error;
      }
    },
    onSuccess: (data, variables) => {
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      if (optimisticKey) clearOptimisticUpdate(optimisticKey);
      mutationOptions.onSuccess?.(data, variables, undefined);
    },
    onError: (error, variables) => {
      mutationOptions.onError?.(error, variables, undefined);
    },
    ...mutationOptions,
  });
};
