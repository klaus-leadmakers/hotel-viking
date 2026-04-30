'use client';
import { useState, useEffect, useRef } from 'react';

const OPS_URL = '/ops';
const OPS_TOKEN = 'ops-hvk-d3a5f2e1b8c9';

function opsReq(path: string, opts: RequestInit = {}) {
  return fetch(OPS_URL + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-ops-token': OPS_TOKEN, ...(opts.headers || {}) },
  });
}

function formatBytes(b: number) {
  if (!b) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k,i)).toFixed(1)) + ' ' + sizes[i];
}

interface Backup {
  id: string;
  createdAt: string;
  completedAt?: string;
  status: string;
  dbBytes: number;
  codeBytes: number;
  hasCode: boolean;
}

export default function OperationsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [activeBackupId, setActiveBackupId] = useState<string | null>(null);
  const [backupLog, setBackupLog] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoreLog, setRestoreLog] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployLog, setDeployLog] = useState('');
  const [showDeployConfirm, setShowDeployConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<Backup | null>(null);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLPreElement>(null);
  const restoreLogRef = useRef<HTMLPreElement>(null);

  useEffect(() => { loadBackups(); }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [deployLog, backupLog]);
  useEffect(() => { if (restoreLogRef.current) restoreLogRef.current.scrollTop = restoreLogRef.current.scrollHeight; }, [restoreLog]);

  async function loadBackups() {
    setLoadingBackups(true);
    try {
      const res = await opsReq('/backups');
      const data = await res.json();
      setBackups(data.backups || []);
    } catch(e: any) { setError('Kunne ikke hente backups: ' + e.message); }
    finally { setLoadingBackups(false); }
  }

  async function startBackup() {
    setBackingUp(true);
    setBackupLog('');
    setError('');
    try {
      const res = await opsReq('/backup', { method: 'POST', body: '{}' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setActiveBackupId(data.id);
      pollBackup(data.id);
    } catch(e: any) { setError('Backup fejlede: ' + e.message); setBackingUp(false); }
  }

  async function pollBackup(id: string) {
    const poll = async () => {
      try {
        const res = await opsReq('/backup-status?id=' + id);
        const data = await res.json();
        setBackupLog(data.log || '');
        const done = data.status === 'completed' || (data.dbBytes > 0 && data.codeBytes > 0);
        if (done) { setBackingUp(false); setActiveBackupId(null); loadBackups(); }
        else setTimeout(poll, 2000);
      } catch { setTimeout(poll, 3000); }
    };
    setTimeout(poll, 2000);
  }

  async function startRestore(backup: Backup) {
    setShowRestoreConfirm(null);
    setRestoring(backup.id);
    setRestoreLog('');
    setError('');
    try {
      const res = await opsReq('/restore', { method: 'POST', body: JSON.stringify({ id: backup.id }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      pollLog('restore', data.logFile, setRestoreLog, () => setRestoring(null));
    } catch(e: any) { setError('Restore fejlede: ' + e.message); setRestoring(null); }
  }

  async function startDeploy() {
    setShowDeployConfirm(false);
    setDeploying(true);
    setDeployLog('');
    setError('');
    try {
      const res = await opsReq('/deploy', { method: 'POST', body: '{}' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      pollLog('deploy', data.logFile, setDeployLog, () => setDeploying(false));
    } catch(e: any) { setError('Deploy fejlede: ' + e.message); setDeploying(false); }
  }

  function pollLog(type: string, file: string, setter: (s:string)=>void, onDone: ()=>void) {
    const poll = async () => {
      try {
        const res = await opsReq('/' + type + '-log?file=' + encodeURIComponent(file));
        const data = await res.json();
        setter(data.log || '');
        if (data.done) onDone(); else setTimeout(poll, 2000);
      } catch { setTimeout(poll, 3000); }
    };
    setTimeout(poll, 1500);
  }

  function formatId(id: string) {
    // "2026-04-09_09-30-00" → "09/04/2026  09:30"
    const m = id.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})/);
    if (!m) return id;
    return m[3] + '/' + m[2] + '/' + m[1] + '  ' + m[4] + ':' + m[5];
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Backup 'n Deploy</h1>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Staging</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <span className="text-lg">⚠</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── BACKUP SECTION ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Backup</h2>
            <p className="text-sm text-gray-500 mt-0.5">Tager snapshot af database <span className="font-medium text-gray-700">og</span> kildekode</p>
          </div>
          <button
            onClick={startBackup}
            disabled={backingUp}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {backingUp ? <><span className="animate-spin inline-block">⟳</span> Opretter...</> : <><span>💾</span> Opret backup</>}
          </button>
        </div>

        {backingUp && backupLog && (
          <pre ref={logRef} className="px-6 py-3 text-xs font-mono text-gray-600 bg-blue-50 max-h-32 overflow-y-auto border-b border-gray-100 whitespace-pre-wrap">
            {backupLog}
          </pre>
        )}

        <div className="divide-y divide-gray-50">
          {loadingBackups ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Henter backups...</div>
          ) : backups.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Ingen backups endnu</div>
          ) : (
            backups.map(b => (
              <div key={b.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-900">{formatId(b.id)}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {b.dbBytes > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <span>🗄</span> DB: {formatBytes(b.dbBytes)}
                      </span>
                    )}
                    {b.hasCode ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <span>📦</span> Kode: {formatBytes(b.codeBytes)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <span>📦</span> Kun DB
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {b.status === 'running' ? '⟳ Kører...' : b.status === 'completed' ? '✓ Færdig' : b.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowRestoreConfirm(b)}
                  disabled={!!restoring || b.status === 'running'}
                  className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {restoring === b.id ? '⟳ Gendanner...' : '↩ Gendan'}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── RESTORE LOG ── */}
      {(restoring || restoreLog) && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              {restoring ? '⟳ Gendanner...' : '✓ Gendan færdig'}
            </h2>
            {!restoring && <button onClick={() => setRestoreLog('')} className="text-xs text-gray-400 hover:text-gray-600">Luk</button>}
          </div>
          <pre ref={restoreLogRef} className="px-6 py-4 text-xs font-mono text-gray-700 bg-gray-50 max-h-56 overflow-y-auto whitespace-pre-wrap">
            {restoreLog || 'Starter...'}
          </pre>
        </section>
      )}

      {/* ── DEPLOY SECTION ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Deploy til Live</h2>
            <p className="text-sm text-gray-500 mt-0.5">Kopierer al kode fra staging til live og genstarter live serverne</p>
          </div>
          <button
            onClick={() => setShowDeployConfirm(true)}
            disabled={deploying}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deploying ? <><span className="animate-spin inline-block">⟳</span> Deployer...</> : <><span>🚀</span> Deploy til live</>}
          </button>
        </div>
        {deployLog && (
          <pre ref={logRef} className="px-6 py-4 text-xs font-mono text-gray-700 bg-gray-50 max-h-64 overflow-y-auto border-t border-gray-100 whitespace-pre-wrap">
            {deployLog}
          </pre>
        )}
      </section>

      {/* ── RESTORE CONFIRM ── */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Bekræft gendan</h3>
            <p className="text-sm text-gray-600 mb-3">Backup fra <span className="font-medium">{formatId(showRestoreConfirm.id)}</span></p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <span>🗄</span>
                <span>Database gendannes ({formatBytes(showRestoreConfirm.dbBytes)})</span>
              </div>
              {showRestoreConfirm.hasCode ? (
                <div className="flex items-center gap-2 text-emerald-700">
                  <span>📦</span>
                  <span>Kildekode gendannes og admin genbuildes ({formatBytes(showRestoreConfirm.codeBytes)})</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <span>📦</span>
                  <span>Ingen kode-snapshot i denne backup</span>
                </div>
              )}
            </div>
            <p className="text-sm text-red-600 mb-6">⚠ Den nuværende staging database og kode vil blive overskrevet. Dette kan ikke fortrydes.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRestoreConfirm(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Annuller</button>
              <button onClick={() => startRestore(showRestoreConfirm)} className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700">Ja, gendan</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DEPLOY CONFIRM ── */}
      {showDeployConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bekræft deploy til live</h3>
            <p className="text-sm text-gray-600 mb-4">Dette vil synkronisere al kode fra staging til live og genstarte live services.</p>
            <p className="text-sm text-red-600 font-medium mb-6">⚠ Live siden vil være nede i et par minutter under deploy.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeployConfirm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Annuller</button>
              <button onClick={startDeploy} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Ja, deploy nu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
