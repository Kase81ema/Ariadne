import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { campaignsAPI } from '../lib/api';
import {
  Search, Plus, PlayCircle, Trash2, FileText, Zap,
  ArrowRight, Calendar, CheckCircle2, Clock, Filter
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  draft: { label: 'Bozza', color: 'badge-blue', icon: FileText },
  planning: { label: 'Pianificazione', color: 'badge-purple', icon: Clock },
  review: { label: 'In revisione', color: 'badge-orange', icon: Clock },
  approved: { label: 'Approvata', color: 'badge-green', icon: CheckCircle2 },
  exported: { label: 'Esportata', color: 'badge-green', icon: CheckCircle2 },
  archived: { label: 'Archiviata', color: 'bg-gray-100 text-gray-500', icon: FileText },
};

const TYPE_LABELS = {
  course_based: 'Da corso/evento',
  editorial: 'Editoriale',
};

export default function EditorialPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    campaignsAPI.list()
      .then(r => { setCampaigns(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Eliminare questa campagna e tutti i post associati?')) return;
    await campaignsAPI.delete(id);
    toast.success('Campagna eliminata');
    load();
  };

  const handleResume = (e, campaign) => {
    e.stopPropagation();
    navigate('/workflow', { state: { resumeCampaignId: campaign.campaign_id } });
  };

  const filtered = campaigns.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getProgress = (c) => {
    if (!c.posts_total) return 0;
    return Math.round((c.posts_approved / c.posts_total) * 100);
  };

  const getStepLabel = (c) => {
    if (c.status === 'exported') return 'Completata';
    if (c.status === 'review' && c.posts_approved === c.posts_total && c.posts_total > 0) return 'Pronta per export';
    if (c.status === 'review') return `${c.posts_approved}/${c.posts_total} approvati`;
    if (c.status === 'planning') return 'Testi da generare';
    return 'Da configurare';
  };

  const activeCount = campaigns.filter(c => !['exported', 'archived'].includes(c.status)).length;
  const reviewCount = campaigns.filter(c => c.status === 'review').length;
  const completedCount = campaigns.filter(c => c.status === 'exported').length;

  return (
    <div data-testid="editorial-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold ariadne-heading mb-2">Campagne</h1>
          <p className="text-base text-gray-500">
            Gestisci tutte le campagne: crea, riprendi, esporta. Il centro di controllo del tuo piano editoriale.
          </p>
        </div>
        <Button
          onClick={() => navigate('/workflow')}
          className="gap-2 h-11 px-6"
          data-testid="new-campaign-btn"
        >
          <Plus className="w-4 h-4" /> Nuova campagna
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="border-gray-100" data-testid="stat-active-campaigns">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#7B61FF]/8 text-[#7B61FF]">
              <Zap className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-2xl font-semibold ariadne-heading">{activeCount}</p>
              <p className="text-xs text-gray-400">Campagne attive</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-100" data-testid="stat-review-campaigns">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#F5A623]/8 text-[#F5A623]">
              <Clock className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-2xl font-semibold ariadne-heading">{reviewCount}</p>
              <p className="text-xs text-gray-400">In revisione</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-100" data-testid="stat-completed-campaigns">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#10B981]/8 text-[#10B981]">
              <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-2xl font-semibold ariadne-heading">{completedCount}</p>
              <p className="text-xs text-gray-400">Completate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca campagna..."
            className="pl-10"
            data-testid="campaign-search-input"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]" data-testid="filter-status">
            <Filter className="w-3.5 h-3.5 mr-2 text-gray-400" />
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="draft">Bozza</SelectItem>
            <SelectItem value="planning">Pianificazione</SelectItem>
            <SelectItem value="review">In revisione</SelectItem>
            <SelectItem value="exported">Esportata</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]" data-testid="filter-type">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            <SelectItem value="course_based">Da corso/evento</SelectItem>
            <SelectItem value="editorial">Editoriale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaigns list */}
      <div className="space-y-3">
        {filtered.map(c => {
          const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
          const progress = getProgress(c);
          return (
            <Card
              key={c.campaign_id}
              className="border-gray-100 hover:border-gray-200 transition-all cursor-pointer group"
              data-testid={`campaign-card-${c.campaign_id}`}
              onClick={() => handleResume({ stopPropagation: () => {} }, c)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-5">
                  {/* Left: icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    c.type === 'course_based' ? 'bg-[#7B61FF]/8 text-[#7B61FF]' : 'bg-[#F5A623]/8 text-[#F5A623]'
                  }`}>
                    {c.type === 'course_based' ? <Zap className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>

                  {/* Center: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{c.title}</h3>
                      <Badge variant="outline" className={`text-[10px] ${statusCfg.color}`}>
                        {statusCfg.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-gray-400">
                        {TYPE_LABELS[c.type] || c.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-2.5">
                      {c.course_title && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" /> {c.course_title}
                        </span>
                      )}
                      {c.period_start && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {c.period_start} — {c.period_end}
                        </span>
                      )}
                      <span>{c.profiles?.length || 0} profili</span>
                      <span>{c.posts_per_profile} post/profilo</span>
                    </div>
                    {/* Progress row */}
                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="h-1.5 flex-1 max-w-xs" />
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">
                        {getStepLabel(c)}
                      </span>
                      {c.posts_total > 0 && (
                        <span className="text-[11px] text-gray-300">
                          {c.posts_total} post
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {c.status !== 'exported' && c.status !== 'archived' && (
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={(e) => handleResume(e, c)}
                        data-testid={`resume-campaign-${c.campaign_id}`}
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Riprendi
                      </Button>
                    )}
                    {c.status === 'review' && c.posts_approved === c.posts_total && c.posts_total > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={(e) => { e.stopPropagation(); navigate('/export'); }}
                        data-testid={`export-campaign-${c.campaign_id}`}
                      >
                        <ArrowRight className="w-3.5 h-3.5" /> Esporta
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDelete(e, c.campaign_id)}
                      data-testid={`delete-campaign-${c.campaign_id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-4" />
            <p className="text-sm text-gray-400 mb-4">
              {search || filterStatus !== 'all' || filterType !== 'all'
                ? 'Nessuna campagna corrisponde ai filtri'
                : 'Nessuna campagna creata'}
            </p>
            {!search && filterStatus === 'all' && filterType === 'all' && (
              <Button onClick={() => navigate('/workflow')} className="gap-2" data-testid="create-first-campaign-btn">
                <Plus className="w-4 h-4" /> Crea la tua prima campagna
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
