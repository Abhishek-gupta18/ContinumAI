import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardProvider } from './context/DashboardContext';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Screen 1: Overview
import { OverviewPage } from './pages/dashboard/OverviewPage';

// Screen 2: Providers (Core)
import { ProvidersPage } from './pages/dashboard/ProvidersPage';

// Screen 3: Memory Graph
import { MemoryGraphPage } from './pages/dashboard/MemoryGraphPage';

// Screen 4: Playground
import { PlaygroundPage } from './pages/dashboard/PlaygroundPage';

// Screen 5: API Access
import { ApiAccessPage } from './pages/dashboard/ApiAccessPage';

// Screen 6: Activity Log
import { ActivityLogPage } from './pages/dashboard/ActivityLogPage';

// Screen 7: Settings
import { SettingsPage } from './pages/dashboard/SettingsPage';

// Landing + demo pages (no dashboard chrome)
import { Landing } from './pages/Landing';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { SignInDemo, ProviderKeysDemo, GatewayTokensDemo, AccountDemo } from './pages/DemoPages';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing — the one from docs/screenshots/landing.png */}
        <Route path="/" element={<Landing />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Demo pages */}
        <Route path="/demo/signin" element={<SignInDemo />} />
        <Route path="/demo/keys" element={<ProviderKeysDemo />} />
        <Route path="/demo/tokens" element={<GatewayTokensDemo />} />
        <Route path="/demo/account" element={<AccountDemo />} />

        {/* Screens 1-7: dashboard */}
        <Route
          path="*"
          element={
            <DashboardProvider>
              <DashboardLayout>
                <Routes>
                  {/* Screen 1: Overview */}
                  <Route path="/overview" element={<OverviewPage />} />

            {/* Screen 2: Providers */}
            <Route path="/providers" element={<ProvidersPage />} />

            {/* Screen 3: Memory Graph */}
            <Route path="/graph" element={<MemoryGraphPage />} />

            {/* Screen 4: Playground */}
            <Route path="/playground" element={<PlaygroundPage />} />

            {/* Screen 5: API Access */}
            <Route path="/api-access" element={<ApiAccessPage />} />

            {/* Screen 6: Activity Log */}
            <Route path="/activity" element={<ActivityLogPage />} />

            {/* Screen 7: Settings */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Backward compatibility aliases */}
            <Route path="/app" element={<Navigate to="/overview" replace />} />
            <Route path="/app/*" element={<Navigate to="/overview" replace />} />
            <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
            <Route path="/dashboard/*" element={<Navigate to="/overview" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/overview" replace />} />
                </Routes>
              </DashboardLayout>
            </DashboardProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
