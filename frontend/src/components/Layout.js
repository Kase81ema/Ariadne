import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  LayoutDashboard, Users, GraduationCap, FileText, Settings2,
  GitBranch, CheckCircle2, Download, FolderOpen, LogOut, Zap, Menu, X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profiles', icon: Users, label: 'Profili Social' },
  { to: '/courses', icon: GraduationCap, label: 'Corsi ed Eventi' },
  { to: '/editorial', icon: FileText, label: 'Editoriale' },
  { to: '/rules', icon: Settings2, label: 'Regole' },
  { to: '/workflow', icon: GitBranch, label: 'Workflow' },
  { to: '/approvals', icon: CheckCircle2, label: 'Approvazioni' },
  { to: '/export', icon: Download, label: 'Esporta' },
  { to: '/repository', icon: FolderOpen, label: 'Repository' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[hsl(258,100%,69%)] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-semibold ariadne-heading" data-testid="app-title">Ariadne</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">Editorial Studio</p>
          </div>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              data-testid={`nav-${to.replace('/', '')}`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-4">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-gray-500 hover:text-gray-900"
          onClick={handleLogout}
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4" />
          Esci
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-sm border"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-btn"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/20" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static z-40 w-[260px] h-full bg-white border-r border-gray-100
        transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
