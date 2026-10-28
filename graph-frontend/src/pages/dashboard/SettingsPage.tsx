import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import {
  User,
  Shield,
  Database,
  Sliders,
  Check,
  AlertTriangle,
  Download,
  Trash2,
  Lock,
  Laptop,
  Smartphone,
  Globe,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { failoverPolicy, updatePolicy, addToast } = useDashboard();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'data' | 'policy'>('policy');

  // Profile form state
  const [fullName, setFullName] = useState('Abhishek Gupta');
  const [email, setEmail] = useState('abhishekgupta.18052006@gmail.com');
  const [timezone, setTimezone] = useState('Asia/Kolkata (GMT+5:30)');

  // Policy form state
  const [failoverOnAuth, setFailoverOnAuth] = useState(failoverPolicy.failoverOnAuthError);
  const [timeoutMs, setTimeoutMs] = useState(failoverPolicy.perProviderTimeoutMs);
  const [maxRetries, setMaxRetries] = useState(failoverPolicy.maxRetries);
  const [quarantineSec, setQuarantineSec] = useState(failoverPolicy.quarantineSeconds);
  const [strategy, setStrategy] = useState(failoverPolicy.strategy);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Delete modal state
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'Profile saved',
      description: 'Your user profile details have been updated.',
    });
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    updatePolicy({
      failoverOnAuthError: failoverOnAuth,
      perProviderTimeoutMs: Number(timeoutMs),
      maxRetries: Number(maxRetries),
      quarantineSeconds: Number(quarantineSec),
      strategy,
    });
  };

  const handleExportData = (format: 'json' | 'csv') => {
    const fakeData = {
      user: 'Abhishek Gupta',
      exportDate: new Date().toISOString(),
      sessionsCount: 86,
      tokensSavedOnFailover: 412900,
    };
    const blob = new Blob([JSON.stringify(fakeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `continum-memory-export.${format}`;
    a.click();
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'Export generated',
      description: `Downloaded memory graph chains in ${format.toUpperCase()} format.`,
    });
  };

  const handleWipeSessions = () => {
    setIsWipeModalOpen(false);
    addToast({
      type: 'warning',
      title: 'Memory chains deleted',
      description: 'All past session graphs have been reset to blank state.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="pb-2 border-b border-[#232733]/60">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F9]">
          Gateway Settings & Configuration
        </h1>
        <p className="text-xs sm:text-sm text-[#8A92A6] mt-1">
          Tune your silent failover thresholds, account security, and data retention policies.
        </p>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1 border-b border-[#232733] pb-px overflow-x-auto">
        {[
          { key: 'policy', label: 'Failover Policy', icon: <Sliders className="w-4 h-4" /> },
          { key: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
          { key: 'security', label: 'Security & Sessions', icon: <Shield className="w-4 h-4" /> },
          { key: 'data', label: 'Data & Retention', icon: <Database className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-[#7C5CFF] text-[#F1F3F9] bg-[#12151C]/60'
                : 'border-transparent text-[#8A92A6] hover:text-[#F1F3F9] hover:bg-[#12151C]/30'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Failover Policy */}
      {activeTab === 'policy' && (
        <form onSubmit={handleSavePolicy} className="space-y-6 max-w-3xl">
          {/* Failover on auth errors toggle */}
          <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733] space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#F1F3F9]">
                  Fail over on authentication errors
                </h3>
                <p className="text-xs text-[#8A92A6] mt-1 leading-relaxed">
                  When enabled, if an AI provider returns an HTTP 401 Unauthorized, 403 Forbidden, or expired token error, the gateway immediately suppresses the error and routes the request to the next provider in priority order.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFailoverOnAuth(!failoverOnAuth)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  failoverOnAuth ? 'bg-[#7C5CFF]' : 'bg-[#232733]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    failoverOnAuth ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Per-provider Timeout Setting */}
          <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733] space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F1F3F9]">
                Per-provider Request Timeout
              </h3>
              <p className="text-xs text-[#8A92A6] mt-1 leading-relaxed">
                Maximum time (in milliseconds) the gateway waits for a model provider to start streaming or return tokens before classifying it as timed out and triggering failover.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="text-[11px] font-mono-code uppercase text-[#8A92A6] block mb-1">
                  Timeout in Milliseconds (Default: 30000ms)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1000"
                    max="120000"
                    step="1000"
                    value={timeoutMs}
                    onChange={(e) => setTimeoutMs(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs font-mono-code text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
                  />
                  <span className="text-xs text-[#8A92A6] font-mono-code shrink-0">
                    ({(timeoutMs / 1000).toFixed(0)}s)
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono-code uppercase text-[#8A92A6] block mb-1">
                  Max Failover Retries
                </label>
                <select
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
                >
                  <option value={1}>1 Retry (Strict fail-fast)</option>
                  <option value={2}>2 Retries</option>
                  <option value={3}>3 Retries (Recommended standard)</option>
                  <option value={5}>5 Retries (Exhaustive chain)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-[#8A92A6]">
              Helper: If an upstream provider hangs longer than {timeoutMs}ms, the gateway aborts the TCP socket and re-submits the continuous memory turn to the next healthy provider.
            </div>
          </div>

          {/* Rate Limit Quarantine Cooldown */}
          <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733] space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F1F3F9]">
                Rate Limit Quarantine Window
              </h3>
              <p className="text-xs text-[#8A92A6] mt-1 leading-relaxed">
                When a provider returns HTTP 429 Too Many Requests, automatically quarantine it for this cooldown duration before sending probe requests.
              </p>
            </div>

            <div className="w-full sm:w-1/2">
              <label className="text-[11px] font-mono-code uppercase text-[#8A92A6] block mb-1">
                Quarantine Duration (Seconds)
              </label>
              <input
                type="number"
                min="10"
                max="600"
                value={quarantineSec}
                onChange={(e) => setQuarantineSec(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs font-mono-code text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#7C5CFF] hover:bg-[#6D4BF0] text-xs font-semibold text-white shadow-sm shadow-[#7C5CFF]/30 transition-all"
            >
              Save Failover Policy
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
          <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733] space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#7C5CFF] to-[#3B82F6] flex items-center justify-center text-lg font-bold text-white shadow-md">
                AG
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#F1F3F9]">Abhishek Gupta</h3>
                <p className="text-xs text-[#8A92A6] font-mono-code">abhishekgupta.18052006@gmail.com</p>
                <span className="inline-block mt-1 text-[10px] font-mono-code bg-[#7C5CFF]/15 text-[#BFD4FF] border border-[#7C5CFF]/30 px-2 py-0.5 rounded">
                  Developer Plan
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#232733]">
              <div>
                <label className="text-xs font-medium text-[#F1F3F9] block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#F1F3F9] block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0D12]/60 border border-[#232733] text-xs text-[#8A92A6] font-mono-code cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#F1F3F9] block mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#7C5CFF] hover:bg-[#6D4BF0] text-xs font-semibold text-white shadow-sm shadow-[#7C5CFF]/30 transition-all"
            >
              Update Profile
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Security & Active Sessions */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-3xl">
          {/* Change Password Form */}
          <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733] space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F3F9] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#7C5CFF]" />
              Change Password
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[#8A92A6] block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#8A92A6] block mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8A92A6] block mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  addToast({
                    type: 'success',
                    title: 'Password updated',
                    description: 'Your login credentials have been changed.',
                  });
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#181C26] hover:bg-[#1E2330] border border-[#232733] text-xs font-medium text-[#F1F3F9]"
              >
                Save New Password
              </button>
            </div>
          </div>

          {/* Active Sessions Table */}
          <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733] space-y-3">
            <h3 className="text-sm font-semibold text-[#F1F3F9]">Active Sessions</h3>
            <p className="text-xs text-[#8A92A6]">
              Devices and clients currently authenticated with your ContinumAI account.
            </p>

            <div className="divide-y divide-[#232733]/60">
              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Laptop className="w-5 h-5 text-[#7C5CFF]" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#F1F3F9]">
                        MacBook Pro — Chrome 133
                      </span>
                      <span className="text-[10px] font-mono-code bg-[#10B981]/15 text-[#10B981] px-1.5 py-0.2 rounded">
                        This Device
                      </span>
                    </div>
                    <span className="text-[11px] text-[#8A92A6] font-mono-code">
                      IP: 103.21.244.18 • Mumbai, India
                    </span>
                  </div>
                </div>
                <span className="text-xs text-[#10B981] font-mono-code">Active now</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-[#8A92A6]" />
                  <div>
                    <span className="text-xs font-medium text-[#F1F3F9]">
                      iPhone 16 Pro — Safari
                    </span>
                    <p className="text-[11px] text-[#8A92A6] font-mono-code">
                      IP: 49.36.12.8 • Mumbai, India
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    addToast({
                      type: 'warning',
                      title: 'Session terminated',
                      description: 'Signed out of iPhone 16 Pro.',
                    })
                  }
                  className="text-xs text-[#EF4444] hover:underline"
                >
                  Revoke
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone: Delete Account */}
          <div className="p-5 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/30 space-y-3">
            <h3 className="text-sm font-semibold text-[#EF4444]">Danger Zone: Delete Account</h3>
            <p className="text-xs text-[#8A92A6] leading-relaxed">
              Permanently delete your account, encrypted provider keys, and all memory graph records.
              This operation cannot be reversed.
            </p>
            <button
              type="button"
              onClick={() =>
                addToast({
                  type: 'error',
                  title: 'Account deletion protected',
                  description: 'Please contact team support to wipe organization root.',
                })
              }
              className="px-3.5 py-1.5 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-xs font-semibold text-white"
            >
              Delete ContinumAI Account
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Data & Retention */}
      {activeTab === 'data' && (
        <div className="space-y-6 max-w-3xl">
          {/* Export Data */}
          <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733] space-y-3">
            <h3 className="text-sm font-semibold text-[#F1F3F9] flex items-center gap-2">
              <Download className="w-4 h-4 text-[#7C5CFF]" />
              Export Shared Memory Chains
            </h3>
            <p className="text-xs text-[#8A92A6] leading-relaxed">
              Download your complete memory graph lineage, turn trees, and checkpoint summaries in standard machine-readable format.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleExportData('json')}
                className="px-3.5 py-1.5 rounded-lg bg-[#181C26] hover:bg-[#1E2330] border border-[#232733] text-xs font-medium text-[#F1F3F9] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export as JSON</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportData('csv')}
                className="px-3.5 py-1.5 rounded-lg bg-[#181C26] hover:bg-[#1E2330] border border-[#232733] text-xs font-medium text-[#F1F3F9] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export as CSV</span>
              </button>
            </div>
          </div>

          {/* Delete All Sessions & Reset Memory */}
          <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733] space-y-3">
            <h3 className="text-sm font-semibold text-[#F1F3F9] flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-[#EF4444]" />
              Wipe All Memory Graph Sessions
            </h3>
            <p className="text-xs text-[#8A92A6] leading-relaxed">
              Purges all 86 saved memory sessions and node histories from the gateway database.
              Your provider keys and endpoint configurations will remain intact.
            </p>

            <button
              type="button"
              onClick={() => setIsWipeModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/40 text-xs font-medium text-[#EF4444] transition-colors"
            >
              Wipe All Sessions
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Session Wipe */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md bg-[#12151C] border border-[#232733] rounded-xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#F1F3F9] mb-1">
              Wipe all memory chains?
            </h3>
            <p className="text-xs text-[#8A92A6] leading-relaxed mb-4">
              This will erase all past conversation node histories across all models.
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsWipeModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#181C26] text-xs font-medium text-[#8A92A6] hover:text-[#F1F3F9]"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeSessions}
                className="px-3.5 py-1.5 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-xs font-semibold text-white"
              >
                Yes, wipe memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
