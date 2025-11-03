import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

// Lazy load pages - Auth routes
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const SignupPage = lazy(() => import("@/features/auth/pages/SignupPage"));
const SSOCallback = lazy(() => import("@/features/auth/pages/SSOCallback"));
const EmailVerificationPage = lazy(
  () => import("@/features/auth/pages/EmailVerificationPage")
);

// Lazy load pages - Protected routes
const Dashboard = lazy(() => import("@/features/dashboard/pages/Dashboard"));
const DatabasePage = lazy(
  () => import("@/features/projects/pages/DatabasePage")
);
const TriggersPage = lazy(
  () => import("@/features/projects/pages/TriggersPage")
);
const SettingsPage = lazy(
  () => import("@/features/projects/pages/SettingsPage")
);

export const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

/**
 * Main application routes
 * 
 * Public routes:
 * - /sign-in - Login page
 * - /sign-up - Sign up page
 * - /sso/callback - OAuth callback handler
 * - /verify-email - Email verification
 * 
 * Protected routes (require authentication):
 * - / - Dashboard
 * - /projects/:projectId - Project details
 * 
 * All other routes redirect to dashboard
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/sign-in" element={<LoginPage />} />
        <Route path="/sign-up" element={<SignupPage />} />
        <Route path="/sso/callback" element={<SSOCallback />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects/:projectId/database" element={<DatabasePage />} />
          <Route path="/projects/:projectId/triggers" element={<TriggersPage />} />
          <Route path="/projects/:projectId/settings" element={<SettingsPage />} />
          <Route path="/projects/:projectId" element={<Navigate to="database" replace />} />
        </Route>

        {/* Fallback - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
