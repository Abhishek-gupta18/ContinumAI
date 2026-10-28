import React, { useState, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Shield,
  Download,
} from 'lucide-react';
import { PROVIDER_THEMES } from '../../data/dashboardData';
import { ProviderId } from '../../types/dashboard';

export const ActivityLogPage: React.FC = () => {
  const { activityLogs } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '200' | 'failover' | 'blocked'>('all');
  const [providerFilter, setProviderFilter] = useState<'all' | ProviderId>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>('act-9921');

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      // Search
      if (
        searchQuery &&
        !log.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.finalModel.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Status
      const hasFailover = log.providerChain.length > 1;
      if (statusFilter === '200' && (log.statusCode !== 200 || hasFailover)) return false;
      if (statusFilter === 'failover' && !hasFailover) return false;
      if (statusFilter === 'blocked' && log.statusCode === 200) return false;

      // Provider
      if (providerFilter !== 'all') {
        const involvesProvider = log.providerChain.some((p) => p.provider === providerFilter);
        if (!involvesProvider) return false;
      }

      return true;
    });
  }, [activityLogs, searchQuery, statusFilter, providerFilter]);

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#232733]/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F9]">
            Gateway Activity & Failover Log
          </h1>
          <p className="text-xs sm:text-sm text-[#8A92A6] mt-1">
            Real-time trace logs of incoming completions requests and autonomous failover chains.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono-code text-[#BFD4FF] bg-[#12151C] border border-[#232733] px-2.5 py-1 rounded-lg">
            {filteredLogs.length} Records Shown
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#12151C] border border-[#232733] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#8A92A6] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by session, id, or model..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] placeholder-[#8A92A6] focus:outline-none focus:border-[#7C5CFF]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
          >
            <option value="all">All Statuses</option>
            <option value="failover">Failover Handled</option>
            <option value="200">Direct 200 OK</option>
            <option value="blocked">Blocked / Error</option>
          </select>

          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733] text-xs text-[#F1F3F9] focus:outline-none focus:border-[#7C5CFF]"
          >
            <option value="all">All Providers</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="claude">Anthropic Claude</option>
            <option value="nvidia">NVIDIA NIM</option>
          </select>
        </div>

        <div className="text-[11px] text-[#8A92A6] flex items-center gap-1.5 self-end md:self-auto font-mono-code">
          <Shield className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Redacted: No secrets or raw API keys appear in telemetry</span>
        </div>
      </div>

      {/* Dense Table */}
      <div className="rounded-xl bg-[#12151C] border border-[#232733] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0B0D12]/70 border-b border-[#232733] text-[#8A92A6] uppercase text-[10px] tracking-wider font-mono-code">
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Session ID</th>
                <th className="py-3 px-4 font-semibold">Provider Chain Attempted</th>
                <th className="py-3 px-4 font-semibold">Final Model</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Latency</th>
                <th className="py-3 px-4 text-center font-semibold w-10">Expand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232733]/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#8A92A6]">
                    No activity logs match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedRowId === log.id;
                  const hasFailover = log.providerChain.length > 1;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleRow(log.id)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? 'bg-[#181C26]/80' : 'hover:bg-[#181C26]/40'
                        }`}
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 font-mono-code text-[#8A92A6] whitespace-nowrap">
                          {log.timestamp}
                        </td>

                        {/* Session */}
                        <td className="py-3.5 px-4 font-mono-code text-[#BFD4FF] whitespace-nowrap">
                          {log.sessionId}
                        </td>

                        {/* Provider Chain Attempted (Small colored chips with arrows) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {log.providerChain.map((step, idx) => {
                              const theme = PROVIDER_THEMES[step.provider];
                              const isFailed = step.status === 'failed';

                              return (
                                <React.Fragment key={idx}>
                                  <span
                                    className="px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold flex items-center gap-1"
                                    style={{
                                      color: isFailed ? '#EF4444' : theme.color,
                                      backgroundColor: isFailed ? 'rgba(239, 68, 68, 0.12)' : theme.bgSubtle,
                                      border: `1px solid ${isFailed ? 'rgba(239, 68, 68, 0.3)' : theme.border}`,
                                    }}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{ backgroundColor: isFailed ? '#EF4444' : theme.color }}
                                    />
                                    {theme.name} [{step.code}]
                                  </span>

                                  {idx < log.providerChain.length - 1 && (
                                    <ArrowRight className="w-3 h-3 text-[#8A92A6]" />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </td>

                        {/* Final Model */}
                        <td className="py-3.5 px-4 font-mono-code text-[#F1F3F9]">
                          {log.finalModel}
                        </td>

                        {/* Status Code */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {hasFailover ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 font-mono-code">
                              Failover 200
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-mono-code">
                              200 OK
                            </span>
                          )}
                        </td>

                        {/* Latency */}
                        <td className="py-3.5 px-4 text-right font-mono-code text-[#8A92A6] whitespace-nowrap">
                          {log.latencyMs}ms
                        </td>

                        {/* Toggle Icon */}
                        <td className="py-3.5 px-4 text-center text-[#8A92A6]">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 mx-auto" />
                          ) : (
                            <ChevronDown className="w-4 h-4 mx-auto" />
                          )}
                        </td>
                      </tr>

                      {/* Expandable Details Row */}
                      {isExpanded && (
                        <tr className="bg-[#0B0D12]/90 border-b border-[#232733]">
                          <td colSpan={7} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Error / Handoff Diagnosis */}
                              <div className="md:col-span-2 p-3 rounded-lg bg-[#12151C] border border-[#232733] space-y-1.5">
                                <span className="text-[10px] uppercase font-mono-code tracking-wider text-[#8A92A6] block font-semibold">
                                  Handoff Diagnosis & Error Classification
                                </span>
                                <p className="text-xs text-[#E5E7EB] leading-relaxed">
                                  {log.errorClassification || 'Direct request served successfully on primary provider with zero retry overhead.'}
                                </p>

                                {log.checkpointId && (
                                  <div className="text-[11px] font-mono-code text-[#BFD4FF] pt-1">
                                    Linked Checkpoint: {log.checkpointId} (Memory state preserved)
                                  </div>
                                )}
                              </div>

                              {/* Token Consumption */}
                              <div className="p-3 rounded-lg bg-[#12151C] border border-[#232733] space-y-1">
                                <span className="text-[10px] uppercase font-mono-code tracking-wider text-[#8A92A6] block font-semibold">
                                  Token Telemetry
                                </span>
                                <div className="flex justify-between text-[11px] text-[#8A92A6]">
                                  <span>Prompt tokens:</span>
                                  <span className="font-mono-code text-[#F1F3F9]">{log.tokensPrompt}</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-[#8A92A6]">
                                  <span>Completion tokens:</span>
                                  <span className="font-mono-code text-[#F1F3F9]">{log.tokensCompletion}</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-[#8A92A6] pt-1 border-t border-[#232733]">
                                  <span>Total tokens:</span>
                                  <span className="font-mono-code text-[#10B981] font-semibold">
                                    {log.tokensPrompt + log.tokensCompletion}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
