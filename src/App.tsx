import "./i18n/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollToTop } from "./components/ScrollToTop";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "./components/auth/ProtectedRoute.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import { handleError } from "./utils/error-handler.tsx";
import { VLibras } from "./components/VLibras";

const Index = lazy(() => import("./pages/Index.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const WalletPage = lazy(() => import("./pages/dashboard/Wallet.tsx"));
const TradePage = lazy(() => import("./pages/dashboard/Trade.tsx"));
const KYCPage = lazy(() => import("./pages/dashboard/KYC.tsx"));
const StatementPage = lazy(() => import("./pages/dashboard/Statement.tsx"));
const AuditPage = lazy(() => import("./pages/dashboard/Audit.tsx"));
const SettingsPage = lazy(() => import("./pages/dashboard/Settings.tsx"));
const AdminPanel = lazy(() => import("./pages/AdminPanel.tsx"));
const Legal = lazy(() => import("./pages/Legal.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminDocs = lazy(() => import("./pages/admin/DocumentationPage.tsx"));
const AdminSecurityAuditLog = lazy(() => import("./pages/admin/SecurityAuditLogPage.tsx"));
const AdminSecurityAlertDispatches = lazy(() => import("./pages/admin/SecurityAlertDispatches.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      meta: {
        errorMessage: "Erro ao carregar dados",
      },
    },
    mutations: {
      meta: {
        errorMessage: "Erro ao realizar operação",
      },
    },
  },
});

// Global error handling for TanStack Query
queryClient.getQueryCache().config.onError = (error) => {
  handleError(error, "Erro ao carregar dados");
};

queryClient.getMutationCache().config.onError = (error) => {
  handleError(error, "Erro ao realizar operação");
};

import nProgress from "nprogress";
import { useEffect } from "react";

const LoadingBar = () => {
  useEffect(() => {
    nProgress.start();
    return () => {
      nProgress.done();
    };
  }, []);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SonnerToaster position="top-center" richColors closeButton />
        <VLibras />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<LoadingBar />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/privacy" element={<Legal />} />
              <Route path="/terms" element={<Legal />} />
              
              {/* User Dashboard Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
              <Route path="/dashboard/trade" element={<ProtectedRoute><TradePage /></ProtectedRoute>} />
              <Route path="/dashboard/statement" element={<ProtectedRoute><StatementPage /></ProtectedRoute>} />
              <Route path="/dashboard/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
              <Route path="/dashboard/kyc" element={<ProtectedRoute><KYCPage /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              
              {/* Admin Routes */}
              <Route path="/sanpainel" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />
              <Route path="/sanpainel/docs" element={<ProtectedRoute requireAdmin><AdminDocs /></ProtectedRoute>} />
              <Route path="/sanpainel/security-audit" element={<ProtectedRoute requireAdmin><AdminSecurityAuditLog /></ProtectedRoute>} />
              <Route path="/sanpainel/security-alerts" element={<ProtectedRoute requireAdmin><AdminSecurityAlertDispatches /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
