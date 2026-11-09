import React from 'react';
import { ApiKeyStatus } from '../types';
import { KeyRound, ShieldCheck, X, RefreshCw, Cpu, Activity } from 'lucide-react';

interface ApiStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ApiKeyStatus | null;
}

export const ApiStatusModal: React.FC<ApiStatusModalProps> = ({ isOpen, onClose, status }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Intelligent 3-Key Gemini Pool Manager</h2>
            <p className="text-xs text-slate-500">Autonomous load-balanced failover & quota resilience</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          EDUAGENT protects platform uptime by rotating requests across up to 3 independently configured Gemini Flash
          API keys. When rate limits (HTTP 429) or quota exhaustion occurs on any key, the coordination engine
          automatically redirects execution to the next healthy key with zero student interruption.
        </p>

        {/* Status Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block font-medium">Configured Keys</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {status?.configuredCount || 3}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">Pool Ready</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block font-medium">Total Failovers</span>
            <div className="text-lg font-bold text-blue-600 mt-0.5">
              {status?.totalFailovers || 0}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Automatic</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block font-medium">Target Model</span>
            <div className="text-xs font-mono font-bold text-slate-800 mt-1 truncate">
              {status?.model || 'gemini-3.8-flash'}
            </div>
            <span className="text-[10px] text-blue-600 font-medium">GenAI SDK</span>
          </div>
        </div>

        {/* Masked Key Health Breakdown */}
        <div className="space-y-2 mb-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Key Pool Health Status (Credentials Masked)
          </span>

          {status?.keys && status.keys.length > 0 ? (
            status.keys.map((k, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      k.isHealthy ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                    }`}
                  />
                  <span className="font-mono font-semibold text-slate-700">{k.maskedId}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">Calls: {k.totalCalls}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                      k.isHealthy
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {k.isHealthy ? 'Operational' : 'Cooldown'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="font-mono text-slate-700 font-medium">GEMINI_API_KEY_1 (Primary)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Active
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="font-mono text-slate-700 font-medium">GEMINI_API_KEY_2 (Failover 1)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Standby
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="font-mono text-slate-700 font-medium">GEMINI_API_KEY_3 (Failover 2)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Standby
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Instructions Box */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs">
          <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Multi-Key Setup</span>
          </div>
          <p className="text-slate-500 leading-relaxed text-[11px]">
            To activate 3-key failover rotation, set your keys in the project <code className="text-blue-600 font-mono font-semibold">.env</code>:
          </p>
          <div className="mt-2 p-2 bg-white rounded-lg font-mono text-[11px] text-slate-700 space-y-0.5 border border-slate-200">
            <div><span className="text-slate-400">GEMINI_API_KEY_1=</span>&quot;your-first-key&quot;</div>
            <div><span className="text-slate-400">GEMINI_API_KEY_2=</span>&quot;your-second-key&quot;</div>
            <div><span className="text-slate-400">GEMINI_API_KEY_3=</span>&quot;your-third-key&quot;</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
        >
          Close Monitor
        </button>
      </div>
    </div>
  );
};
