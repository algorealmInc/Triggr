import { ApiError, ApiResponse } from "@/types/api";
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";

class ApiClient {
  private axiosInstance: AxiosInstance;
  private getAuthToken: (() => Promise<string | null>) | null = null;

  constructor(baseURL: string = import.meta.env.VITE_API_BASE_URL || "") {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
      // headers: {
      //   "Content-Type": "application/json",
      // },
    });

    this.setupInterceptors();
  }

  setAuthTokenGetter(getter: () => Promise<string | null>) {
    this.getAuthToken = getter;
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        if (this.getAuthToken) {
          const token = await this.getAuthToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Add request ID for tracking
        // config.headers["X-Request-ID"] = this.generateRequestId();
        // config.headers["X-Timestamp"] = new Date().toISOString();

        return config;
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Normalize response
        return {
          ...response.data,
          status: response.status,
          timestamp: new Date().toISOString(),
        };
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError | any): ApiError {
    const apiError: ApiError = {
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred",
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };

    if (axios.isAxiosError(error)) {
      apiError.statusCode = error.response?.status || 500;
      apiError.details = error.response?.data;

      if (error.response?.status === 401) {
        apiError.code = "UNAUTHORIZED";
        apiError.message = "Authentication required";
      } else if (error.response?.status === 403) {
        apiError.code = "FORBIDDEN";
        apiError.message = "Access denied";
      } else if (error.response?.status === 404) {
        apiError.code = "NOT_FOUND";
        apiError.message = "Resource not found";
      } else if (error.response?.status === 409) {
        apiError.code = "CONFLICT";
        apiError.message = "Resource conflict";
      } else if (error.response?.status === 429) {
        apiError.code = "RATE_LIMITED";
        apiError.message = "Too many requests";
      } else if (error.response?.status === 422) {
        apiError.code = "VALIDATION_ERROR";
        apiError.message = error.response?.data?.message || "Validation failed";
      } else if (error.response?.status >= 500) {
        apiError.code = "SERVER_ERROR";
        apiError.message = "Server error occurred";
      } else if (error.message === "Network Error") {
        apiError.code = "NETWORK_ERROR";
        apiError.message = "Network connection failed";
      }

      apiError.message = error.response?.data?.message || apiError.message;
    } else if (error instanceof Error) {
      apiError.message = error.message;
    }

    return apiError;
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.axiosInstance.get(url, config);
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.axiosInstance.post(url, data, config);
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.axiosInstance.put(url, data, config);
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.axiosInstance.patch(url, data, config);
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.axiosInstance.delete(url, config);
  }
}

export const apiClient = new ApiClient();
