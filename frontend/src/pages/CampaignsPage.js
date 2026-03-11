import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { campaignsAPI } from '../lib/api';
import { Search, Plus, PlayCircle, Trash2, FileText, Zap, ArrowRight, Calendar, CheckCircle2, Clock, Filter } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  planning: { label: 'Planning', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  review: { label: 'In Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  exported: { label: 'Exported', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    campaignsAPI.list().then(r => { setCampaigns(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this campaign and all associated posts?')) return;
    await campaignsAPI.delete(id);
    toast.success('Campaign deleted');
    load();
  };

  const filtered = campaigns.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getProgress = (c) => !c.posts_total ? 0 : Math.round((c.posts_approved / c.posts_total) * 100);
  const getStepLabel = (c) => {
    if (c.status === 'exported') return 'Completed';
    if (c.status === 'review' && c.posts_approved === c.posts_total && c.posts_total > 0) return 'Ready to export';
    if (c.status === 'review') return `${c.posts_approved}/${c.posts_total} approved`;
    if (c.status === 'planning') return 'Texts pending';
    return 'Setup needed';
  };

  const activeCount = campaigns.filter(c => !['exported', 'archived'].includes(c.status)).length;
  const reviewCount = campaigns.filter(c => c.status === 'review').length;

  return (
    <div data-testid="campaigns-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-1">Campaigns</h1>
          <p className="text-sm text-gray-500">Manage all your content campaigns — create, resume, export.</p>
        </div>
        <Button onClick={() => navigate('/workflow')} className="gap-2 h-10 bg-[#2C3792] hover:bg-[#232E7A]" data-testid="new-campaign-btn">
          <Plus className="w-4 h-4" /> New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active', value: activeCount, icon: Zap, color: '#2C3792' },
          { label: 'In Review', value: reviewCount, icon: Clock, color: '#F59E0B' },
          { label: 'Completed', value: campaigns.filter(c => c.status === 'exported').length, icon: CheckCircle2, color: '#10B981' },
        ].map(s => (
          <Card key={s.label} className="border-gray-100" data-testid={`stat-${s.label.toLowerCase().replace(' ', '-')}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}10`, color: s.color }}><s.icon className="w-4 h-4" /></div>
              <div><p className="text-xl font-semibold">{s.value}</p><p className="text-[11px] text-gray-400">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns..." className="pl-10" data-testid="campaign-search-input" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]" data-testid="filter-status"><Filter className="w-3.5 h-3.5 mr-2 text-gray-400" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
            <SelectItem value="exported">Exported</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map(c => {
          const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
          return (
            <Card key={c.campaign_id} className="border-gray-100 hover:border-gray-200 transition-all cursor-pointer group" data-testid={`campaign-card-${c.campaign_id}`} onClick={() => navigate('/workflow', { state: { resumeCampaignId: c.campaign_id } })}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{c.title}</h3>
                      <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {c.period_start && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.period_start} — {c.period_end}</span>}
                      <span>{c.profiles?.length || 0} profiles</span>
                      <span>{c.posts_per_profile} posts/profile</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <Progress value={getProgress(c)} className="h-1.5 flex-1 max-w-xs" />
                      <span className="text-[11px] text-gray-400">{getStepLabel(c)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {c.status !== 'exported' && <Button size="sm" className="gap-1 text-xs bg-[#2C3792] hover:bg-[#232E7A]" data-testid={`resume-${c.campaign_id}`}><PlayCircle className="w-3.5 h-3.5" /> Resume</Button>}
                    <Button size="sm" variant="ghost" onClick={(e) => handleDelete(e, c.campaign_id)} data-testid={`delete-${c.campaign_id}`}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-4">No campaigns yet</p>
            <Button onClick={() => navigate('/workflow')} className="gap-2 bg-[#2C3792] hover:bg-[#232E7A]" data-testid="create-first-btn"><Plus className="w-4 h-4" /> Create your first campaign</Button>
          </div>
        )}
      </div>
    </div>
  );
}
