'use client';

import { useEffect, useState } from 'react';
import { Shield, Download, Trash2, ToggleLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface Consent {
  id: string;
  purpose: string;
  granted_at: string;
  revoked_at: string | null;
}

interface ExportData {
  exportedAt: string;
  gdprBasis: string;
  user: { id: string; role: string; createdAt: string };
  consents: Consent[];
}

export default function GDPRPage() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [exporting, setExporting] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [eraseConfirm, setEraseConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchConsents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/gdpr/consents');
      setConsents(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Kunne ikke hente samtykker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConsents(); }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      setError('');
      const res = await api.get('/gdpr/export');
      setExportData(res.data);
      setSuccessMsg('Data eksporteret (GDPR Art. 15)');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Eksport fejlede');
    } finally {
      setExporting(false);
    }
  };

  const handleRevokeConsent = async (id: string) => {
    try {
      setError('');
      await api.delete(`/gdpr/consents/${id}`);
      setSuccessMsg('Samtykke tilbagetrukket');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchConsents();
    } catch (err: any) {
      setError(err.message || 'Tilbagekald fejlede');
    }
  };

  const handleErase = async () => {
    if (!eraseConfirm) {
      setEraseConfirm(true);
      return;
    }
    try {
      setErasing(true);
      setError('');
      const res = await api.delete('/gdpr/erase');
      setSuccessMsg(res.data?.message || 'Data slettet (GDPR Art. 17)');
      setEraseConfirm(false);
    } catch (err: any) {
      setError(err.message || 'Sletning fejlede');
    } finally {
      setErasing(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 flex items-start space-x-4">
        <div className="p-3 bg-purple-50 rounded-lg">
          <Shield className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">GDPR Compliance</h2>
          <p className="text-slate-600 text-sm mt-1">
            Administrer dine rettigheder under GDPR — indsigt, samtykker og sletning.
          </p>
        </div>
      </div>

      {/* Success */}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Eksport */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Ret til indsigt</h3>
              <p className="text-xs text-slate-500">GDPR Art. 15 — Eksporter dine data</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {exporting ? 'Eksporterer...' : 'Eksporter mine data'}
          </button>
          {exportData && (
            <div className="mt-3 p-3 bg-slate-50 rounded text-xs text-slate-600 space-y-1">
              <p><span className="font-medium">Eksporteret:</span> {new Date(exportData.exportedAt).toLocaleString('da-DK')}</p>
              <p><span className="font-medium">Hjemmel:</span> {exportData.gdprBasis}</p>
              <p><span className="font-medium">Rolle:</span> {exportData.user?.role}</p>
              <p><span className="font-medium">Oprettet:</span> {exportData.user?.createdAt ? new Date(exportData.user.createdAt).toLocaleDateString('da-DK') : '-'}</p>
            </div>
          )}
        </div>

        {/* Slet data */}
        <div className="bg-white rounded-lg border border-red-200 p-6 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Ret til at blive glemt</h3>
              <p className="text-xs text-slate-500">GDPR Art. 17 — Slet alle dine data</p>
            </div>
          </div>
          {eraseConfirm && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Dette kan <strong>ikke fortrydes</strong>. Dine data slettes permanent. Klik igen for at bekræfte.</span>
            </div>
          )}
          <button
            onClick={handleErase}
            disabled={erasing}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              eraseConfirm
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            }`}
          >
            {erasing ? 'Sletter...' : eraseConfirm ? '⚠ Bekræft sletning' : 'Slet mine data'}
          </button>
          {eraseConfirm && (
            <button
              onClick={() => setEraseConfirm(false)}
              className="w-full px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
            >
              Annuller
            </button>
          )}
        </div>
      </div>

      {/* Samtykker */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ToggleLeft className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Mine samtykker</h3>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            {consents.filter(c => !c.revoked_at).length} aktive
          </span>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Formål</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Givet</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Handling</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">
                  Henter samtykker...
                </td>
              </tr>
            ) : consents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">
                  Ingen samtykker registreret
                </td>
              </tr>
            ) : (
              consents.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{c.purpose}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(c.granted_at).toLocaleDateString('da-DK')}
                  </td>
                  <td className="px-6 py-4">
                    {c.revoked_at ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">
                        Tilbagekaldt
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-600">
                        Aktiv
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {!c.revoked_at && (
                      <button
                        onClick={() => handleRevokeConsent(c.id)}
                        className="text-xs text-red-600 hover:text-red-700 hover:underline"
                      >
                        Tilbagekald
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
