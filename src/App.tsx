import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut, 
  User as UserIcon,
  Clock,
  Menu,
  X,
  Lock,
  Globe,
  BellRing,
  Sun,
  Moon
} from 'lucide-react';

import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import ProductsView from './components/ProductsView';
import OrdersView from './components/OrdersView';
import UsersView from './components/UsersView';
import SettingsView from './components/SettingsView';

import { User, Company } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('inv_token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('inv_user');
    return raw ? JSON.parse(raw) : null;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'users' | 'settings'>('dashboard');
  const [company, setCompany] = useState<Company>({
    name: 'Apex Solutions Corp',
    address: '100 Innovation Parkway, Suite 500, Chicago, IL',
    phone: '+1 (555) 909-0120',
    vatPercent: 12,
    serviceChargePercent: 5,
    currency: 'USD',
    footerText: '© Apex Solutions Corp. Genuine logistics services ledger.'
  });

  // Dynamic system-wide stats for real-time notifications
  const [statsData, setStatsData] = useState({
    productsCount: 0,
    ordersCount: 0,
    lowStockCount: 0,
    salesTotal: 0
  });

  // Real-time UTC clock ticker state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mobile sidebar menu toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('inv_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('inv_theme', theme);
  }, [theme]);

  useEffect(() => {
    // Clock interval
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const syncStatsBrief = async () => {
    try {
      const resp = await fetch('/api/stats');
      if (resp.ok) {
        const stats = await resp.json();
        setStatsData({
          productsCount: stats.totalProducts || 0,
          ordersCount: stats.totalOrders || 0,
          lowStockCount: stats.lowStockCount || 0,
          salesTotal: stats.totalSales || 0
        });
      }

      const compResp = await fetch('/api/company');
      if (compResp.ok) {
        const compData = await compResp.json();
        setCompany(compData);
      }
    } catch (e) {
      console.error('Failed stats background telemetry synchronization.', e);
    }
  };

  useEffect(() => {
    if (token && user) {
      syncStatsBrief();
    }
  }, [token, user]);

  const handleLoginSuccess = (loggedUser: User, newToken: string) => {
    setToken(newToken);
    setUser(loggedUser);
    localStorage.setItem('inv_token', newToken);
    localStorage.setItem('inv_user', JSON.stringify(loggedUser));
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('inv_token');
    localStorage.removeItem('inv_user');
  };

  const handleProfileUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('inv_user', JSON.stringify(updatedUser));
  };

  const handleUpdateCompany = (updatedCompany: Company) => {
    setCompany(updatedCompany);
  };

  // Guard access credentials
  if (!token || !user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const formatClockTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Africa/Nairobi' });
  };

  // Mapping sidebar items
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard stats', icon: LayoutDashboard },
    { id: 'products', name: 'Products catalog', icon: Package },
    { id: 'orders', name: 'Orders & billing', icon: ShoppingCart },
    { id: 'users', name: 'IAM Security', icon: Users, restriction: ['superadmin', 'admin'] },
    { id: 'settings', name: 'Profile Setting', icon: Settings }
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (item.restriction) {
      return item.restriction.includes(user.role);
    }
    return true;
  });

  return (
    <div className={`min-h-screen font-sans selection:bg-indigo-650 selection:text-white flex flex-col transition-colors duration-200 ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Dynamic top header bar */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-100 px-6 py-3.5 z-40 flex items-center justify-between shadow-md selection:bg-indigo-600">
        
        {/* Company identity brand */}
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 md:hidden text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <span className="text-xl">📦</span>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider leading-none text-white">{company.name}</h1>
            <p className="text-[10px] text-slate-405 font-medium mt-0.5 uppercase tracking-widest hidden sm:block">Central Operations Management System</p>
          </div>
        </div>

        {/* Live tickers & Operator profile header */}
        <div className="flex items-center gap-6">
          
          {/* Real-time continuous clock ticker */}
          <div className="hidden md:flex items-center gap-2 bg-slate-950/40 border border-slate-800/85 px-3.5 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-wider text-slate-350">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Nairobi (EAT): {formatClockTime(currentTime)}</span>
          </div>

          {/* Theme switcher toggle button */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all border border-slate-750/50 flex items-center justify-center focus:outline-none"
            title={theme === 'light' ? "Activate Dark Mode" : "Activate Light Mode"}
          >
            {theme === 'light' ? (
              <Moon className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-yellow-400 animate-spin-slow" />
            )}
          </button>

          <div className="flex items-center gap-3">
            {/* Operator snapshot info */}
            <div className="text-right hidden sm:block leading-tight">
              <p className="text-xs font-bold text-slate-100">{user.name}</p>
              <div className="flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-extrabold uppercase text-indigo-450 tracking-wider">
                  {user.role} role
                </span>
              </div>
            </div>

            <img
              src={user.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80"}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-700 bg-slate-800 shadow-sm"
              title={user.name}
            />

            {/* Logout trigger button */}
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-400 rounded-lg transition-colors border border-slate-750/50"
              title="Terminate application session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </header>

      {/* Main workspace platform layout */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto relative">
        
        {/* Dynamic Navigation panel (Responsive Mobile Slide and Standard screen fixed sidepanel) */}
        <aside className={`
          fixed inset-y-12 left-0 w-64 bg-slate-900 text-slate-100 z-30 border-r border-slate-800 transition-transform transform duration-200
          md:translate-x-0 md:static md:w-56 md:flex md:flex-col justify-between shrink-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-4 space-y-4">
            
            <div className="px-3.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest block select-none">
              Control Panel modules
            </div>

            {/* Main navigation links */}
            <nav className="space-y-1">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      isActive 
                        ? 'bg-indigo-650 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick status mini block inside layout sidebar bottom to ensure architectural context and humility */}
          <div className="p-4 border-t border-slate-800/85">
            <div className="bg-slate-950/60 rounded-lg p-3 text-[11px] text-slate-405 leading-relaxed font-sans border border-slate-850">
              <div className="flex items-center gap-1.5 text-indigo-400 font-bold mb-1">
                <BellRing className="w-3.5 h-3.5 shrink-0" /> Alert Watch:
              </div>
              {statsData.lowStockCount > 0 ? (
                <span>Detected <strong>{statsData.lowStockCount}</strong> items in critical levels. Balance stock.</span>
              ) : (
                <span>All physical wares holding safe quantities above threshold catalog margins.</span>
              )}
            </div>
          </div>

        </aside>

        {/* Content View Canvas Backdrop */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0">
          
          {/* Main conditional rendering of active control modules */}
          {activeTab === 'dashboard' && (
            <DashboardView 
              currentUser={user} 
              company={company} 
              onNavigate={(tab: string) => setActiveTab(tab as any)} 
            />
          )}
          {activeTab === 'products' && <ProductsView currentUser={user} onRefreshStats={syncStatsBrief} />}
          {activeTab === 'orders' && <OrdersView currentUser={user} company={company} onRefreshStats={syncStatsBrief} />}
          {activeTab === 'users' && <UsersView currentUser={user} onRefreshStats={syncStatsBrief} />}
          {activeTab === 'settings' && (
            <SettingsView 
              currentUser={user} 
              company={company} 
              onUpdateCompany={handleUpdateCompany} 
              onUpdateProfile={handleProfileUpdate} 
            />
          )}

        </main>

      </div>

    </div>
  );
}
