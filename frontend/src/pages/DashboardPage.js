import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, profilesAPI } from '../lib/api';
import { Calendar as CalIcon, FileText, CheckCircle2, Download, Clock, AlertTriangle, ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'badge-blue', generated: 'badge-purple', review: 'badge-orange',
  approved: 'badge-green', exported: 'badge-green',
};
const STATUS_LABELS = {
  draft: 'Bozza', generated: 'Generato', review: 'In revisione',
  approved: 'Approvato', exported: 'Esportato',
};
const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

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

  // Detect conflicts (multiple posts for same profile on same day)
  const conflicts = useMemo(() => {
    const map = {};
    calendarPosts.forEach(p => {
      const key = `${p.scheduled_date}_${p.profile_id}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).filter(([, c]) => c > 2).map(([k]) => k.split('_')[0]);
  }, [calendarPosts]);

  return (
    <div data-testid="dashboard-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Dashboard</h1>
        <p className="text-base text-gray-500">Panoramica del calendario editoriale</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard icon={Clock} label="Oggi" value={stats.today_posts || 0} accent="purple" testId="stat-today" />
        <StatCard icon={CalIcon} label="Questa settimana" value={stats.week_posts || 0} accent="blue" testId="stat-week" />
        <StatCard icon={FileText} label="In revisione" value={stats.review_posts || 0} accent="orange" testId="stat-review" />
        <StatCard icon={CheckCircle2} label="Approvati" value={stats.approved_posts || 0} accent="green" testId="stat-approved" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard icon={FileText} label="Bozze" value={stats.draft_posts || 0} accent="blue" testId="stat-draft" onClick={() => navigate('/editorial?status=draft')} />
        <StatCard icon={FileText} label="Generati" value={stats.generated_posts || 0} accent="purple" testId="stat-generated" onClick={() => navigate('/editorial?status=generated')} />
        <StatCard icon={Download} label="Esportati" value={stats.exported_posts || 0} accent="green" testId="stat-exported" onClick={() => navigate('/export')} />
        <StatCard icon={CalIcon} label="Campagne attive" value={stats.active_campaigns || 0} accent="orange" testId="stat-campaigns" onClick={() => navigate('/workflow')} />
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

function StatCard({ icon: Icon, label, value, accent, testId, onClick }) {
  const colors = {
    purple: 'text-[#7B61FF] bg-[#7B61FF]/8',
    orange: 'text-[#F5A623] bg-[#F5A623]/8',
    green: 'text-[#10B981] bg-[#10B981]/8',
    blue: 'text-[#3B82F6] bg-[#3B82F6]/8',
    red: 'text-[#EF4444] bg-[#EF4444]/8',
  };
  return (
    <Card className={`border-gray-100 ${onClick ? 'cursor-pointer hover:border-gray-200 transition-all' : ''}`} data-testid={testId} onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[accent]}`}>
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </div>
          {onClick && <MousePointerClick className="w-3 h-3 text-gray-300 ml-auto" />}
        </div>
        <p className="text-2xl font-semibold ariadne-heading">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
