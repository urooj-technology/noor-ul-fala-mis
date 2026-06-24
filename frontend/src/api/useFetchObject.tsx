import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { AxiosError, AxiosResponse } from "axios";

interface UseFetchObjectProps<T> {
  queryKey: string[];
  endpoint: string;
  options?: object;
  enabled?: boolean;
}

interface UseFetchObjectReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: AxiosError | null;
  refetch: () => void;
}

const useFetchObject = <T,>({
  queryKey,
  endpoint,
  options = {},
  enabled = true,
}: UseFetchObjectProps<T>): UseFetchObjectReturn<T> => {
  const { logout } = useAuth();
  
  const fetchFunction = async (): Promise<T> => {
    const response: AxiosResponse<T> = await api.get(`${endpoint}`);
    return response.data;
  };
  
  const { data, isLoading, isError, isSuccess, error, refetch } = useQuery<
    T,
    AxiosError
  >({
    queryKey,
    queryFn: fetchFunction,
    enabled,
    staleTime: 0,
    gcTime: 1000 * 60,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (error?.response?.status === 401) {
        logout();
        return false;
      }
      if (error?.response?.status === 404 || error?.response?.status >= 500) {
        return false;
      }
      return failureCount < 2;
    },
    ...options,
  });
  
  return { data, isLoading, isError, isSuccess, error, refetch };
};

export default useFetchObject;