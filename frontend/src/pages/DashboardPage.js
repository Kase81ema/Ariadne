import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, profilesAPI } from '../lib/api';
import {
  Calendar as CalIcon, FileText, CheckCircle2, Download, Clock,
  AlertTriangle, ChevronLeft, ChevronRight, Zap, PlayCircle,
  ArrowRight, Eye, BarChart3
} from 'lucide-react';

const STATUS_COLORS = {
  draft: 'badge-blue', generated: 'badge-purple', review: 'badge-orange',
  approved: 'badge-green', exported: 'badge-green',
};
const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const CAMPAIGN_STATUS = {
  draft: { label: 'Bozza', color: 'badge-blue' },
  planning: { label: 'Pianificazione', color: 'badge-purple' },
  review: { label: 'In revisione', color: 'badge-orange' },
  exported: { label: 'Esportata', color: 'badge-green' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [calendarPosts, setCalendarPosts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [filterProfile, setFilterProfile] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    dashboardAPI.stats().then(r => setStats(r.data)).catch(() => {});
    profilesAPI.list().then(r => setProfiles(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const pId = filterProfile === 'all' ? '' : filterProfile;
    dashboardAPI.calendar(currentMonth, pId).then(r => setCalendarPosts(r.data)).catch(() => {});
  }, [currentMonth, filterProfile]);

  const calendarDays = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, date: dateStr, posts: calendarPosts.filter(p => p.scheduled_date === dateStr) });
    }
    return days;
  }, [currentMonth, calendarPosts]);

  const today = new Date().toISOString().split('T')[0];
  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const [yr, mn] = currentMonth.split('-').map(Number);

  const changeMonth = (delta) => {
    const d = new Date(yr, mn - 1 + delta, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const conflicts = useMemo(() => {
    const map = {};
    calendarPosts.forEach(p => {
      const key = `${p.scheduled_date}_${p.profile_id}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).filter(([, c]) => c > 2).map(([k]) => k.split('_')[0]);
  }, [calendarPosts]);

  const recentCampaigns = stats.recent_campaigns || [];

  return (
    <div data-testid="dashboard-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold ariadne-heading mb-2">Centro di controllo</h1>
          <p className="text-base text-gray-500">
            Panoramica operativa: campagne attive, post in lavorazione e calendario editoriale.
          </p>
        </div>
        <Button onClick={() => navigate('/workflow')} className="gap-2 h-11 px-6" data-testid="quick-new-campaign">
          <PlayCircle className="w-4 h-4" /> Nuova campagna
        </Button>
      </div>

      {/* Operational overview row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Zap} label="Campagne attive" value={stats.active_campaigns || 0}
          accent="purple" testId="stat-active-campaigns"
          onClick={() => navigate('/editorial')}
          subtitle="Gestisci campagne"
        />
        <StatCard
          icon={Eye} label="Post da approvare" value={(stats.generated_posts || 0) + (stats.review_posts || 0)}
          accent="orange" testId="stat-pending-review"
          onClick={() => navigate('/approvals')}
          subtitle="Vai alle approvazioni"
        />
        <StatCard
          icon={CheckCircle2} label="Post approvati" value={stats.approved_posts || 0}
          accent="green" testId="stat-approved"
          onClick={() => navigate('/export')}
          subtitle="Pronto per export"
        />
        <StatCard
          icon={CalIcon} label="Pubblicazioni oggi" value={stats.today_posts || 0}
          accent="blue" testId="stat-today"
        />
      </div>

      {/* Campaign pipeline + stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        <Card className="border-gray-100 lg:col-span-2" data-testid="campaign-pipeline">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold ariadne-heading">Pipeline campagne</h2>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/editorial')}>
                Tutte <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PipelineItem label="Bozza" count={stats.campaigns_draft || 0} color="#3B82F6" />
              <PipelineItem label="Pianificazione" count={stats.campaigns_planning || 0} color="#7B61FF" />
              <PipelineItem label="In revisione" count={stats.campaigns_review || 0} color="#F5A623" />
              <PipelineItem label="Esportate" count={stats.campaigns_exported || 0} color="#10B981" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 lg:col-span-3" data-testid="recent-campaigns-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold ariadne-heading">Campagne recenti</h2>
            </div>
            {recentCampaigns.length > 0 ? (
              <div className="space-y-2.5">
                {recentCampaigns.map(rc => {
                  const scfg = CAMPAIGN_STATUS[rc.status] || CAMPAIGN_STATUS.draft;
                  const pct = rc.posts_total > 0 ? Math.round((rc.posts_approved / rc.posts_total) * 100) : 0;
                  return (
                    <div
                      key={rc.campaign_id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors"
                      onClick={() => navigate('/workflow', { state: { resumeCampaignId: rc.campaign_id } })}
                      data-testid={`recent-campaign-${rc.campaign_id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-800 truncate">{rc.title}</span>
                          <Badge variant="outline" className={`text-[10px] ${scfg.color}`}>{scfg.label}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-1 flex-1" />
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">{rc.posts_approved}/{rc.posts_total}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">Nessuna campagna recente</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Post stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText} label="Bozze" value={stats.draft_posts || 0} accent="blue" testId="stat-draft" />
        <StatCard icon={BarChart3} label="Generati" value={stats.generated_posts || 0} accent="purple" testId="stat-generated" />
        <StatCard icon={Download} label="Esportati" value={stats.exported_posts || 0} accent="green" testId="stat-exported" />
        <StatCard icon={CalIcon} label="Questa settimana" value={stats.week_posts || 0} accent="blue" testId="stat-week" />
      </div>

      {/* Calendar section */}
      <div className="ariadne-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)} data-testid="cal-prev">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold ariadne-heading">{monthNames[mn - 1]} {yr}</h2>
            <Button variant="ghost" size="icon" onClick={() => changeMonth(1)} data-testid="cal-next">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Select value={filterProfile} onValueChange={setFilterProfile}>
            <SelectTrigger className="w-[200px]" data-testid="cal-profile-filter">
              <SelectValue placeholder="Tutti i profili" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i profili</SelectItem>
              {profiles.map(p => (
                <SelectItem key={p.profile_id} value={p.profile_id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-t-lg overflow-hidden">
          {DAYS_IT.map(d => (
            <div key={d} className="bg-gray-50 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-b-lg overflow-hidden">
          {calendarDays.map((cell, i) => (
            <div
              key={i}
              className={`bg-white min-h-[90px] p-2 ${cell?.date === today ? 'bg-[#7B61FF]/[0.03]' : ''} ${!cell ? 'bg-gray-50/50' : ''}`}
            >
              {cell && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${cell.date === today ? 'text-[#7B61FF] font-bold' : 'text-gray-500'}`}>
                      {cell.day}
                    </span>
                    {conflicts.includes(cell.date) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger><AlertTriangle className="w-3 h-3 text-[#F5A623]" /></TooltipTrigger>
                          <TooltipContent><p>Possibile conflitto di pianificazione</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {cell.posts.slice(0, 3).map(p => (
                      <div key={p.post_id} className={`text-[10px] px-1.5 py-0.5 rounded-md truncate ${STATUS_COLORS[p.status] || 'badge-blue'}`} title={`${p.profile_name} - ${p.intention}`}>
                        {p.profile_name?.split(' ')[0]} · {p.intention}
                      </div>
                    ))}
                    {cell.posts.length > 3 && <span className="text-[10px] text-gray-400">+{cell.posts.length - 3}</span>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, testId, onClick, subtitle }) {
  const colors = {
    purple: 'text-[#7B61FF] bg-[#7B61FF]/8',
    orange: 'text-[#F5A623] bg-[#F5A623]/8',
    green: 'text-[#10B981] bg-[#10B981]/8',
    blue: 'text-[#3B82F6] bg-[#3B82F6]/8',
  };
  return (
    <Card className={`border-gray-100 ${onClick ? 'cursor-pointer hover:border-gray-200 transition-all' : ''}`} data-testid={testId} onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[accent]}`}>
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </div>
        </div>
        <p className="text-2xl font-semibold ariadne-heading">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
        {subtitle && onClick && <p className="text-[10px] text-gray-400 mt-1 opacity-60">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function PipelineItem({ label, count, color }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50/70">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs text-gray-500 flex-1">{label}</span>
      <span className="text-sm font-semibold" style={{ color }}>{count}</span>
    </div>
  );
}
