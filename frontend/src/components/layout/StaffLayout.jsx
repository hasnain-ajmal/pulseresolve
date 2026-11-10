import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  AlertOctagon, 
  MessageSquareText, 
  UploadCloud, 
  Network, 
  LogOut, 
  Menu, 
  X, 
  Sparkles, 
  Activity, 
  ExternalLink,
  ShieldCheck,
  Server
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function StaffLayout() {
  const { user, logout, isLiveApi, healthStatus, toggleApiMode } = useAuth();
  const { info } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Incidents', path: '/incidents', icon: AlertOctagon },
    { name: 'Complaints', path: '/complaints', icon: MessageSquareText },
    { name: 'Correlation Graph', path: '/correlation', icon: Network },
  ];

  const handleModeToggle = () => {
    const nextMode = !isLiveApi;
    toggleApiMode(nextMode);
    info(nextMode ? "Switched to Live Backend API mode" : "Switched to In-Memory Mock Data Engine");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar: Dark Navy Linear/Datadog Theme */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B0F19] text-slate-300 flex flex-col border-r border-slate-800/80 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 bg-[#070a12]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-purple-950/40 border border-purple-500/30">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white tracking-tight text-sm">PulseResolve</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50">AI</span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">Incident Intelligence</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Backend vs Mock Mode Indicator & Toggle */}
        <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800/60">
          <button
            onClick={handleModeToggle}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors"
            title="Click to toggle between Live Backend API and In-Memory Mock Engine"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLiveApi ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-purple-400 ring-2 ring-purple-400/20'}`}></span>
              <span className="font-medium text-[11px]">{isLiveApi ? 'Backend: Live' : 'Backend: Mock Engine'}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 hover:text-slate-200 underline">toggle</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-purple-600/15 text-purple-300 font-semibold border border-purple-500/20 shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          <div className="pt-5 px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Quick Actions
          </div>
          <NavLink
            to="/complaints?import=true"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-slate-400" />
            <span>Import CSV</span>
          </NavLink>
          <a
            href="/submit"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>Public Submit Form</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:text-slate-200">portal</span>
          </a>
        </nav>

        {/* User Profile & Logout at Bottom */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070a12]/40">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 shrink-0">
                {(user?.username || 'S')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-200 truncate">{user?.username || 'staff_member'}</p>
                <p className="text-[10px] text-slate-400 capitalize">{user?.role || 'Staff Operator'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar on mobile */}
        <header className="lg:hidden h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-slate-900 text-sm">PulseResolve</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLiveApi ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
            <span className="text-xs text-slate-500 font-mono">{isLiveApi ? 'Live' : 'Mock'}</span>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
