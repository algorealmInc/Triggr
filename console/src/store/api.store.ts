import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { ApiError } from "../types/api";

interface LoadingState {
  requests: Map<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
}

interface ErrorState {
  errors: Map<string, ApiError>;
  setError: (key: string, error: ApiError | null) => void;
  getError: (key: string) => ApiError | null;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
}

interface CacheState {
  cache: Map<string, any>;
  setCacheData: (key: string, data: any) => void;
  getCacheData: (key: string) => any;
  clearCache: (key?: string) => void;
}

interface OptimisticState {
  optimisticUpdates: Map<string, any>;
  setOptimisticUpdate: (key: string, data: any) => void;
  clearOptimisticUpdate: (key: string) => void;
}

type ApiStore = LoadingState & ErrorState & CacheState & OptimisticState;

export const useApiStore = create<ApiStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Loading state
        requests: new Map(),
        setLoading: (key: string, loading: boolean) =>
          set((state) => {
            const newRequests = new Map(state.requests);
            if (loading) {
              newRequests.set(key, true);
            } else {
              newRequests.delete(key);
            }
            return { requests: newRequests };
          }),
        isLoading: (key: string) => get().requests.has(key),

        // Error state
        errors: new Map(),
        setError: (key: string, error: ApiError | null) =>
          set((state) => {
            const newErrors = new Map(state.errors);
            if (error) {
              newErrors.set(key, error);
            } else {
              newErrors.delete(key);
            }
            return { errors: newErrors };
          }),
        getError: (key: string) => get().errors.get(key) || null,
        clearError: (key: string) =>
          set((state) => {
            const newErrors = new Map(state.errors);
            newErrors.delete(key);
            return { errors: newErrors };
          }),
        clearAllErrors: () => set({ errors: new Map() }),

        // Cache state
        cache: new Map(),
        setCacheData: (key: string, data: any) =>
          set((state) => {
            const newCache = new Map(state.cache);
            newCache.set(key, {
              data,
              timestamp: Date.now(),
            });
            return { cache: newCache };
          }),
        getCacheData: (key: string) => {
          const cached = get().cache.get(key);
          if (!cached) return null;

          const cacheExpiry = 5 * 60 * 1000; // 5 minutes
          if (Date.now() - cached.timestamp > cacheExpiry) {
            get().clearCache(key);
            return null;
          }

          return cached.data;
        },
        clearCache: (key?: string) =>
          set((state) => {
            if (key) {
              const newCache = new Map(state.cache);
              newCache.delete(key);
              return { cache: newCache };
            }
            return { cache: new Map() };
          }),

        // Optimistic updates
        optimisticUpdates: new Map(),
        setOptimisticUpdate: (key: string, data: any) =>
          set((state) => {
            const newUpdates = new Map(state.optimisticUpdates);
            newUpdates.set(key, data);
            return { optimisticUpdates: newUpdates };
          }),
        clearOptimisticUpdate: (key: string) =>
          set((state) => {
            const newUpdates = new Map(state.optimisticUpdates);
            newUpdates.delete(key);
            return { optimisticUpdates: newUpdates };
          }),
      }),
      {
        name: "api-store",
        partialize: (state) => ({
          cache: state.cache,
        }),
      }
    )
  )
);
