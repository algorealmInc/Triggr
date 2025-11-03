import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api/client";

export const useApiClient = () => {
  const { getToken } = useAuth();

  useEffect(() => {
    apiClient.setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch (error) {
        console.error("Failed to get auth token:", error);
        return null;
      }
    });
  }, [getToken]);

  return apiClient;
};
