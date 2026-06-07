import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { CalendarProvider } from "@/contexts/CalendarContext";
import { Layout } from "@/components/layout/Layout";
import Login from "@/pages/auth/Login";

import { appRoutes } from "@/routes";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {!isAuthenticated ? (
        <Route path="*" element={<Login />} />
      ) : (
        <Route path="/" element={<Layout />}>
          {appRoutes}
        </Route>
      )}
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CalendarProvider>
      <AuthProvider>
        <PermissionProvider>
          <LanguageProvider>
            <TooltipProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Toaster />
                <Sonner />
                <AppContent />
              </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </PermissionProvider>
      </AuthProvider>
    </CalendarProvider>
  </QueryClientProvider>
);

export default App;
