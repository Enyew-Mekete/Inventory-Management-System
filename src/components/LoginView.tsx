import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { LogIn, Key, Mail, ShieldAlert, BadgeInfo } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'superadmin' | 'admin' | 'user') => {
    if (role === 'superadmin') {
      setEmail('superadmin@admin.com');
      setPassword('superadmin');
    } else if (role === 'admin') {
      setEmail('admin@admin.com');
      setPassword('admin');
    } else {
      setEmail('user@admin.com');
      setPassword('user');
    }
  };

  return (
    <div id="login-view-container" className="min-h-screen bg-slate-950 flex flex-col md:flex-row justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Decorative Grid Panel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-60"></div>

      <div className="relative w-full max-w-5xl grid md:grid-cols-12 bg-slate-900 border border-slate-800 rounded-2xl shadow-3xl overflow-hidden">
        
        {/* Left Informational Sidebar */}
        <div className="md:col-span-5 bg-gradient-to-br from-indigo-700 via-indigo-900 to-indigo-950 p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/10 pointer-events-none"></div>
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-505/20 rounded-full blur-2xl"></div>
          
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                <span className="text-xl">📦</span>
              </div>
              <span className="font-bold text-xl tracking-tight">En-Tech S.C</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold leading-tight mb-4">
              Real Time Inventory Management System
            </h2>
            <p className="text-indigo-200 text-sm leading-relaxed mb-6">
              Empower your logistics hubs, physical assets, and standard company hierarchies with precise stock management, automated balance sheet, and absolute audit metrics.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="p-1 bg-white/10 rounded text-xs">🔐</span>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Role Security Levels</h4>
                <p className="text-xs text-indigo-200">Enforce enterprise isolation across managers, warehouse users, and auditors.</p>
              </div>
            </div>
            <div className="text-[11px] text-indigo-300">
              System Instance: v2.4.0-stable • Regional server running
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-8 md:p-12 bg-slate-900 flex flex-col justify-center">
          
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-100 mb-2">Welcome Back</h1>
            <p className="text-sm text-slate-400">Please provide security key details to initialize current session.</p>
          </div>

          {error && (
            <div className="p-3 mb-6 bg-red-950/50 border border-red-500/50 text-red-200 text-sm rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Corporate Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 pl-10 pr-4 py-2.5 rounded-lg text-sm transition-colors outline-none"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Security Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 pl-10 pr-4 py-2.5 rounded-lg text-sm transition-colors outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-indigo-500/20 active:translate-y-px transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating and initializing...' : 'Login'}</span>
            </button>
          </form>

          {/* Quick Sandbox Login Section */}
          {!(import.meta as any).env?.PROD && (
            <div className="mt-8 pt-8 border-t border-slate-800 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <BadgeInfo className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Sandbox Login</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('superadmin')}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-705 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg hover:border-indigo-550 transition-colors"
                  title="Email: superadmin@admin.com / Pass: superadmin"
                >
                  👑 Superadmin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-705 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg hover:border-indigo-550 transition-colors"
                  title="Email: admin@admin.com / Pass: admin"
                >
                  🛠️ Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('user')}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-705 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg hover:border-indigo-550 transition-colors"
                  title="Email: user@admin.com / Pass: user"
                >
                  👤 User Staff
                </button>
              </div>
              
              <div className="mt-4 text-[11px] text-slate-500 text-center">
                Superadmin can fully customize corporate settings, admins, groups, rules/currencies & logs.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
