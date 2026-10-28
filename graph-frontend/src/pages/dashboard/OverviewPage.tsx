import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Zap,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { PROVIDER_THEMES, REQUESTS_BY_MODEL_DATA } from '../../data/dashboardData';

export const OverviewPage: React.FC = () => {
  const { providers, failovers, metrics, simulateFailover, addToast } = useDashboard();
  const navigate = useNavigate();
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<number | null>(null);

  const continuumEndpoint = 'https://gateway.continum.ai/v1/chat/completions';
  const curlSnippet = `curl https://gateway.continum.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer cnt_live_4f92••••••••••••" \\
  -d '{
    "model": "continum/auto-failover",
    "messages": [
      {"role": "user", "content": "Analyze memory replication quorum"}
    ]
  }'`;

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(continuumEndpoint);
    setCopiedEndpoint(true);
    addToast({
      type: 'success',
      title: 'Copied endpoint',
      description: 'Continuum gateway URL copied to clipboard.',
    });
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopiedSnippet(true);
    addToast({
      type: 'success',
      title: 'Copied cURL snippet',
      description: 'Ready to run in your terminal.',
    });
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Sparkline data generators
  const sparkline1 = [28, 32, 35, 30, 38, 42, 40, 44, 48, 52, 58, 62];
  const sparkline2 = [18, 14, 16, 12, 15, 10, 8, 9, 6, 7, 5, 4];
  const sparkline3 = [480, 460, 450, 470, 440, 430, 420, 415, 412, 405, 408, 412];
  const sparkline4 = [64, 68, 70, 72, 75, 78, 80, 82, 84, 85, 86, 86];

  const renderSparkline = (data: number[], color: string) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const points = data
      .map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible shrink-0">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // Donut chart calculations
  const totalModelRequests = REQUESTS_BY_MODEL_DATA.reduce((acc, curr) => acc + curr.requests, 0);
  let accumulatedAngle = 0;
  const donutSegments = REQUESTS_BY_MODEL_DATA.map((item) => {
    const angle = (item.requests / totalModelRequests) * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;
    return {
      ...item,
      startAngle,
      angle,
    };
  });

  return (
    <div className="space-y-6">
      {/* Greeting Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#232733]/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F9]">
            Welcome back, Abhishek
          </h1>
          <p className="text-xs sm:text-sm text-[#8A92A6] mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#10B981]" />
            <span>
              {metrics.healthyCount} of {metrics.totalProviders} providers healthy
            </span>
            <span className="text-[#323849]">•</span>
            <span>Gateway running in priority failover mode</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/providers')}
            className="px-3.5 py-1.5 rounded-lg bg-[#7C5CFF] hover:bg-[#6D4BF0] text-xs font-medium text-white transition-all flex items-center gap-1.5 shadow-sm shadow-[#7C5CFF]/30"
          >
            <span>Manage Providers</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Requests (24h) */}
        <div className="p-4 rounded-xl bg-[#12151C] border border-[#232733] hover:border-[#323849] transition-all">
          <div className="flex items-center justify-between text-[#8A92A6] text-xs mb-2">
            <span>Requests (24h)</span>
            <span className="flex items-center text-[#10B981] font-medium text-[11px] gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              +12.4%
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold font-mono-code text-[#F1F3F9]">42,850</p>
              <p className="text-[11px] text-[#8A92A6] mt-0.5">vs 38,120 yesterday</p>
            </div>
            {renderSparkline(sparkline1, '#7C5CFF')}
          </div>
        </div>

        {/* Stat 2: Failovers (24h) */}
        <div className="p-4 rounded-xl bg-[#12151C] border border-[#232733] hover:border-[#323849] transition-all">
          <div className="flex items-center justify-between text-[#8A92A6] text-xs mb-2">
            <span>Failovers (24h)</span>
            <span className="flex items-center text-[#10B981] font-medium text-[11px] gap-0.5">
              <ArrowDownRight className="w-3 h-3" />
              -8.1%
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold font-mono-code text-[#F1F3F9]">142</p>
              <p className="text-[11px] text-[#8A92A6] mt-0.5">100% recovered silently</p>
            </div>
            {renderSparkline(sparkline2, '#10B981')}
          </div>
        </div>

        {/* Stat 3: Avg latency */}
        <div className="p-4 rounded-xl bg-[#12151C] border border-[#232733] hover:border-[#323849] transition-all">
          <div className="flex items-center justify-between text-[#8A92A6] text-xs mb-2">
            <span>Avg latency</span>
            <span className="flex items-center text-[#10B981] font-medium text-[11px] gap-0.5">
              <ArrowDownRight className="w-3 h-3" />
              -34ms
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold font-mono-code text-[#F1F3F9]">412ms</p>
              <p className="text-[11px] text-[#8A92A6] mt-0.5">p99 = 1,120ms</p>
            </div>
            {renderSparkline(sparkline3, '#3B82F6')}
          </div>
        </div>

        {/* Stat 4: Active sessions */}
        <div className="p-4 rounded-xl bg-[#12151C] border border-[#232733] hover:border-[#323849] transition-all">
          <div className="flex items-center justify-between text-[#8A92A6] text-xs mb-2">
            <span>Active sessions</span>
            <span className="flex items-center text-[#10B981] font-medium text-[11px] gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              +18.0%
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold font-mono-code text-[#F1F3F9]">86</p>
              <p className="text-[11px] text-[#8A92A6] mt-0.5">Shared memory active</p>
            </div>
            {renderSparkline(sparkline4, '#F97316')}
          </div>
        </div>
      </div>

      {/* Main Grid: Provider Health (Left 7 cols) & Model Donut + Failover timeline (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Provider Health Card */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#F1F3F9]">Provider Health & Priority Chain</h2>
                <p className="text-xs text-[#8A92A6] mt-0.5">
                  Ordered 1..n. Requests route to #1; on failure, automatically flow down the chain.
                </p>
              </div>
              <button
                onClick={() => navigate('/providers')}
                className="text-xs text-[#7C5CFF] hover:text-[#9B82FF] font-medium flex items-center gap-1"
              >
                Configure
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Provider List Table */}
            <div className="divide-y divide-[#232733]/60">
              {providers
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map((p) => {
                  const theme = PROVIDER_THEMES[p.provider];
                  let statusDot = 'bg-[#10B981]';
                  let statusText = 'Healthy';
                  if (p.status === 'rate-limited') {
                    statusDot = 'bg-[#F59E0B]';
                    statusText = 'Rate-limited';
                  } else if (p.status === 'auth-error') {
                    statusDot = 'bg-[#EF4444]';
                    statusText = 'Auth error';
                  } else if (p.status === 'timeout') {
                    statusDot = 'bg-[#F59E0B]';
                    statusText = 'Timeout';
                  } else if (p.status === 'disabled') {
                    statusDot = 'bg-[#8A92A6]';
                    statusText = 'Disabled';
                  }

                  return (
                    <div
                      key={p.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-[#181C26]/50 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center text-xs font-mono-code text-[#8A92A6] font-semibold">
                          #{p.priority}
                        </span>
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: theme.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#F1F3F9] group-hover:text-white">
                              {p.name}
                            </span>
                            <span
                              className="text-[10px] px-1.5 py-0.2 rounded font-mono-code"
                              style={{
                                color: theme.color,
                                backgroundColor: theme.bgSubtle,
                                border: `1px solid ${theme.border}`,
                              }}
                            >
                              {p.model}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#8A92A6] mt-0.5">
                            <span className="font-mono-code">{p.maskedKey}</span>
                            <span>•</span>
                            <span>Success: {p.lastSuccess}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right metrics: Status dot, success rate bar */}
                      <div className="flex items-center gap-4 sm:ml-auto">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                          <span
                            className={
                              p.status === 'rate-limited'
                                ? 'text-[#F59E0B] font-medium'
                                : 'text-[#8A92A6]'
                            }
                          >
                            {statusText}
                          </span>
                        </div>

                        {/* Success rate bar */}
                        <div className="w-24 flex flex-col gap-1 text-right">
                          <span className="text-[11px] font-mono-code text-[#F1F3F9]">
                            {p.successRate}%
                          </span>
                          <div className="w-full bg-[#181C26] rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${p.successRate}%`,
                                backgroundColor: p.status === 'rate-limited' ? '#F59E0B' : '#10B981',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Quick Start Card with Endpoint & Curl snippet */}
          <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#F1F3F9]">Gateway Quick Start</h3>
                <p className="text-xs text-[#8A92A6] mt-0.5">
                  Send requests to your single Continuum endpoint. OpenAI SDK drop-in compatible.
                </p>
              </div>
              <button
                onClick={() => navigate('/api-access')}
                className="text-xs text-[#7C5CFF] hover:text-[#9B82FF] font-medium flex items-center gap-1"
              >
                API Keys
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Endpoint field */}
            <div className="mb-3.5">
              <label className="text-[11px] uppercase tracking-wider text-[#8A92A6] font-mono-code mb-1.5 block">
                Your Continuum Gateway Endpoint
              </label>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0B0D12] border border-[#232733]">
                <code className="text-xs font-mono-code text-[#BFD4FF] truncate">
                  {continuumEndpoint}
                </code>
                <button
                  onClick={handleCopyEndpoint}
                  className="text-[#8A92A6] hover:text-white p-1 rounded transition-colors ml-2"
                  title="Copy endpoint"
                >
                  {copiedEndpoint ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Code snippet */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] uppercase tracking-wider text-[#8A92A6] font-mono-code">
                  cURL Request
                </span>
                <button
                  onClick={handleCopySnippet}
                  className="flex items-center gap-1 text-[11px] text-[#7C5CFF] hover:text-[#9B82FF]"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3 h-3 text-[#10B981]" />
                      <span className="text-[#10B981]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy snippet</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-[#0B0D12] border border-[#232733] text-[11px] font-mono-code text-[#E5E7EB] overflow-x-auto leading-relaxed">
                {curlSnippet}
              </pre>
            </div>
          </div>
        </div>

        {/* Right Column: Model Donut Chart & Recent Failovers */}
        <div className="lg:col-span-5 space-y-6">
          {/* Requests by Model Donut */}
          <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733]">
            <h3 className="text-sm font-semibold text-[#F1F3F9] mb-1">Requests by Model</h3>
            <p className="text-xs text-[#8A92A6] mb-4">
              Distribution of served tokens across provider backends
            </p>

            <div className="flex items-center justify-center py-2">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  {donutSegments.map((seg, idx) => {
                    const strokeDash = `${seg.angle} ${360 - seg.angle}`;
                    const strokeOffset = -seg.startAngle;
                    const isHovered = hoveredDonutSegment === idx;
                    return (
                      <circle
                        key={seg.provider}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth={isHovered ? '14' : '10'}
                        strokeDasharray={strokeDash}
                        strokeDashoffset={strokeOffset}
                        pathLength="360"
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredDonutSegment(idx)}
                        onMouseLeave={() => setHoveredDonutSegment(null)}
                      />
                    );
                  })}
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xs text-[#8A92A6] font-medium">Total 24h</span>
                  <span className="text-lg font-bold font-mono-code text-[#F1F3F9]">
                    42.8k
                  </span>
                </div>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {REQUESTS_BY_MODEL_DATA.map((item, idx) => (
                <div
                  key={item.provider}
                  onMouseEnter={() => setHoveredDonutSegment(idx)}
                  onMouseLeave={() => setHoveredDonutSegment(null)}
                  className={`flex items-center justify-between p-2 rounded-lg bg-[#0B0D12] border border-[#232733] transition-colors cursor-default ${
                    hoveredDonutSegment === idx ? 'border-[#323849] bg-[#181C26]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] text-[#F1F3F9] font-medium">{item.name}</span>
                  </div>
                  <span className="text-[11px] font-mono-code text-[#8A92A6]">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Failovers Timeline */}
          <div className="p-5 rounded-xl bg-[#12151C] border border-[#232733]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#F1F3F9]">Recent Failovers</h3>
                <p className="text-xs text-[#8A92A6] mt-0.5">
                  Silent switches preserving memory chains
                </p>
              </div>
              <button
                onClick={() => navigate('/activity')}
                className="text-xs text-[#7C5CFF] hover:text-[#9B82FF] font-medium flex items-center gap-1"
              >
                All Logs
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {failovers.slice(0, 4).map((f) => {
                const fromTheme = PROVIDER_THEMES[f.fromProvider];
                const toTheme = PROVIDER_THEMES[f.toProvider];

                return (
                  <div
                    key={f.id}
                    className="p-3 rounded-lg bg-[#0B0D12] border border-[#232733] hover:border-[#323849] transition-all"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      {/* Provider Transition Badges */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                          style={{
                            color: fromTheme.color,
                            backgroundColor: fromTheme.bgSubtle,
                            border: `1px solid ${fromTheme.border}`,
                          }}
                        >
                          {fromTheme.name}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[#8A92A6]" />
                        <span className="text-[10px] text-[#EF4444] font-mono-code bg-[#EF4444]/10 px-1.5 py-0.5 rounded border border-[#EF4444]/30">
                          {f.errorCode}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[#8A92A6]" />
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                          style={{
                            color: toTheme.color,
                            backgroundColor: toTheme.bgSubtle,
                            border: `1px solid ${toTheme.border}`,
                          }}
                        >
                          {toTheme.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8A92A6] font-mono-code">{f.timestamp}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#8A92A6] mt-1">
                      <span className="truncate pr-2">{f.errorDescription}</span>
                      <span className="font-mono-code text-[#10B981] shrink-0 font-medium">
                        {(f.latencyMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
