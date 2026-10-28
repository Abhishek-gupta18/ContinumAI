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

export default function App() {
  return (
    <DashboardProvider>
      <BrowserRouter>
        <DashboardLayout>
          <Routes>
            {/* Screen 1: Overview */}
            <Route path="/" element={<OverviewPage />} />
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
      </BrowserRouter>
    </DashboardProvider>
  );
}
