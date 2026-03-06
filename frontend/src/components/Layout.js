import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import {
  LayoutDashboard, Users, GraduationCap, FileText, Settings2,
  GitBranch, CheckCircle2, Download, FolderOpen, LogOut, Menu, X,
  PlayCircle, Bot, AlertCircle, MessageSquare, Map, BookOpen,
  Mail, FileOutput, Megaphone, HelpCircle, CalendarDays,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { setupAPI } from '../lib/api';

/* ===== NAV DEFINITIONS ===== */
const studioNavGroups = [
  {
    id: 'avvio',
    title: 'Avvio',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/start', icon: PlayCircle, label: 'Avvio contenuti' },
    ],
  },
  {
    id: 'produzione',
    title: 'Produzione',
    items: [
      { to: '/workflow', icon: GitBranch, label: 'Produzione guidata' },
      { to: '/approvals', icon: CheckCircle2, label: 'Approvazioni' },
      { to: '/export', icon: Download, label: 'Esporta e pubblica' },
    ],
  },
  {
    id: 'contenuti',
    title: 'Contenuti',
    items: [
      { to: '/courses', icon: GraduationCap, label: 'Corsi ed eventi' },
      { to: '/editorial', icon: FileText, label: 'Editoriale' },
      { to: '/images', icon: BookOpen, label: 'Immagini' },
    ],
  },
  {
    id: 'impostazioni',
    title: 'Impostazioni',
    items: [
      { to: '/repository', icon: FolderOpen, label: 'Repository', setupKey: 'repository' },
      { to: '/rules', icon: Settings2, label: 'Regole', setupKey: 'rules' },
      { to: '/profiles', icon: Users, label: 'Profili social', setupKey: 'profiles' },
      { to: '/agents', icon: Bot, label: 'Agenti', setupKey: 'agents' },
    ],
  },
];

const schoolNavGroups = [
  {
    id: 'community',
    title: 'Community',
    items: [
      { to: '/community', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/my-journey', icon: Map, label: 'Il mio percorso' },
      { to: '/feed', icon: MessageSquare, label: 'Bacheca community' },
      { to: '/materials', icon: BookOpen, label: 'Materiali' },
      { to: '/assistant', icon: HelpCircle, label: 'Ariadne AI' },
    ],
  },
  {
    id: 'risorse',
    title: 'Risorse',
    items: [
      { to: '/training-courses', icon: GraduationCap, label: 'Corsi di formazione' },
      { to: '/courses', icon: CalendarDays, label: 'Corsi ed eventi', roles: ['admin', 'editor'] },
      { to: '/repository', icon: FolderOpen, label: 'Repository', roles: ['admin', 'editor'] },
    ],
  },
  {
    id: 'gestione',
    title: 'Gestione scuola',
    adminOnly: true,
    items: [
      { to: '/inbox', icon: Mail, label: 'Posta in arrivo' },
      { to: '/routing-rules', icon: GitBranch, label: 'Regole di smistamento' },
      { to: '/email-templates', icon: FileOutput, label: 'Template email' },
      { to: '/users-admin', icon: Users, label: 'Utenti' },
      { to: '/cohorts-admin', icon: GraduationCap, label: 'Edizioni e materiali' },
      { to: '/banners-admin', icon: Megaphone, label: 'Banner consigliati' },
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

function getSetupTooltip(key, readiness) {
  if (!readiness) return '';
  if (key === 'profiles') return readiness.profiles_active_count > 0 ? `${readiness.profiles_active_count} profili attivi` : 'Manca almeno un profilo social attivo';
  if (key === 'rules') return readiness.rules_count > 0 ? `${readiness.rules_count} regole configurate` : 'Nessuna regola di pianificazione';
  if (key === 'agents') return readiness.agents_active_count >= 3 ? `${readiness.agents_active_count} agenti attivi` : 'Pochi agenti attivi';
  if (key === 'repository') return readiness.repository_total > 0 ? `${readiness.repository_total} documenti` : 'Repository vuoto (consigliato)';
  return '';
}

function AriadneLogo({ className }) {
  const [hasLogo, setHasLogo] = useState(true);
  if (!hasLogo) return null;
  return (
    <img
      src="/ariadne-logo.png"
      alt="Ariadne"
      className={className}
      onError={() => setHasLogo(false)}
    />
  );
}

const schoolPaths = ['/community', '/feed', '/my-journey', '/materials', '/community/events', '/assistant', '/inbox', '/routing-rules', '/email-templates', '/users-admin', '/cohorts-admin', '/banners-admin', '/welcome', '/training-courses'];

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

  /* Collapsible state */
  const currentNavGroups = area === 'school' ? schoolNavGroups : studioNavGroups;
  const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor';
  const visibleGroups = currentNavGroups
    .filter(group => !group.adminOnly || isAdminOrEditor)
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.roles || item.roles.includes(user?.role)),
    }))
    .filter(group => group.items.length > 0);

  const getActiveGroupId = () => {
    for (const g of visibleGroups) {
      if (g.items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'))) return g.id;
    }
    return visibleGroups[0]?.id;
  };

  const storageKey = `ariadne_groups_${area}`;
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return saved;
    } catch { return {}; }
  });

  useEffect(() => {
    const activeGroup = getActiveGroupId();
    setOpenGroups(prev => {
      const first = visibleGroups[0]?.id;
      const next = { ...prev };
      if (first && !(first in next)) next[first] = true;
      if (activeGroup && !(activeGroup in next)) next[activeGroup] = true;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, location.pathname, user?.role]);

  const toggleGroup = (id) => {
    setOpenGroups(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
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

  const isStudioSidebar = area === 'studio';
  const sidebarSurface = isStudioSidebar ? 'linear-gradient(180deg, hsl(220 30% 97%) 0%, hsl(225 36% 94%) 100%)' : 'hsl(var(--card))';
  const sidebarBorder = isStudioSidebar ? 'hsl(220 22% 86%)' : 'hsl(var(--border))';
  const sidebarText = isStudioSidebar ? 'hsl(228 28% 18%)' : 'hsl(var(--foreground))';
  const sidebarMuted = isStudioSidebar ? 'hsl(223 15% 42%)' : 'hsl(var(--muted-foreground))';
  const sidebarSoft = isStudioSidebar ? 'hsl(220 24% 90%)' : 'hsl(var(--muted))';
  const sidebarButtonBg = isStudioSidebar ? 'hsla(0, 0%, 100%, 0.8)' : 'hsl(var(--card))';

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: sidebarSurface }}>
      {/* Header with logo */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2.5">
          <AriadneLogo className="ariadne-logo" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold ariadne-heading" style={{ color: sidebarText }} data-testid="app-title">Ariadne</h1>
            <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: sidebarMuted }}>
              {area === 'school' ? 'Scuola e community' : 'Studio editoriale'}
            </p>
          </div>
          {area === 'studio' && readiness && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${readiness.ready ? 'bg-[#10B981]/10' : 'bg-[#F5A623]/10'}`} data-testid="readiness-indicator">
                    {readiness.ready ? <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" /> : <AlertCircle className="w-3.5 h-3.5 text-[#F5A623]" />}
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

      {/* Area selector */}
      {canSeeStudio && (
        <div className="px-4 pb-3">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: sidebarSoft }} data-testid="area-selector">
            <button
              onClick={() => switchArea('studio')}
              className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all ${
                area === 'studio' ? 'shadow-sm' : ''
              }`}
              style={{
                background: area === 'studio' ? sidebarButtonBg : 'transparent',
                color: area === 'studio' ? sidebarText : sidebarMuted,
              }}
              data-testid="area-studio-btn"
            >
              Studio
            </button>
            <button
              onClick={() => switchArea('school')}
              className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all ${
                area === 'school' ? 'shadow-sm' : ''
              }`}
              style={{
                background: area === 'school' ? 'hsl(var(--card))' : 'transparent',
                color: area === 'school' ? 'hsl(var(--foreground))' : sidebarMuted,
              }}
              data-testid="area-school-btn"
            >
              Scuola
            </button>
          </div>
        </div>
      )}

      <Separator style={{ backgroundColor: sidebarBorder }} />
      <ScrollArea className="flex-1 py-2">
        <nav className="px-4">
          {visibleGroups.map((group) => {
              const isOpen = openGroups[group.id] !== false;
              return (
                <div key={group.id} className="sidebar-group-card" data-testid={`sidebar-group-card-${group.id}`}>
                  <Collapsible open={isOpen} onOpenChange={() => toggleGroup(group.id)}>
                    <CollapsibleTrigger className="group-trigger" data-testid={`group-${group.id}`}>
                      <span className="group-heading-wrap">
                        <span className="group-label">{group.title}</span>
                        <span className="group-line" />
                      </span>
                      <span className="group-chevron-shell">
                        <ChevronRight className="group-chevron" data-open={isOpen ? 'true' : 'false'} />
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-1 pb-1 px-1.5">
                      {group.items.map(({ to, icon: Icon, label, setupKey }) => (
                        <TooltipProvider key={to} delayDuration={500}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <NavLink
                                to={to}
                                exact
                                onClick={() => setMobileOpen(false)}
                                className="sidebar-link"
                                activeClassName="active"
                                data-testid={`nav-${to.replace(/\//g, '-').replace(/^-/, '')}`}
                              >
                                <span className="sidebar-link-icon" aria-hidden="true">
                                  <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.85} />
                                </span>
                                <span className="sidebar-link-label">{label}</span>
                                {setupKey && <SetupBadge status={getSetupStatus(setupKey, readiness)} />}
                              </NavLink>
                            </TooltipTrigger>
                            {setupKey && readiness && (
                              <TooltipContent side="right">
                                <p className="text-xs">{getSetupTooltip(setupKey, readiness)}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
        </nav>
      </ScrollArea>
      <Separator style={{ backgroundColor: sidebarBorder }} />
      <div className="p-4">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: sidebarSoft, color: sidebarMuted }}>
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: sidebarText }}>{user.name}</p>
              <p className="text-[11px] truncate" style={{ color: sidebarMuted }}>{user.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          style={{ color: sidebarMuted }}
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
    <div className="flex h-screen" data-area={area} style={{ background: 'hsl(var(--background))' }}>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-sm border"
        style={{ background: sidebarButtonBg, borderColor: sidebarBorder, color: sidebarText }}
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-btn"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/20" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static z-40 w-[304px] h-full border-r
        transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} style={{ background: sidebarSurface, borderColor: sidebarBorder }}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: 'hsl(var(--background))' }}>
        <div className="max-w-7xl mx-auto p-6 md:p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
