import React, { useEffect, useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  ArrowRight, 
  ShieldAlert,
  Layers,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { AuditLog, User, Company } from '../types';

interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  totalSalesValue: number;
  totalPurchaseValue: number;
  totalOrders: number;
  totalUsers: number;
  yearlyChartData: { month: string; sales: number; purchases: number; count: number }[];
}

interface DashboardViewProps {
  currentUser: User;
  company: Company;
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ currentUser, company, onNavigate }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // fetch stats
      const statsRes = await fetch('/api/stats');
      if (!statsRes.ok) throw new Error('Failed to load statistical dashboard telemetry.');
      const statsData = await statsRes.json();
      setStats(statsData);

      // fetch logs
      const logsRes = await fetch('/api/audit-logs');
      if (!logsRes.ok) throw new Error('Failed to retrieve system logs.');
      const logsData = await logsRes.json();
      setLogs(logsData.slice(0, 5)); // show latest 5 logs only

      // fetch warehouse list
      const storesRes = await fetch('/api/stores');
      if (storesRes.ok) {
        const storesData = await storesRes.json();
        setStores(storesData);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-sm font-medium">Downloading operational indicators...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl text-red-200 flex flex-col items-center justify-center max-w-lg mx-auto my-10">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="font-bold text-lg mb-2">Operational Interruption</h3>
        <p className="text-sm text-center mb-4">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-red-800 hover:bg-red-700 font-semibold text-xs rounded-lg transition-all"
        >
          Retry Telemetry Connection
        </button>
      </div>
    );
  }

  // Symbol or abbreviation helper
  const currencySymbol = company.currency === 'USD' ? '$' : company.currency + ' ';

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header bar styled for Sleek Interface */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">SYSTEM OPERATIONS TELEMETRY</h1>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase tracking-wider">
              {currentUser.role} Security
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time balance logs, stock reorders, and transactional charts for <strong className="text-slate-705">{company.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-semibold text-slate-550 uppercase tracking-widest flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            Active Depot:
          </label>
          <select 
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="bg-slate-100 border-none text-slate-800 text-xs font-bold rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-indigo-500 cursor-pointer outline-none transition-all"
          >
            <option value="all">Primary Central Hub (All)</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>

          <button 
            type="button"
            onClick={fetchDashboardData}
            title="Refresh dashboard metrics"
            className="p-1.5 bg-slate-100 hover:bg-slate-250 text-slate-600 hover:text-slate-900 rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI: Total Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-350 transition-all flex justify-between items-start group">
          <div>
            <p className="text-xs font-semibold text-slate-405 uppercase tracking-wider mb-1">TOTAL PRODUCTS</p>
            <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              {stats?.totalProducts || 0}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-2">
              Across {stores.length} logistical depots
            </p>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg text-slate-650 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* KPI: Sales Volume */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-350 transition-all flex justify-between items-start group">
          <div>
            <p className="text-xs font-semibold text-slate-405 uppercase tracking-wider mb-1">SALES REVENUE</p>
            <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              {currencySymbol}{stats?.totalSalesValue?.toLocaleString() || '0'}
            </h3>
            <p className="text-[11px] text-indigo-600 font-medium mt-2">
              Excluding tax and service fees
            </p>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg text-slate-650 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* KPI: Low Stock Alerts */}
        <div 
          onClick={() => onNavigate('products')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-350 transition-all flex justify-between items-start group cursor-pointer"
        >
          <div>
            <p className="text-xs font-semibold text-slate-405 uppercase tracking-wider mb-1">CRITICAL STOCK ALERTS</p>
            <h3 className={`text-3xl font-extrabold tracking-tight ${stats?.lowStockCount && stats.lowStockCount > 0 ? 'text-red-500' : 'text-slate-800'}`}>
              {stats?.lowStockCount || 0}
            </h3>
            <p className="text-[11px] text-red-500 font-semibold mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              Item quantity &lt; 10 units
            </p>
          </div>
          <div className={`p-3 rounded-lg text-slate-650 transition-colors ${stats?.lowStockCount && stats.lowStockCount > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-100'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI: Purchases Total */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-350 transition-all flex justify-between items-start group">
          <div>
            <p className="text-xs font-semibold text-slate-405 uppercase tracking-wider mb-1">PURCHASE OUTLAY</p>
            <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              {currencySymbol}{stats?.totalPurchaseValue?.toLocaleString() || '0'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-2">
              Sum of active procurement
            </p>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg text-slate-650 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Charts & Logs Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recharts Area Chart panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                Capital Flows (Sales vs Purchase)
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Aggregate values in system-defined {company.currency} currencies.</p>
            </div>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> 
                Sales Orders
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> 
                Purchase Orders
              </span>
            </div>
          </div>
          
          <div className="p-6 flex-1 min-h-[320px]">
            {stats && stats.yearlyChartData && stats.yearlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={stats.yearlyChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                    tickFormatter={(val) => `${currencySymbol}${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '8px', 
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px'
                    }} 
                    formatter={(value) => [`${currencySymbol}${value}`, '']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    name="Sales Revenue"
                    stroke="#4f46e5" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="purchases" 
                    name="Purchases Cost"
                    stroke="#64748b" 
                    strokeWidth={1.5}
                    fillOpacity={1} 
                    fill="url(#colorPurchases)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No monthly transactions data found for charts rendering.
              </div>
            )}
          </div>
        </div>

        {/* Audit Log column */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                Live Audit Logs
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Corporate actions track records.</p>
            </div>
            
            {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
              <button 
                onClick={() => onNavigate('logs')}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-805 flex items-center gap-0.5"
              >
                Full Access <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="p-4 flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[300px]">
            {logs.length > 0 ? (
              logs.map((log) => {
                // Determine log side badge color based on module type
                let badgeColor = "bg-indigo-500";
                if (log.module === "Authentication") badgeColor = "bg-emerald-500";
                if (log.action.includes("Deleted")) badgeColor = "bg-red-500";
                if (log.module === "Company Settings" || log.module === "Users") badgeColor = "bg-amber-500";

                return (
                  <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex gap-3 group">
                    <div className={`w-1 shrink-0 rounded-full ${badgeColor} transition-all group-hover:scale-y-110`}></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-xs font-bold text-slate-800 truncate">{log.action}</p>
                        <span className="text-[9px] text-slate-400 shrink-0 font-medium">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{log.details}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-semibold uppercase">
                        <span>{log.userName}</span>
                        <span>•</span>
                        <span className="text-slate-500">{log.userRole}</span>
                        <span>•</span>
                        <span className="bg-slate-100 px-1 rounded text-[9px] lowercase font-normal">{log.module}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-10">
                <Clock className="w-8 h-8 text-slate-200 mb-2" />
                No logged entries found in database.
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">
              STATUS: <span className="text-emerald-600">● SECURITY SECURE</span>
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
