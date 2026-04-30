'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, X, Eye, EyeOff, Trash2, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface User {
  id: string;
  emailEnc?: any;
  emailHash?: string;
  role: string;
  createdAt: string;
}

function decodeEmail(emailEnc: any): string {
  if (!emailEnc) return '—';
  // TypeORM returnerer bytea som { type: 'Buffer', data: [...] }
  if (typeof emailEnc === 'object' && emailEnc.type === 'Buffer' && Array.isArray(emailEnc.data)) {
    try { return new TextDecoder().decode(new Uint8Array(emailEnc.data)); } catch { /* fall */ }
  }
  // Base64 string
  if (typeof emailEnc === 'string') {
    try { return atob(emailEnc); } catch { return emailEnc; }
  }
  return '—';
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 border-red-200',
  ADMIN:       'bg-blue-100 text-blue-700 border-blue-200',
  USER:        'bg-slate-100 text-slate-700 border-slate-200',
};

export default function UsersPage() {
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);

  // Create form
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [role, setRole]           = useState('USER');
  const [showPw, setShowPw]       = useState(false);
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/users');
      setUsers(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(err.message || 'Kunne ikke hente brugere');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setCreating(true);
      setCreateError('');
      await api.post('/auth/register', { email, password, role });
      setSuccess(`Bruger "${email}" oprettet`);
      setTimeout(() => setSuccess(''), 5000);
      setShowModal(false);
      setEmail(''); setPassword(''); setRole('USER');
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.message || 'Oprettelse fejlede');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, displayEmail: string) => {
    if (!confirm(`Slet bruger "${displayEmail}"? Handlingen kan ikke fortrydes.`)) return;
    try {
      await api.delete(`/users/${id}`);
      setSuccess(`Bruger slettet`);
      setTimeout(() => setSuccess(''), 4000);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const filtered = users.filter((u) => {
    const email = decodeEmail(u.emailEnc).toLowerCase();
    return email.includes(search.toLowerCase()) || u.role?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Søg efter email eller rolle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Opret bruger</span>
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

      {/* Tabel */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Rolle</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Oprettet</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Handling</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-sm">Henter brugere...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-sm">Ingen brugere fundet</td></tr>
            ) : (
              filtered.map((u) => {
                const displayEmail = decodeEmail(u.emailEnc);
                return (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900 font-mono">{displayEmail}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[u.role] ?? ROLE_COLORS.USER}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('da-DK') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(u.id, displayEmail)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Slet bruger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Opret ny bruger</h2>
              <button
                onClick={() => { setShowModal(false); setCreateError(''); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bruger@hotel.dk"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adgangskode</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 tegn"
                    className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rolle</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="USER">USER — Basis adgang</option>
                  <option value="ADMIN">ADMIN — Kan se brugere og Mews data</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN — Fuld adgang</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setCreateError(''); }}
                  className="flex-1 px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {creating ? 'Opretter...' : 'Opret bruger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
