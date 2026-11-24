import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { registerUnauthorizedHandler } from './api/http';
import { supabaseConfigured } from './lib/supabase';
import { ErrorBoundary } from './components/app/ErrorBoundary';
import { AppLayout } from './components/app/AppLayout';


const DashboardProvider = lazy(() => import('./context/DashboardContext').then(m => ({ default: m.DashboardProvider })));

const MemoryGraphPage = lazy(() => import('./pages/dashboard/MemoryGraphPage').then(m => ({ default: m.MemoryGraphPage })));
const PlaygroundPage = lazy(() => import('./features/playground/PlaygroundPage').then(m => ({ default: m.PlaygroundPage })));
const ProvidersPage = lazy(() => import('./features/providers/ProvidersPage').then(m => ({ default: m.ProvidersPage })));
const ApiAccessPage = lazy(() => import('./pages/dashboard/ApiAccessPage').then(m => ({ default: m.ApiAccessPage })));
const AccountPageLazy = lazy(() => import('./components/app/AccountPage').then(m => ({ default: m.AccountPage })));

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));

const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));

const SignInDemo = lazy(() => import('./pages/DemoPages').then(m => ({ default: m.SignInDemo })));
const ProviderKeysDemo = lazy(() => import('./pages/DemoPages').then(m => ({ default: m.ProviderKeysDemo })));
const GatewayTokensDemo = lazy(() => import('./pages/DemoPages').then(m => ({ default: m.GatewayTokensDemo })));
const AccountDemo = lazy(() => import('./pages/DemoPages').then(m => ({ default: m.AccountDemo })));

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
              <Route path="/login" element={<Suspense fallback={null}><LoginPage /></Suspense>} />
              <Route path="/signup" element={<Suspense fallback={null}><SignupPage /></Suspense>} />
              <Route path="/forgot-password" element={<Suspense fallback={null}><ForgotPasswordPage /></Suspense>} />

              {/* Demo pages */}
              <Route path="/demo/signin" element={<Suspense fallback={null}><SignInDemo /></Suspense>} />
              <Route path="/demo/keys" element={<Suspense fallback={null}><ProviderKeysDemo /></Suspense>} />
              <Route path="/demo/tokens" element={<Suspense fallback={null}><GatewayTokensDemo /></Suspense>} />
              <Route path="/demo/account" element={<Suspense fallback={null}><AccountDemo /></Suspense>} />

              {/* Protected app shell */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={null}><DashboardProvider><AppLayout /></DashboardProvider></Suspense>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/app/graph" replace />} />
                <Route path="graph" element={<Suspense fallback={null}><MemoryGraphPage /></Suspense>} />
                <Route path="playground" element={<Suspense fallback={null}><PlaygroundPage /></Suspense>} />
                <Route path="providers" element={<Suspense fallback={null}><ProvidersPage /></Suspense>} />
                <Route path="api-access" element={<Suspense fallback={null}><ApiAccessPage /></Suspense>} />
                <Route path="account" element={<Suspense fallback={null}><AccountPageLazy /></Suspense>} />
              </Route>

              <Route path="/" element={<Suspense fallback={null}><Landing /></Suspense>} />

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
