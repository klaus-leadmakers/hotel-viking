'use client';

import { useEffect, useState } from 'react';
import { Settings, CheckCircle, XCircle, Eye, EyeOff, Save, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface MewsStatus {
  configured: boolean;
  environment: string;
  apiUrl: string;
  message: string;
}

interface HotelConfig {
  Enterprise?: {
    Name?: string;
    TimeZoneIdentifier?: string;
    DefaultLanguageCode?: string;
    CurrencyCode?: string;
  };
}

export default function MewsPage() {
  const [status, setStatus]       = useState<MewsStatus | null>(null);
  const [hotelConfig, setHotelConfig] = useState<HotelConfig | null>(null);
  const [loading, setLoading]     = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // Token form
  const [accessToken, setAccessToken] = useState('');
  const [clientToken, setClientToken] = useState('');
  const [environment, setEnvironment] = useState('demo');
  const [showAccess, setShowAccess]   = useState(false);
  const [showClient, setShowClient]   = useState(false);
  const [saving, setSaving]           = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/mews/status');
      setStatus(res.data);
      setEnvironment(res.data.environment ?? 'demo');
    } catch (err: any) {
      setError(err.message || 'Kunne ikke hente Mews status');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await api.get('/mews/configuration');
      setHotelConfig(res.data);
    } catch {
      // Ikke konfigureret endnu – OK
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchConfig();
  }, []);

  const handleSaveTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const body: any = { environment };
      if (accessToken) body.accessToken = accessToken;
      if (clientToken) body.clientToken = clientToken;
      const res = await api.patch('/mews/tokens', body);
      setSuccess(res.data?.message ?? 'Tokens gemt');
      setTimeout(() => setSuccess(''), 5000);
      setAccessToken(''); setClientToken('');
      await fetchStatus();
      await fetchConfig();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Gem fejlede');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Mews PMS Integration</h2>
            <p className="text-slate-500 text-sm mt-0.5">Property Management System konfiguration</p>
          </div>
        </div>
        <button
          onClick={() => { fetchStatus(); fetchConfig(); }}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Opdater"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Feedback */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Status kort */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Forbindelsesstatus</h3>
        {loading ? (
          <p className="text-slate-500 text-sm">Henter status...</p>
        ) : status ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</p>
              <div className="flex items-center space-x-2">
                {status.configured
                  ? <CheckCircle className="w-5 h-5 text-green-500" />
                  : <XCircle className="w-5 h-5 text-red-500" />}
                <span className={`font-medium text-sm ${status.configured ? 'text-green-700' : 'text-red-700'}`}>
                  {status.configured ? 'Forbundet' : 'Ikke konfigureret'}
                </span>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Miljø</p>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                status.environment === 'production'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {status.environment?.toUpperCase() ?? 'DEMO'}
              </span>
            </div>
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">API URL</p>
              <p className="text-xs font-mono text-slate-700 truncate">{status.apiUrl ?? '—'}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Hotel data fra Mews */}
      {status?.configured && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Hotel konfiguration (fra Mews)</h3>
          {configLoading ? (
            <p className="text-slate-500 text-sm">Henter data fra Mews...</p>
          ) : hotelConfig?.Enterprise ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['Hotelnavn',  hotelConfig.Enterprise.Name],
                ['Tidszone',   hotelConfig.Enterprise.TimeZoneIdentifier],
                ['Sprog',      hotelConfig.Enterprise.DefaultLanguageCode],
                ['Valuta',     hotelConfig.Enterprise.CurrencyCode],
              ].map(([label, val]) => (
                <div key={label} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                  <p className="font-medium text-slate-900 text-sm">{val ?? '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Ingen hoteldata tilgængelig fra Mews endnu.</p>
          )}
        </div>
      )}

      {/* Token konfiguration */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-1">Opdater API tokens</h3>
        <p className="text-slate-500 text-sm mb-6">
          Tokens aktiveres med det samme og gemmes i .env for persistens.
          Find dem i Mews Commander under <span className="font-mono bg-slate-100 px-1 rounded">Settings → Integrations</span>.
        </p>

        <form onSubmit={handleSaveTokens} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Miljø</label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full md:w-64 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="demo">Demo (test)</option>
              <option value="production">Production (live)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Access Token
                <span className="ml-1 text-xs text-slate-400">(lad stå tomt for at beholde nuværende)</span>
              </label>
              <div className="relative">
                <input
                  type={showAccess ? 'text' : 'password'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 pr-10 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setShowAccess(!showAccess)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  {showAccess ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Client Token
                <span className="ml-1 text-xs text-slate-400">(lad stå tomt for at beholde nuværende)</span>
              </label>
              <div className="relative">
                <input
                  type={showClient ? 'text' : 'password'}
                  value={clientToken}
                  onChange={(e) => setClientToken(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 pr-10 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setShowClient(!showClient)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  {showClient ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || (!accessToken && !clientToken && !environment)}
            className="flex items-center space-x-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Gemmer...' : 'Gem tokens'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
