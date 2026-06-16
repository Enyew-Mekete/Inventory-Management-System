import React, { useState } from 'react';
import { 
  Building2, 
  User, 
  Percent, 
  Settings, 
  ShieldCheck, 
  Save, 
  Key, 
  Globe, 
  BadgeInfo,
  CheckCircle,
  AlertCircle,
  Camera,
  Upload,
  X
} from 'lucide-react';
import { Company, User as AppUser, UserRole } from '../types';

interface SettingsViewProps {
  currentUser: AppUser;
  company: Company;
  onUpdateCompany: (updated: Company) => void;
  onUpdateProfile: (updated: AppUser) => void;
}

const presetAvatars = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"
];

export default function SettingsView({ currentUser, company, onUpdateCompany, onUpdateProfile }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'company'>('profile');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Profile forms
  const [profName, setProfName] = useState(currentUser.name);
  const [profEmail, setProfEmail] = useState(currentUser.email);
  const [profPhone, setProfPhone] = useState(currentUser.phone || '');
  const [profAddress, setProfAddress] = useState(currentUser.address || '');
  const [profAvatar, setProfAvatar] = useState(currentUser.avatar || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select/drop an image file only.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Display image photo files must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setProfAvatar(reader.result);
        setSuccess('Uploaded display photo loaded perfectly. Make sure to click "Save Profile Details" on the right to lock in updates.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const isPasswordValid = newPassword.length >= 6;
  const isPasswordMatching = newPassword === confirmPassword;
  const canSavePassword = newPassword !== '' && isPasswordValid && isPasswordMatching;

  // Company forms
  const [compName, setCompName] = useState(company.name);
  const [compAddress, setCompAddress] = useState(company.address);
  const [compPhone, setCompPhone] = useState(company.phone);
  const [compVat, setCompVat] = useState(company.vatPercent);
  const [compSvc, setCompSvc] = useState(company.serviceChargePercent);
  const [compCurrency, setCompCurrency] = useState(company.currency);
  const [compFooter, setCompFooter] = useState(company.footerText);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);

      const payload: any = {
        user: {
          name: profName,
          email: profEmail,
          role: currentUser.role,
          groupId: currentUser.groupId,
          phone: profPhone,
          address: profAddress,
          avatar: profAvatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`,
          status: 'active'
        },
        operator: {
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role
        }
      };

      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Server refused your profile alteration instructions.');
      }

      const updatedUser = await response.json();
      onUpdateProfile(updatedUser);
      setSuccess('Personal user profile configuration state locked successfully.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setError('Please specify a new security password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password values do not match.');
      return;
    }
    try {
      setError(null);
      setSuccess(null);

      const payload: any = {
        user: {
          name: profName,
          email: profEmail,
          role: currentUser.role,
          groupId: currentUser.groupId,
          phone: profPhone,
          address: profAddress,
          avatar: profAvatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`,
          status: 'active'
        },
        operator: {
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role
        },
        password: newPassword
      };

      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Server refused your password alteration instructions.');
      }

      const updatedUser = await response.json();
      onUpdateProfile(updatedUser);

      setSuccess('Your password has been changed and saved successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: {
            name: compName,
            address: compAddress,
            phone: compPhone,
            vatPercent: Number(compVat) || 0,
            serviceChargePercent: Number(compSvc) || 0,
            currency: compCurrency,
            footerText: compFooter
          },
          operator: {
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role
          }
        })
      });

      if (!response.ok) throw new Error('Database server denied company credentials reconfiguration.');

      const data = await response.json();
      onUpdateCompany(data);
      setSuccess('Corporate settings parameters updated across system modules.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isSuperadmin = currentUser.role === 'superadmin';

  return (
    <div className="space-y-8 animate-fade-in text-xs text-slate-800">
      
      {/* Settings Navigation toolbar bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-205 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-655" />
            PROFILE SETTING
          </h1>
          <p className="text-sm text-slate-500 mt-1">Reconfigure personal user information, secret passwords security keys, or business VAT rates & company profiles.</p>
        </div>

        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg shrink-0">
          <button
            onClick={() => { setActiveTab('profile'); setError(null); }}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            👤 User Profile Details
          </button>
          
          <button
            onClick={() => { setActiveTab('company'); setError(null); }}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'company' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            🏢 Corporate Global Settings
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-850 rounded-lg flex items-center justify-between shadow-xs animate-fade-in">
          <span className="text-xs font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> {success}
          </span>
          <button onClick={() => setSuccess(null)} className="text-xs text-slate-400 font-bold">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-250 text-red-855 rounded-lg flex items-center justify-between shadow-xs animate-fade-in">
          <span className="text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-650" /> {error}
          </span>
          <button onClick={() => setError(null)} className="text-xs text-slate-400 font-bold">✕</button>
        </div>
      )}

      {/* ======================================================== */}
      {/* RENDER PROFILE FORMS */}
      {/* ======================================================== */}
      {activeTab === 'profile' ? (
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Card left detail summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 space-y-6 flex flex-col justify-between selection:bg-indigo-650">
            <div className="space-y-4">
              <div className="text-center pb-4 border-b border-slate-800">
                <div 
                  onClick={() => setIsAvatarDialogOpen(true)}
                  className="relative w-24 h-24 mx-auto mb-3 cursor-pointer group"
                  title="Click to open interactive photo selector and uploader"
                >
                  <img
                    src={profAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                    alt={currentUser.name}
                    className="w-full h-full rounded-full object-cover border-2 border-indigo-500 shadow-lg bg-slate-850 group-hover:brightness-90 transition-all"
                  />
                  <div className="absolute inset-0 bg-slate-950/65 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center flex-col gap-1">
                    <Camera className="w-4 h-4 text-white" />
                    <span className="text-[9px] uppercase font-extrabold text-white tracking-widest text-center px-1">Update</span>
                  </div>
                  <div className="absolute right-0 bottom-0 bg-indigo-650 p-1.5 rounded-full border border-slate-950 shadow-md transform translate-x-1 translate-y-1">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <h3 className="font-extrabold text-slate-100 text-base">{currentUser.name}</h3>
                <span className="px-2.5 py-0.5 mt-2 inline-block bg-indigo-950/40 text-indigo-400 border border-indigo-900 rounded text-[9px] font-bold uppercase tracking-widest">
                  {currentUser.role} Security
                </span>
              </div>

              {/* Instant Profile Photo Changer */}
              <div className="py-4 border-b border-slate-850 space-y-3.5 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile Photo</p>
                
                <button
                  type="button"
                  onClick={() => setIsAvatarDialogOpen(true)}
                  className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 hover:border-indigo-550 text-indigo-400 hover:text-indigo-350 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" /> Customize Display Photo
                </button>
              </div>

              <div className="space-y-2.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Authorized Email:</span>
                  <span className="font-mono text-slate-100 font-medium">{currentUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contact Phone:</span>
                  <span className="text-slate-100">{currentUser.phone || 'N/A'}</span>
                </div>
                {currentUser.address && (
                  <div className="pt-2 border-t border-slate-850">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Operating Base Station:</p>
                    <p className="text-xs text-slate-200 mt-1 leading-normal">{currentUser.address}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg text-slate-405 leading-relaxed mt-4">
              📌 Preview your avatar inside the circle instantly and proceed to saving. All profile change steps apply in real time when committed.
            </div>
          </div>

          {/* Edit form container */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Personal Details Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-205 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-505" /> Personal Information Matrix
              </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">Corporate Display Name</label>
                  <input
                    type="text"
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">Authenticated Login Email</label>
                  <input
                    type="email"
                    value={profEmail}
                    onChange={(e) => setProfEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">Display Avatar URL link</label>
                  <input
                    type="url"
                    value={profAvatar}
                    onChange={(e) => setProfAvatar(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">Active Contact phone</label>
                  <input
                    type="text"
                    value={profPhone}
                    onChange={(e) => setProfPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                    placeholder="+1 (555) 012-3456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">Facility Operating Base Station Address</label>
                <input
                  type="text"
                  value={profAddress}
                  onChange={(e) => setProfAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                  placeholder="e.g. Warehouse Outlet B, London"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-transform hover:scale-103"
                >
                  <Save className="w-3.5 h-3.5" /> Save Profile Details
                </button>
              </div>
            </form>

          </div>

          {/* Secure Change Password card */}
          <div className="bg-white p-6 rounded-xl border border-slate-205 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-505" /> Secure Authentication Key Update
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">New Secret Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs outline-none"
                    placeholder="Enter new security password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs outline-none"
                    placeholder="Re-type new security password"
                    required
                  />
                </div>
              </div>

              {/* Dynamic validation indicators */}
              {(newPassword || confirmPassword) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    {isPasswordValid ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className={isPasswordValid ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                      At least 6 characters in length ({newPassword.length}/6)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPasswordMatching && confirmPassword ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className={(isPasswordMatching && confirmPassword) ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                      {(isPasswordMatching && confirmPassword) ? "Passwords match exactly" : "Passwords do not match yet"}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <span className="text-[10px] text-slate-405 block">Ensure to utilize a strong unique combination of alphanumeric secret keys to reinforce operational platform security.</span>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={!canSavePassword}
                  className={`px-4 py-2 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                    canSavePassword 
                      ? 'bg-indigo-650 hover:bg-indigo-600 hover:scale-103 cursor-pointer' 
                      : 'bg-slate-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" /> Save Changed Password
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>

      ) : (

        // ========================================================
        // RENDER COMPANY SETTINGS FORMS
        // ========================================================
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Card left info info informational */}
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl p-6 space-y-6 flex flex-col justify-between selection:bg-indigo-650">
            <div className="space-y-4">
              <div className="pb-4 border-b border-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-slate-100 text-sm select-none">Apex Logistics Instance context</h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Reconfiguring settings handles calculations of VAT TAX margins, service delivery fees, physical addresses printout on corporate receipts, and system currencies default.
              </p>

              <div className="space-y-3 pt-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-350">
                  <Percent className="w-4 h-4 text-indigo-400" />
                  <span>Interactive sales calculator auto-adds VAT.</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-350">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>Support global regional currency codes.</span>
                </div>
              </div>
            </div>

            {!isSuperadmin && (
              <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-lg text-red-200">
                ⭐ <strong>Isolation Warning:</strong> Your present role (<strong>{currentUser.role}</strong>) does not have write authority over corporate configuration settings.
              </div>
            )}
            
            {isSuperadmin && (
              <div className="p-3 bg-slate-950/60 rounded-lg text-slate-405">
                👑 Superadmin has complete command override capabilities over all balance parameters.
              </div>
            )}
          </div>

          {/* Company details form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-205 shadow-sm space-y-6 animate-fade-in">
            <h3 className="font-bold text-slate-804 text-sm flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-505" /> Company Account Configurations
            </h3>

            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">Company Registered Label Name</label>
                  <input
                    type="text"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs outline-none"
                    disabled={!isSuperadmin}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">Hotline phone number</label>
                  <input
                    type="text"
                    value={compPhone}
                    onChange={(e) => setCompPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs outline-none"
                    disabled={!isSuperadmin}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">Corporate registered address</label>
                <input
                  type="text"
                  value={compAddress}
                  onChange={(e) => setCompAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white px-3 py-2.5 rounded-lg text-xs outline-none"
                  disabled={!isSuperadmin}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">VAT tax margins (%)</label>
                  <input
                    type="number"
                    value={compVat}
                    onChange={(e) => setCompVat(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                    disabled={!isSuperadmin}
                    min={0}
                    max={100}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Service charge fee (%)</label>
                  <input
                    type="number"
                    value={compSvc}
                    onChange={(e) => setCompSvc(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                    disabled={!isSuperadmin}
                    min={0}
                    max={100}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">Corporate currency symbol</label>
                  <select
                    value={compCurrency}
                    onChange={(e) => setCompCurrency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded cursor-pointer text-xs outline-none"
                    disabled={!isSuperadmin}
                  >
                    <option value="USD">USD ($ - Dollars)</option>
                    <option value="EUR">EUR (€ - Euros)</option>
                    <option value="GBP">GBP (£ - Pounds)</option>
                    <option value="CNY">CNY (¥ - Renminbi)</option>
                    <option value="JPY">JPY (¥ - Yen)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-405 uppercase mb-1">Invoice receipt footer text notes</label>
                <textarea
                  value={compFooter}
                  onChange={(e) => setCompFooter(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white px-3 py-2 rounded-lg text-xs outline-none"
                  disabled={!isSuperadmin}
                  placeholder="Thank you for partnering with us"
                />
              </div>

              {isSuperadmin && (
                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-transform hover:scale-103"
                  >
                    <Save className="w-3.5 h-3.5" /> Reconfigure Corporate Parameters
                  </button>
                </div>
              )}
            </form>
          </div>

        </div>
      )}

      {/* ================= AVATAR SELECTION AND UPLOAD DIALOG OVERLAY ================= */}
      {isAvatarDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in text-slate-100">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Update Profile Picture</h3>
              </div>
              <button 
                onClick={() => setIsAvatarDialogOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Drag and Drop Zone + Click browser */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('dialog-avatar-selector')?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-indigo-550 bg-indigo-950/20' 
                    : 'border-slate-800 hover:border-indigo-500 bg-slate-950/40 hover:bg-slate-950/60'
                }`}
              >
                <input 
                  type="file" 
                  id="dialog-avatar-selector" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3 animate-bounce" />
                <span className="font-bold text-xs text-slate-200 block mb-1 font-sans">
                  Drag and drop profile picture here
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">
                  or click to select file from your device (Max 2MB)
                </span>
              </div>
              
              {/* Live Preview & Presets Selection */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                  Quick Portrait Presets Selection
                </p>
                
                <div className="grid grid-cols-6 gap-2">
                  {presetAvatars.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setProfAvatar(url);
                        setSuccess('Selected new preset avatar! Click "Apply Selection" below and remember to save.');
                      }}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 relative ${
                        profAvatar === url ? 'border-indigo-500 ring-2 ring-indigo-550/40 scale-102' : 'border-slate-800 hover:border-slate-700'
                      }`}
                      title={`Preset portrait option ${idx + 1}`}
                    >
                      <img src={url} alt={`PresetPortrait ${idx}`} className="w-full h-full object-cover" />
                      {profAvatar === url && (
                        <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL address custom fallback */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                  Or Paste Custom Avatar Portrait URL Link
                </label>
                <input
                  type="url"
                  value={profAvatar}
                  onChange={(e) => setProfAvatar(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 px-3 py-2 rounded-lg text-xs outline-none text-slate-100 font-mono"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Current Active Preview */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={profAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                    alt="Active avatar visual"
                    className="w-12 h-12 rounded-full object-cover border border-slate-700 bg-slate-900"
                  />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block tracking-wider font-sans">
                      Active Image Preview
                    </span>
                    <span className="text-xs text-slate-300 font-medium truncate max-w-[200px] block font-mono">
                      {profAvatar.startsWith('data:') ? 'Custom Base64 Data image URL' : profAvatar || 'Default placeholder portrait'}
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfAvatar('');
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-350 text-[10px] font-bold rounded-lg transition-colors font-sans"
                >
                  Clear to Default
                </button>
              </div>

            </div>
            
            {/* Actions Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-850 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAvatarDialogOpen(false)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 font-semibold text-xs rounded-lg border border-slate-750 transition-colors font-sans"
              >
                Cancel / Back
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setIsAvatarDialogOpen(false);
                  setSuccess('Avatar display photo updated locally. Make sure to click "Save Profile Details" on the right to lock in updates.');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-505 text-white font-semibold text-xs rounded-lg shadow-md transition-all hover:scale-103 font-sans"
              >
                Apply Selection
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
