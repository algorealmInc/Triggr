import { apiClient } from "@/lib/api/client";
import {
  useInfiniteQuery,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { useApiStore } from "../store/api.store";
import { ApiError, PaginatedResponse } from "../types/api";
import { AxiosRequestConfig } from "axios";

interface UseApiQueryOptions<T>
  extends Omit<UseQueryOptions<T, ApiError>, "queryFn"> {
  useCache?: boolean;
  cacheKey?: string;
  requestConfig?: AxiosRequestConfig; // <-- allow passing per-request axios config
}

export const useApiQuery = <T = any>(
  url: string,
  options?: UseApiQueryOptions<T>
): UseQueryResult<T, ApiError> => {
  const {
    useCache = true,
    cacheKey = url,
    requestConfig,
    ...queryOptions
  } = options || {};
  const { getCacheData, setCacheData } = useApiStore();

  return useQuery({
    queryKey: [url, requestConfig?.headers ?? {}],
    queryFn: async () => {
      // Safely attempt to read cached value from the store.
      let cached: T | null | undefined = null;
      if (useCache && typeof getCacheData === "function") {
        try {
          cached = getCacheData(cacheKey);
        } catch (err) {
          console.warn(
            "useApiQuery: cache getter failed, bypassing cache",
            err
          );
          cached = null;
        }
      }

      if (cached !== null && cached !== undefined) {
        return cached as T;
      }

      const response = await apiClient.get<T>(url, requestConfig);

      // apiClient interceptor normalizes responses; response may already be the payload
      const payload = (response as any)?.data ?? (response as any);

      // Safely attempt to write to cache
      if (useCache && typeof setCacheData === "function") {
        try {
          setCacheData(cacheKey, payload);
        } catch (err) {
          console.warn("useApiQuery: cache setter failed", err);
        }
      }

      return payload as T;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...queryOptions,
  });
};

interface UseInfiniteApiQueryOptions<T>
  extends Omit<
    UseInfiniteQueryOptions<PaginatedResponse<T>, ApiError>,
    "queryFn" | "initialPageParam"
  > {
  initialPage?: number;
  requestConfig?: AxiosRequestConfig;
}

export const useInfiniteApiQuery = <T = any>(
  url: string,
  options?: UseInfiniteApiQueryOptions<T>
): UseInfiniteQueryResult<PaginatedResponse<T>, ApiError> => {
  const { initialPage = 1, requestConfig, ...queryOptions } = options || {};

  return useInfiniteQuery({
    queryKey: [url, requestConfig?.headers ?? {}],
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get<PaginatedResponse<T>>(
        `${url}?page=${pageParam}`,
        requestConfig
      );
      return response.data;
    },
    initialPageParam: initialPage,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    ...queryOptions,
  });
};
