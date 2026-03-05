import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import {
  LayoutDashboard, Users, GraduationCap, FileText, Settings2,
  GitBranch, CheckCircle2, Download, FolderOpen, LogOut, Zap, Menu, X,
  PlayCircle, Bot, AlertCircle, MessageSquare, Heart, Map, BookOpen,
  Mail, FileOutput, Megaphone, HelpCircle, CalendarDays, UserCircle
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { setupAPI } from '../lib/api';

// Studio comunicazione nav groups
const studioNavGroups = [
  {
    title: 'Avvio',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/start', icon: PlayCircle, label: 'Avvia campagna' },
    ],
  },
  {
    title: 'Produzione',
    items: [
      { to: '/workflow', icon: GitBranch, label: 'Workflow avanzato' },
      { to: '/approvals', icon: CheckCircle2, label: 'Approvazioni' },
      { to: '/export', icon: Download, label: 'Esporta' },
    ],
  },
  {
    title: 'Contenuti',
    items: [
      { to: '/courses', icon: GraduationCap, label: 'Corsi ed Eventi' },
      { to: '/editorial', icon: FileText, label: 'Editoriale' },
    ],
  },
  {
    title: 'Setup',
    items: [
      { to: '/repository', icon: FolderOpen, label: 'Repository', setupKey: 'repository' },
      { to: '/rules', icon: Settings2, label: 'Regole', setupKey: 'rules' },
      { to: '/profiles', icon: Users, label: 'Profili social', setupKey: 'profiles' },
      { to: '/agents', icon: Bot, label: 'Agenti', setupKey: 'agents' },
    ],
  },
];

// Scuola e community nav groups
const schoolNavGroups = [
  {
    title: 'Community',
    items: [
      { to: '/community', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/feed', icon: MessageSquare, label: 'Feed' },
      { to: '/my-journey', icon: Map, label: 'Il mio percorso' },
      { to: '/materials', icon: BookOpen, label: 'Materiali' },
      { to: '/community/events', icon: CalendarDays, label: 'Eventi e annunci' },
      { to: '/assistant', icon: HelpCircle, label: 'Assistente' },
    ],
  },
  {
    title: 'Gestione',
    adminOnly: true,
    items: [
      { to: '/inbox', icon: Mail, label: 'Inbox' },
      { to: '/routing-rules', icon: GitBranch, label: 'Regole smistamento' },
      { to: '/email-templates', icon: FileOutput, label: 'Template email' },
      { to: '/users-admin', icon: Users, label: 'Utenti' },
      { to: '/cohorts-admin', icon: GraduationCap, label: 'Cohort e materiali' },
      { to: '/banners-admin', icon: Megaphone, label: 'Banner consigli' },
    ],
  },
];

function SetupBadge({ status }) {
  if (status === 'ok') return <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] ml-auto flex-shrink-0" />;
  if (status === 'warn') return <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] ml-auto flex-shrink-0" />;
  if (status === 'missing') return <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] ml-auto flex-shrink-0" />;
  return null;
}

function getSetupStatus(key, readiness) {
  if (!readiness) return null;
  if (key === 'profiles') return readiness.profiles_active_count > 0 ? 'ok' : 'missing';
  if (key === 'rules') return readiness.rules_count > 0 ? 'ok' : 'missing';
  if (key === 'agents') return readiness.agents_active_count >= 3 ? 'ok' : (readiness.agents_active_count > 0 ? 'warn' : 'missing');
  if (key === 'repository') return readiness.repository_total > 0 ? 'ok' : 'warn';
  return null;
}

// Paths belonging to each area
const schoolPaths = ['/community', '/feed', '/my-journey', '/materials', '/community/events', '/assistant', '/inbox', '/routing-rules', '/email-templates', '/users-admin', '/cohorts-admin', '/banners-admin'];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [readiness, setReadiness] = useState(null);

  const canSeeStudio = user?.role === 'admin' || user?.role === 'editor';
  const isOnSchoolPath = schoolPaths.some(p => location.pathname.startsWith(p));

  const [area, setArea] = useState(() => {
    if (!canSeeStudio) return 'school';
    if (isOnSchoolPath) return 'school';
    return localStorage.getItem('ariadne_area') || 'studio';
  });

  // Sync area with current path
  useEffect(() => {
    if (isOnSchoolPath && area !== 'school') setArea('school');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const switchArea = (newArea) => {
    setArea(newArea);
    localStorage.setItem('ariadne_area', newArea);
    if (newArea === 'school') navigate('/community');
    else navigate('/dashboard');
  };

  const fetchReadiness = useCallback(() => {
    if (canSeeStudio) {
      setupAPI.readiness().then(r => setReadiness(r.data)).catch(() => {});
    }
  }, [canSeeStudio]);

  useEffect(() => {
    fetchReadiness();
    const iv = setInterval(fetchReadiness, 30000);
    return () => clearInterval(iv);
  }, [fetchReadiness]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentNavGroups = area === 'school' ? schoolNavGroups : studioNavGroups;
  const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[hsl(258,100%,69%)] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold ariadne-heading" data-testid="app-title">Ariadne</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
              {area === 'school' ? 'Scuola & Community' : 'Editorial Studio'}
            </p>
          </div>
          {area === 'studio' && readiness && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${readiness.ready ? 'bg-[#10B981]/10' : 'bg-[#F5A623]/10'}`} data-testid="readiness-indicator">
                    {readiness.ready
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                      : <AlertCircle className="w-3.5 h-3.5 text-[#F5A623]" />
                    }
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs">{readiness.ready ? 'Pronto a generare' : `Setup incompleto: ${readiness.missing?.length || 0} elementi mancanti`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Area selector - only show if user can see both */}
      {canSeeStudio && (
        <div className="px-4 pb-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg" data-testid="area-selector">
            <button
              onClick={() => switchArea('studio')}
              className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all ${
                area === 'studio' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid="area-studio-btn"
            >
              Studio
            </button>
            <button
              onClick={() => switchArea('school')}
              className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all ${
                area === 'school' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid="area-school-btn"
            >
              Scuola
            </button>
          </div>
        </div>
      )}

      <Separator />
      <ScrollArea className="flex-1 py-2">
        <nav className="px-3">
          {currentNavGroups
            .filter(group => !group.adminOnly || isAdminOrEditor)
            .map((group) => (
            <div key={group.title} className="mb-1">
              <p className="px-4 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-300">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, setupKey }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    data-testid={`nav-${to.replace(/\//g, '-').replace(/^-/, '')}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                    <span className="flex-1 truncate">{label}</span>
                    {setupKey && <SetupBadge status={getSetupStatus(setupKey, readiness)} />}
                  </NavLink>
                ))}
              </div>
            </div>
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
