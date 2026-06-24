import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api from "@/lib/axios";
import { AxiosError, AxiosResponse } from "axios";
import { toast } from "sonner";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/api-errors";

interface UseAddProps<T> {
  queryKey: string;
  endpoint?: string;
  customSuccessMessage?: string;
  customErrorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  invalidateQueries?: boolean;
  headers?: Record<string, string>;
}

interface UseAddReturn<T> {
  handleAdd: (data: T | FormData) => void;
  isSuccess: boolean;
  loading: boolean;
  responseData: T | null;
  error: AxiosError | null;
}

const useAdd = <T,>({
  queryKey,
  endpoint,
  customSuccessMessage = null,
  customErrorMessage = null,
  showSuccessToast = true,
  showErrorToast = true,
  invalidateQueries = true,
  headers = {},
}: UseAddProps<T>): UseAddReturn<T> => {
  const { t } = useLanguage();
  const { getUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [responseData, setResponseData] = useState<T | null>(null);
  const [error, setError] = useState<AxiosError | null>(null);



  // Default messages
  const defaultSuccessMessage =
    t("api.use_add.dataAddedSuccess") || "Data added successfully";
  const defaultErrorMessage = t("api.use_add.addFailed") || "Failed to add data";
  const successMessage = customSuccessMessage || defaultSuccessMessage;
  const errorMessage = customErrorMessage || defaultErrorMessage;

  const addMutation = useMutation<
    T,
    AxiosError<Record<string, string | string[]>>,
    T | FormData
  >({
    mutationFn: async (data: T | FormData) => {
      try {
        setLoading(true);
        setError(null);
        setIsSuccess(false);
        
        // Skip authentication check for login endpoint
        const isLoginRequest = queryKey === 'login' || endpoint === 'login/';
        
        if (!isLoginRequest) {
          // Check if user is authenticated for non-login requests
          const user = getUser();
          if (!user || !user.token) {
            throw new Error('User not authenticated');
          }
        }
        
        const requestHeaders: Record<string, string> = { ...headers };
        
        // Don't set Content-Type for FormData, let browser set it with boundary
        if (!(data instanceof FormData)) {
          requestHeaders['Content-Type'] = 'application/json';
        }
        
        const apiEndpoint = endpoint || `${queryKey}/`;
        
        // Use direct axios for login requests to avoid interceptor issues
        const response: AxiosResponse<T> = isLoginRequest 
          ? await axios.post(
              `${import.meta.env.VITE_API_URL}/${apiEndpoint}`,
              data,
              { headers: requestHeaders }
            )
          : await api.post(
              `/${apiEndpoint}`,
              data,
              { headers: requestHeaders }
            );
        setResponseData(response.data);
        return response.data;
      } catch (error) {
        // Handle authentication errors for non-login requests
        if (error instanceof Error && error.message === 'User not authenticated' && queryKey !== 'login') {
          logout();
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      setLoading(false);
      setIsSuccess(true);
      if (showSuccessToast) {
        toast.success("Success", {
          description: successMessage,
          style: {
            background: "#dcfce7", // Light green background
            border: "1px solid #86efac",
          },
          duration: 4000,
          position: "top-right",
          action: {
            label: t("common.dismiss") || "Dismiss",
          },
        });
      }
      setTimeout(() => {
        setIsSuccess(false);
      }, 100);
      if (invalidateQueries) {
        // Invalidate all queries that start with the queryKey
        queryClient.invalidateQueries({ 
          queryKey: [queryKey],
          exact: false 
        });
        
        // Force immediate refetch of all related queries
        queryClient.refetchQueries({ 
          queryKey: [queryKey],
          exact: false,
          type: 'all'
        });
        
        // Additional delayed refetch to ensure backend consistency
        setTimeout(() => {
          queryClient.invalidateQueries({ 
            queryKey: [queryKey],
            exact: false 
          });
          queryClient.refetchQueries({ 
            queryKey: [queryKey],
            exact: false
          });
        }, 300);
      }
    },
    onError: (error: AxiosError<Record<string, string | string[]>>) => {
      setLoading(false);
      setIsSuccess(false);
      setError(error);
      if (showErrorToast) {
        if (error.response?.status === 403) {
          toast.error("Forbidden", {
            description: getApiErrorMessage(error, errorMessage),
            style: { background: "#fee2e2", border: "1px solid #fca5a5" },
            duration: 6000,
            position: "top-right",
          });
          return;
        }
        const backendErrors = error.response?.data;
        if (backendErrors && typeof backendErrors === "object") {
          // Handle field-specific errors
          const errorMessages = Object.keys(backendErrors).map((key) => {
            const errorMsg = Array.isArray(backendErrors[key])
              ? backendErrors[key].join(", ")
              : backendErrors[key];
            return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${errorMsg}`;
          });
          // Show a single toast with all errors
          toast.error("Validation Error", {
            description: errorMessages.join(". "),
            style: {
              background: "#fee2e2", // Light red background
              border: "1px solid #fca5a5",
            },
            duration: 6000,
            position: "top-right",
            action: {
              label: t("common.dismiss") || "Dismiss",
            },
          });
        } else {
          // Handle general errors
          const statusCode = error.response?.status || "Unknown";
          const statusText = error.response?.statusText || "Error";
          const errorMsg = error.message || "An unexpected error occurred";
          toast.error(`${statusText} (${statusCode})`, {
            description: errorMsg,
            style: {
              background: "#fee2e2", // Light red background
              border: "1px solid #fca5a5",
            },
            duration: 6000,
            position: "top-right",
            action: {
              label: t("common.dismiss") || "Dismiss",
            },
          });
        }
      }
    },
  });

  const handleAdd = (data: T | FormData) => {
    addMutation.mutate(data);
  };

  return {
    handleAdd,
    isSuccess,
    loading,
    responseData,
    error,
  };
};

export default useAdd;
