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
import { useState, useEffect } from 'react';

/* ===== NAV DEFINITIONS ===== */
const navGroups = [
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
      { to: '/courses', icon: CalendarDays, label: 'Corsi ed eventi', roles: ['admin'] },
      { to: '/repository', icon: FolderOpen, label: 'Repository', roles: ['admin'] },
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

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const visibleGroups = navGroups
    .filter(group => !group.adminOnly || isAdmin)
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

  const storageKey = 'ariadne_groups';
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
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
  }, [location.pathname, user?.role]);

  const toggleGroup = (id) => {
    setOpenGroups(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: 'hsl(var(--card))' }}>
      {/* Header with logo */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2.5">
          <AriadneLogo className="ariadne-logo" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold ariadne-heading" data-testid="app-title">Ariadne</h1>
            <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Scuola e community
            </p>
          </div>
        </div>
      </div>

      <Separator style={{ backgroundColor: 'hsl(var(--border))' }} />
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
                      {group.items.map(({ to, icon: Icon, label }) => (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={() => setMobileOpen(false)}
                          className="sidebar-link"
                          data-testid={`nav-${to.replace(/\//g, '-').replace(/^-/, '')}`}
                        >
                          <span className="sidebar-link-icon" aria-hidden="true">
                            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.85} />
                          </span>
                          <span className="sidebar-link-label">{label}</span>
                        </NavLink>
                      ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
        </nav>
      </ScrollArea>
      <Separator style={{ backgroundColor: 'hsl(var(--border))' }} />
      <div className="p-4">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-[11px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{user.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          style={{ color: 'hsl(var(--muted-foreground))' }}
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
    <div className="flex h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-sm border"
        style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
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
      `} style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
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
