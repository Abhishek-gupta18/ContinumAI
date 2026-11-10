import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { registerUnauthorizedHandler } from './api/http';
import { supabaseConfigured } from './lib/supabase';
import { ErrorBoundary } from './components/app/ErrorBoundary';
import { AppLayout } from './components/app/AppLayout';
import { ComingSoon } from './components/app/ComingSoon';
import { AccountPage } from './components/app/AccountPage';

// Memory Graph (keeps its current page)
import { DashboardProvider } from './context/DashboardContext';
import { MemoryGraphPage } from './pages/dashboard/MemoryGraphPage';

// Playground (real chat page)
import { PlaygroundPage } from './features/playground/PlaygroundPage';

// Providers (real BYOK page)
import { ProvidersPage } from './features/providers/ProvidersPage';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';

// Demo pages (unchanged)
import { SignInDemo, ProviderKeysDemo, GatewayTokensDemo, AccountDemo } from './pages/DemoPages';

// On 401 from the gateway: sign out and go to /login.
function UnauthorizedBridge(): null {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      void signOut();
      navigate('/login', { replace: true });
    });
  }, [signOut, navigate]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      {!supabaseConfigured ? (
        <div className="flex h-screen flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm font-semibold text-[#F1F3F9]">Supabase is not configured</p>
          <p className="text-xs text-[#8A92A6]">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local and reload.
          </p>
        </div>
      ) : (
        <AuthProvider>
          <BrowserRouter>
            <UnauthorizedBridge />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Demo pages */}
              <Route path="/demo/signin" element={<SignInDemo />} />
              <Route path="/demo/keys" element={<ProviderKeysDemo />} />
              <Route path="/demo/tokens" element={<GatewayTokensDemo />} />
              <Route path="/demo/account" element={<AccountDemo />} />

              {/* Protected app shell */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/app/graph" replace />} />
                <Route
                  path="graph"
                  element={
                    <DashboardProvider>
                      <MemoryGraphPage />
                    </DashboardProvider>
                  }
                />
                <Route path="playground" element={<PlaygroundPage />} />
                <Route path="providers" element={<ProvidersPage />} />
                <Route path="api-access" element={<ComingSoon title="API Access" />} />
                <Route path="account" element={<AccountPage />} />
              </Route>

              <Route path="/" element={<Navigate to="/app/graph" replace />} />

              {/* Every existing route path keeps working */}
              <Route path="/graph" element={<Navigate to="/app/graph" replace />} />
              <Route path="/playground" element={<Navigate to="/app/playground" replace />} />
              <Route path="/providers" element={<Navigate to="/app/providers" replace />} />
              <Route path="/api-access" element={<Navigate to="/app/api-access" replace />} />
              <Route path="/overview" element={<Navigate to="/app/graph" replace />} />
              <Route path="/activity" element={<Navigate to="/app/graph" replace />} />
              <Route path="/settings" element={<Navigate to="/app/account" replace />} />
              <Route path="/app/*" element={<Navigate to="/app/graph" replace />} />
              <Route path="/dashboard" element={<Navigate to="/app/graph" replace />} />
              <Route path="/dashboard/*" element={<Navigate to="/app/graph" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/app/graph" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      )}
    </ErrorBoundary>
  );
}
