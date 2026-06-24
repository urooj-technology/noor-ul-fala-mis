import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { AxiosError } from "axios";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { resolveQueryKeyBase, toQueryKeyArray } from "@/lib/queryKey";

interface UseDeleteProps {
  queryKey: string | string[];
  endpoint?: string;
  invalidateQueryKeys?: string[][];
}

interface UseDeleteReturn {
  handleDelete: (id: string | number, name?: string) => void;
  ConfirmDialog: React.FC;
}

const useDelete = ({ queryKey, endpoint, invalidateQueryKeys = [] }: UseDeleteProps): UseDeleteReturn => {
  const { t } = useLanguage();
  const { getUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string | number;
    name?: string;
  } | null>(null);



  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      try {
        // Check if user is authenticated
        const user = getUser();
        if (!user || !user.token) {
          throw new Error('User not authenticated');
        }
        
        const apiEndpoint = endpoint || resolveQueryKeyBase(queryKey);
        await api.delete(`/${apiEndpoint}/${id}/`);
      } catch (error) {
        // Handle authentication errors
        if (error instanceof Error && error.message === 'User not authenticated') {
          logout();
        }
        throw new Error(
          (error as AxiosError<{ detail?: string }>).response?.data?.detail ||
            t("api.use_delete.deleteFailed")
        );
      }
    },
    onSuccess: () => {
      toast.success("Success", {
        description: t("api.use_delete.deleteSuccess") || "Item deleted successfully",
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
      queryClient.invalidateQueries({ queryKey: toQueryKeyArray(queryKey) });
      invalidateQueryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key, exact: false });
      });
    },
    onError: (error: AxiosError<{ detail?: string }>) => {
      const errorMessage = error.response?.data?.detail ||
        error.message ||
        t("api.use_delete.deleteFailed") ||
        "Failed to delete item";
      toast.error("Error", {
        description: errorMessage,
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
    },
  });

  const handleDelete = (id: string | number, name?: string) => {
    setItemToDelete({ id, name });
    setIsOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
    setIsOpen(false);
  };

  const ConfirmDialog = () => (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <AlertDialogTitle className="text-base font-semibold text-gray-900">
            {t("api.use_delete.confirmDeleting")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-gray-600 mt-2 leading-relaxed">
            {itemToDelete?.name ? (
              <>
                {t("api.use_delete.deletingItemMessage").replace('{{item}}', itemToDelete.name)}
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-base font-medium text-red-800 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    This action cannot be undone
                  </p>
                </div>
              </>
            ) : (
              t("api.use_delete.deletingMessage")
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 pt-4">
          <AlertDialogCancel asChild>
            <Button variant="outline" className="flex-1 h-11">
              {t("api.use_delete.cancel")}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              className="flex-1 h-11 bg-red-600 hover:bg-red-700 focus:ring-red-500"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  {t("api.use_delete.delete")}
                </>
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { handleDelete, ConfirmDialog };
};

export default useDelete;
