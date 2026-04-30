'use client';

import { useEffect, useState } from 'react';
import { Activity, Users, Server, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface KPICard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPICard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true);
        setError('');

        const healthResponse = await api.get('/health');
        const usersResponse = await api.get('/users?limit=1');
        const environment = process.env.NODE_ENV;
        const loginTime = new Date().toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });

        setKpis([
          {
            title: 'API Health',
            value: healthResponse.data?.status === 'ok' ? '✓ Healthy' : '⚠ Degraded',
            icon: <Activity className="w-6 h-6" />,
            color: 'blue',
          },
          {
            title: 'Total Brugere',
            value: usersResponse.data?.total || 0,
            icon: <Users className="w-6 h-6" />,
            color: 'green',
          },
          {
            title: 'Environment',
            value: environment === 'production' ? 'Production' : 'Development',
            icon: <Server className="w-6 h-6" />,
            color: 'purple',
          },
          {
            title: 'Session start',
            value: loginTime,
            icon: <Clock className="w-6 h-6" />,
            color: 'orange',
          },
        ]);
      } catch (err: any) {
        setError(err.message || 'Failed to load KPIs');
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}


      {/* Miljoebadge */}
      {(() => {
        const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === 'true';
        return isStaging ? (
          <div className="mb-6 flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg w-fit">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block"></span>
            <span className="text-sm font-medium text-amber-700">Miljø: <strong>Staging</strong></span>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg w-fit">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            <span className="text-sm font-medium text-green-700">Miljø: <strong>Production</strong></span>
          </div>
        );
      })()}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className={`p-6 bg-white rounded-lg border transition-shadow hover:shadow-lg ${colorMap[kpi.color as keyof typeof colorMap]}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{kpi.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{kpi.value}</p>
              </div>
              <div className="p-3 rounded-lg bg-white bg-opacity-50">
                {kpi.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Welcome to Hotel Viking Admin</h2>
        <p className="text-slate-600">
          Use the navigation sidebar to access different sections of the admin panel.
        </p>
      </div>
    </div>
  );
}
