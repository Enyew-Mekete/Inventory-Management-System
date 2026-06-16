import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  Lock, 
  UserIcon, 
  CheckCircle,
  XCircle,
  HelpCircle,
  Phone,
  MapPin,
  Mail,
  MoreVertical,
  Key
} from 'lucide-react';
import { User, Group, UserRole } from '../types';

interface UsersViewProps {
  currentUser: User;
  onRefreshStats: () => void;
}

export default function UsersView({ currentUser, onRefreshStats }: UsersViewProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // User form states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'user' as UserRole,
    groupId: '',
    phone: '',
    address: '',
    avatar: '',
    status: 'active' as 'active' | 'inactive',
    password: ''
  });

  // Change password modal states
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [passTargetUser, setPassTargetUser] = useState<User | null>(null);
  const [targetUserPassword, setTargetUserPassword] = useState('');
  const [targetUserConfirmPassword, setTargetUserConfirmPassword] = useState('');

  const isUserPassValid = targetUserPassword.length >= 6;
  const isUserPassMatching = targetUserPassword === targetUserConfirmPassword;
  const canSaveUserPass = targetUserPassword !== '' && isUserPassValid && isUserPassMatching;

  // Group form states
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  // System permissions database
  const SYSTEM_PERMISSIONS = [
    { key: 'manage_system_config', name: 'Manage System Config', desc: 'Allows full workspace company information, taxes and setting edits.' },
    { key: 'manage_users', name: 'Manage System Users', desc: 'Allows creation, edits and access control updates of colleagues.' },
    { key: 'manage_groups', name: 'Manage Security Groups', desc: 'Allows structural editing of permissions and roles hierarchies.' },
    { key: 'manage_products', name: 'Manage Products catalog', desc: 'Allows editing products, stock adjustments and warehouse allocation.' },
    { key: 'manage_orders', name: 'Record Transactions', desc: 'Allows generation of Sales and procurement Purchase orders.' },
    { key: 'view_reports', name: 'View Financial Reports', desc: 'Provides full analytics, charting and yearly logs oversight.' },
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersRes, groupsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/groups')
      ]);

      if (!usersRes.ok || !groupsRes.ok) {
        throw new Error('Unable to read user credentials and security credentials database.');
      }

      const usersData = await usersRes.json();
      const groupsData = await groupsRes.json();

      setUsers(usersData);
      setGroups(groupsData);

      // Pre-select first group for user form default value if available
      if (groupsData.length > 0) {
        setUserForm(prev => ({ ...prev, groupId: groupsData[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while synchronization');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenUserModal = (user: User | null = null) => {
    if (user) {
      setSelectedUser(user);
      setUserForm({
        name: user.name,
        email: user.email,
        role: user.role,
        groupId: user.groupId || (groups[0]?.id || ''),
        phone: user.phone || '',
        address: user.address || '',
        avatar: user.avatar || '',
        status: user.status,
        password: '' // empty means no password change
      });
    } else {
      setSelectedUser(null);
      setUserForm({
        name: '',
        email: '',
        role: 'user',
        groupId: groups[0]?.id || '',
        phone: '',
        address: '',
        avatar: '',
        status: 'active',
        password: ''
      });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccessMsg(null);

      const isEdit = !!selectedUser;
      const url = isEdit ? `/api/users/${selectedUser.id}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';

      // Ensure a password is set for new users
      if (!isEdit && !userForm.password) {
        setError('A standard secret password is required for registering new profile.');
        return;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            name: userForm.name,
            email: userForm.email,
            role: userForm.role,
            groupId: userForm.groupId,
            phone: userForm.phone,
            address: userForm.address,
            avatar: userForm.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80`,
            status: userForm.status,
          },
          password: userForm.password || undefined,
          operator: {
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save user details.');
      }

      setSuccessMsg(`User '${userForm.name}' account records populated safely.`);
      setIsUserModalOpen(false);
      loadData();
      onRefreshStats();
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving data.');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      alert("Self termination prohibited! You cannot delete your own logged-in user profile.");
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to delete user account '${userName}'? This will permanently wipe access credentials.`)) {
      return;
    }

    try {
      setError(null);
      const url = `/api/users/${userId}?userEmail=${encodeURIComponent(currentUser.email)}&userName=${encodeURIComponent(currentUser.name)}&userRole=${encodeURIComponent(currentUser.role)}`;
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to parse remote server command or database restrictions.');
      }

      setSuccessMsg(`Account '${userName}' removed from system registry.`);
      loadData();
      onRefreshStats();
    } catch (err: any) {
      setError(err.message || 'Error deleting user.');
    }
  };

  const handleOpenChangePasswordModal = (user: User) => {
    setPassTargetUser(user);
    setTargetUserPassword('');
    setTargetUserConfirmPassword('');
    setIsPassModalOpen(true);
  };

  const handleSaveTargetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passTargetUser) return;
    if (!targetUserPassword) {
      setError('Please provide a new security password.');
      return;
    }
    if (targetUserPassword !== targetUserConfirmPassword) {
      setError('Password values do not match.');
      return;
    }

    try {
      setError(null);
      setSuccessMsg(null);

      const response = await fetch(`/api/users/${passTargetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            name: passTargetUser.name,
            email: passTargetUser.email,
            role: passTargetUser.role,
            groupId: passTargetUser.groupId,
            phone: passTargetUser.phone || '',
            address: passTargetUser.address || '',
            avatar: passTargetUser.avatar || '',
            status: passTargetUser.status
          },
          password: targetUserPassword,
          operator: {
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Could not submit details to authorization server.');
      }

      setSuccessMsg(`Changed password successfully for user '${passTargetUser.name}'.`);
      setIsPassModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Group modal operations
  const handleOpenGroupModal = (group: Group | null = null) => {
    if (group) {
      setSelectedGroup(group);
      setGroupForm({
        name: group.name,
        description: group.description,
        permissions: group.permissions || []
      });
    } else {
      setSelectedGroup(null);
      setGroupForm({
        name: '',
        description: '',
        permissions: []
      });
    }
    setIsGroupModalOpen(true);
  };

  const handleTogglePermission = (permKey: string) => {
    setGroupForm(prev => {
      const currentPerms = [...prev.permissions];
      if (currentPerms.includes(permKey)) {
        return { ...prev, permissions: currentPerms.filter(k => k !== permKey) };
      } else {
        return { ...prev, permissions: [...currentPerms, permKey] };
      }
    });
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccessMsg(null);

      const isEdit = !!selectedGroup;
      const url = isEdit ? `/api/groups/${selectedGroup.id}` : '/api/groups';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: {
            name: groupForm.name,
            description: groupForm.description,
            permissions: groupForm.permissions
          },
          operator: {
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role
          }
        })
      });

      if (!response.ok) {
        throw new Error('Could not submit details to authorization server.');
      }

      setSuccessMsg(`Security group '${groupForm.name}' configured successfully.`);
      setIsGroupModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    // Check if any user belongs to this group first
    const usersInGroup = users.filter(u => u.groupId === groupId);
    if (usersInGroup.length > 0) {
      alert(`Permission Denied: There are ${usersInGroup.length} users assigned to '${groupName}'. Please migrate users to alternative groups first.`);
      return;
    }

    if (!window.confirm(`Delete permissions group '${groupName}' permanently?`)) {
      return;
    }

    try {
      setError(null);
      const url = `/api/groups/${groupId}?userEmail=${encodeURIComponent(currentUser.email)}&userName=${encodeURIComponent(currentUser.name)}&userRole=${encodeURIComponent(currentUser.role)}`;
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Database integrity check restricted category removal.');
      }

      setSuccessMsg(`Group '${groupName}' decommissioned successfully.`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isAdminOrSuper = currentUser.role === 'superadmin' || currentUser.role === 'admin';

  if (!isAdminOrSuper) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center max-w-md mx-auto my-12">
        <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Operational Security Isolation</h3>
        <p className="text-sm text-slate-500 mt-2">
          Your current roles level (<strong>{currentUser.role}</strong>) does not hold enough privileges to edit colleagues, group properties, or security levels.
        </p>
        <p className="text-xs text-slate-400 mt-4">Please contact system Superadmin at <strong>superadmin@admin.com</strong> for override permissions.</p>
      </div>
    );
  }

  // Find users' group label
  const getGroupName = (id: string) => {
    const found = groups.find(g => g.id === id);
    return found ? found.name : 'No Group Assigned';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-505" />
            IDENTITY & ACCESS MANAGEMENT (IAM)
          </h1>
          <p className="text-sm text-slate-500 mt-1">Config credentials, roles, authorization scopes, security parameters and structural department groups.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button 
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-white text-slate-805 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            👥 System Users ({users.length})
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'groups' ? 'bg-white text-slate-805 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            🛡️ Security Groups ({groups.length})
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg flex items-center justify-between gap-2 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 text-xs font-bold">dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-800 rounded-lg flex items-center justify-between gap-2 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 text-sm">
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">dismiss</button>
        </div>
      )}

      {/* Main table view content */}
      {loading ? (
        <div className="flex justify-center items-center py-20 bg-white rounded-xl border border-slate-205">
          <div className="w-8 h-8 border-2 border-indigo-550 border-t-transparent rounded-full animate-spin mr-3"></div>
          <span className="text-slate-550 text-sm">Syncing security rosters...</span>
        </div>
      ) : activeTab === 'users' ? (
        
        // Tab: Users Directory
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800">Colleagues & Operators Directory</h3>
              <p className="text-xs text-slate-400 mt-0.5">Control individual credentials, status thresholds, and profile attachments.</p>
            </div>
            
            <button 
              type="button"
              onClick={() => handleOpenUserModal(null)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow active:translate-y-px transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create User Account</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                  <th className="p-4 select-none">Colleague</th>
                  <th className="p-4 select-none">Workspace Credentials</th>
                  <th className="p-4 select-none">Security Role</th>
                  <th className="p-4 select-none">Assigned IAM Group</th>
                  <th className="p-4 select-none text-center">Status</th>
                  <th className="p-4 select-none text-right">Actions Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"} 
                          alt={user.name} 
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-100"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 text-sm leading-tight">{user.name}</p>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" /> {user.phone || 'No phone registered'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-normal text-slate-600">
                      <p className="font-mono tracking-tight text-slate-700 font-medium">{user.email}</p>
                      {user.address && (
                        <span className="text-[10px] text-slate-405 truncate block max-w-[180px]" title={user.address}>
                          📍 {user.address}
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        user.role === 'superadmin' ? 'bg-indigo-100 text-indigo-700' :
                        user.role === 'admin' ? 'bg-blue-10 bg-slate-200 text-slate-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="font-medium text-slate-750 flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        {getGroupName(user.groupId)}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${user.status === 'active' ? 'bg-emerald-600 animate-pulse' : 'bg-red-600'}`}></span>
                        {user.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenChangePasswordModal(user)}
                          title="Change user authentication password"
                          className="p-1.5 bg-slate-50 border border-slate-200 text-amber-605 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-transform hover:scale-105"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenUserModal(user)}
                          title="Modify account privileges"
                          className="p-1.5 bg-slate-50 border border-slate-200 text-slate-605 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-transform hover:scale-105"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          disabled={user.id === currentUser.id}
                          title={user.id === currentUser.id ? "Cannot delete yourself" : "Wipe security registry credentials"}
                          className={`p-1.5 border hover:scale-105 transition-transform rounded-lg ${
                            user.id === currentUser.id 
                            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-red-50 border-red-200 text-red-605 hover:bg-red-100 hover:text-red-700'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-[11px] text-slate-400">
            <span>Total Registered Workspace Operators: <strong>{users.length}</strong></span>
            <span>Security levels: Superadmin &gt; Admin &gt; User</span>
          </div>

        </div>

      ) : (

        // Tab: Security Groups
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800">Workspace Authorization Security Groups</h3>
                <p className="text-xs text-slate-400 mt-0.5">Control logical permission groups assigned to user roles. Map specific operation permissions cleanly.</p>
              </div>

              <button 
                type="button"
                onClick={() => handleOpenGroupModal(null)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow active:translate-y-px transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Configure Security Group</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-slate-700">
              {groups.map((group) => (
                <div key={group.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 font-sans text-sm">{group.name}</h4>
                      <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1 rounded uppercase tracking-wider">{group.id}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{group.description}</p>
                    
                    {/* Permissions list chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {group.permissions && group.permissions.map((permKey) => {
                        const pm = SYSTEM_PERMISSIONS.find(sp => sp.key === permKey);
                        return (
                          <span 
                            key={permKey} 
                            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded"
                            title={pm?.desc}
                          >
                            <Check className="w-2.5 h-2.5" />
                            {pm ? pm.name : permKey}
                          </span>
                        );
                      })}
                      {(!group.permissions || group.permissions.length === 0) && (
                        <span className="text-[11px] text-red-500 font-semibold uppercase flex items-center gap-1">
                          ⚠️ No permissions assigned (Absolute Isolation)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenGroupModal(group)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3 text-slate-500" /> Adjust Permissions
                    </button>
                    
                    {/* Disable removing default superadmin groups to defend workspace initialization safety */}
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      disabled={['g1', 'g2', 'g3'].includes(group.id)}
                      title={['g1', 'g2', 'g3'].includes(group.id) ? "Primary system default groups cannot be deleted." : "Permanent termination of this security ring"}
                      className={`p-1.5 border rounded-lg transition-transform hover:scale-105 ${
                        ['g1', 'g2', 'g3'].includes(group.id)
                        ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                        : 'bg-red-50 border-red-200 text-red-605 hover:bg-red-100 hover:text-red-700'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      )}

      {/* ================= USER FORM DIALOG MODAL ================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 selection:bg-indigo-600 selection:text-white">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in text-slate-100">
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 shrink-0">
              <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-indigo-400" />
                {selectedUser ? `Modifying Privilege Set: ${selectedUser.name}` : 'Register Workspace Operator Profile'}
              </h3>
              <button 
                onClick={() => setIsUserModalOpen(false)} 
                className="text-slate-400 hover:text-white font-semibold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex flex-col min-h-0 flex-1">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Corporate Name</label>
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 text-slate-100 px-3 py-2 rounded-lg text-xs outline-none"
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Corporate Email</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 text-slate-100 px-3 py-2 rounded-lg text-xs outline-none"
                      placeholder="jane@company.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Security Level Role</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 text-slate-100 px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
                    >
                      <option value="user">User (Staff Operator)</option>
                      <option value="admin">Admin (Store Manager)</option>
                      {currentUser.role === 'superadmin' && <option value="superadmin">Superadmin (Corporate Master)</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Department Security IAM Group</label>
                    <select
                      value={userForm.groupId}
                      onChange={(e) => setUserForm(prev => ({ ...prev, groupId: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 text-slate-100 px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
                    >
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contact Phone</label>
                    <input
                      type="text"
                      value={userForm.phone}
                      onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-lg text-xs outline-none"
                      placeholder="+1 (555) 012-3456"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Operating Status</label>
                    <select
                      value={userForm.status}
                      onChange={(e) => setUserForm(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
                    >
                      <option value="active">Active (Access Allowed)</option>
                      <option value="inactive">Inactive (Deactivated)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Profile Avatar URL link</label>
                  <input
                    type="url"
                    value={userForm.avatar}
                    onChange={(e) => setUserForm(prev => ({ ...prev, avatar: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-lg text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505"
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                  <span className="text-[9px] text-slate-405">Leave empty to auto-generate default clean avatar placeholder representation.</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Physical Facility Location Residence Address</label>
                  <input
                    type="text"
                    value={userForm.address}
                    onChange={(e) => setUserForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-lg text-xs outline-none"
                    placeholder="Warehouse B Facility, Chicago"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                    {selectedUser ? 'Reset Security Key Password (Optional)' : 'Secret Access Password'}
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 text-slate-101 px-3 py-2 rounded-lg text-xs outline-none"
                    placeholder={selectedUser ? 'Leave blank to preserve present password' : 'Provide temporary security key'}
                    required={!selectedUser}
                  />
                </div>

              </div>

              <div className="p-6 bg-slate-950/60 border-t border-slate-800/85 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  Save User Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ================= CHANGE PASSWORD DIALOG MODAL ================= */}
      {isPassModalOpen && passTargetUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 selection:bg-indigo-650 selection:text-white animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in text-slate-101">
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 shrink-0">
              <h3 className="font-extrabold text-base text-slate-101 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                Change User Security Password
              </h3>
              <button 
                onClick={() => setIsPassModalOpen(false)} 
                className="text-slate-400 hover:text-white font-semibold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTargetUserPassword} className="flex flex-col min-h-0 flex-1">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={passTargetUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"} 
                      alt={passTargetUser.name} 
                      className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-slate-100 text-xs leading-none">{passTargetUser.name}</h4>
                      <span className="text-[10px] text-slate-400 leading-none font-mono mt-1 block">{passTargetUser.email}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">New Security Password</label>
                    <input
                      type="password"
                      value={targetUserPassword}
                      onChange={(e) => setTargetUserPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-505 focus:ring-1 focus:ring-indigo-505 text-slate-101 px-3 py-2 rounded-lg text-xs outline-none"
                      placeholder="Provide new secure password"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirm Security Password</label>
                    <input
                      type="password"
                      value={targetUserConfirmPassword}
                      onChange={(e) => setTargetUserConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-505 focus:ring-1 focus:ring-indigo-505 text-slate-101 px-3 py-2 rounded-lg text-xs outline-none"
                      placeholder="Confirm new secure password"
                      required
                    />
                  </div>
                </div>

                {/* Dynamic user validation indicators */}
                {(targetUserPassword || targetUserConfirmPassword) && (
                  <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      {isUserPassValid ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <span className="text-amber-500 shrink-0 font-bold">✕</span>
                      )}
                      <span className={isUserPassValid ? "text-emerald-400 font-semibold" : "text-slate-400"}>
                        At least 6 characters ({targetUserPassword.length}/6)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUserPassMatching && targetUserConfirmPassword ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <span className="text-amber-500 shrink-0 font-bold">✕</span>
                      )}
                      <span className={(isUserPassMatching && targetUserConfirmPassword) ? "text-emerald-400 font-semibold" : "text-slate-400"}>
                        {(isUserPassMatching && targetUserConfirmPassword) ? "Passwords match exactly" : "Passwords do not match yet"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-slate-950/60 rounded-lg text-[10px] text-slate-405 leading-relaxed border border-slate-850">
                  🚨 System admins hold permission override rights. Password changes take effect instantly across all warehouse client portals without session terminations.
                </div>
              </div>

              <div className="pt-2 p-6 border-t border-slate-800 bg-slate-950/60  flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPassModalOpen(false)}
                  className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSaveUserPass}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    canSaveUserPass 
                      ? "bg-indigo-650 hover:bg-indigo-600 text-white cursor-pointer" 
                      : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                  }`}
                >
                  Save Password Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ================= GROUP FORM DIALOG MODAL ================= */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 selection:bg-indigo-600 selection:text-white">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in text-slate-101">
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 shrink-0">
              <h3 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                {selectedGroup ? `Configure Security Ring: ${selectedGroup.name}` : 'Establish Permissions Security Group'}
              </h3>
              <button 
                onClick={() => setIsGroupModalOpen(false)} 
                className="text-slate-400 hover:text-white font-semibold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="flex flex-col min-h-0 flex-1">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Group Profile Label Title</label>
                  <input
                    type="text"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 text-slate-100 px-3 py-2 rounded-lg text-xs outline-none"
                    placeholder="e.g. Audit Inspector Team"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Functional Security Responsibility Description</label>
                  <textarea
                    value={groupForm.description}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 px-3 py-2 rounded-lg text-xs outline-none"
                    placeholder="Summarize exact roles of this security ring context."
                    required
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Configure Granted IAM Permission Scopes</label>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    {SYSTEM_PERMISSIONS.map((perm) => {
                      const isGranted = groupForm.permissions.includes(perm.key);
                      return (
                        <div 
                          key={perm.key}
                          onClick={() => handleTogglePermission(perm.key)}
                          className={`p-3 rounded-lg border cursor-pointer select-none transition-all flex items-start gap-3 ${
                            isGranted 
                            ? 'bg-indigo-950/40 border-indigo-500 text-indigo-100' 
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 transition-all ${
                            isGranted ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-700 bg-slate-900'
                          }`}>
                            {isGranted && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{perm.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{perm.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              <div className="p-6 bg-slate-950/60 border-t border-slate-800/85 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  Save Group Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
