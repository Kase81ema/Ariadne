import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { communityAPI } from '../lib/api';
import {
  ArrowRight, Heart, MessageCircle, Calendar, Sparkles,
  UserCircle, Target, GraduationCap, Briefcase, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const OBJECTIVES = [
  { id: 'crescita_personale', label: 'Crescita personale', icon: Sparkles },
  { id: 'professione', label: 'Professione / Coaching', icon: Target },
  { id: 'business', label: 'Business / Organizzazione', icon: Briefcase },
];

const LEVELS = [
  { id: 'interessato', label: 'Interessato/a' },
  { id: 'studente', label: 'Studente' },
  { id: 'alumni', label: 'Alumni' },
];

function OnboardingDialog({ open, onComplete, userName }) {
  const [name, setName] = useState(userName || '');
  const [objective, setObjective] = useState('');
  const [level, setLevel] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !objective || !level) return;
    setSaving(true);
    try {
      await communityAPI.saveOnboarding({ display_name: name.trim(), objective, level });
      toast.success('Profilo completato');
      onComplete();
    } catch {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="ariadne-heading text-xl">Benvenuto nella community</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 mb-4">Dicci qualcosa di te per personalizzare la tua esperienza.</p>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Come ti chiami?</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Il tuo nome" data-testid="onboarding-name" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Qual e il tuo obiettivo?</Label>
            <div className="grid grid-cols-3 gap-2">
              {OBJECTIVES.map(o => {
                const Icon = o.icon;
                return (
                  <button
                    key={o.id}
                    onClick={() => setObjective(o.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      objective === o.id ? 'border-[#7B61FF] bg-[#7B61FF]/[0.03]' : 'border-gray-100 hover:border-gray-200'
                    }`}
                    data-testid={`onboarding-obj-${o.id}`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1.5 text-gray-500" />
                    <span className="text-xs font-medium text-gray-700">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Il tuo livello</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger data-testid="onboarding-level"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                {LEVELS.map(l => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !objective || !level || saving}
            className="w-full h-11 gap-2"
            data-testid="onboarding-submit"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Inizia
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CommunityDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userName, setUserName] = useState('');

  const load = async () => {
    try {
      const res = await communityAPI.dashboard();
      setData(res.data);
      if (!res.data.onboarded) {
        setUserName(res.data.profile?.display_name || '');
        setShowOnboarding(true);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div data-testid="community-dashboard-page">
      <OnboardingDialog
        open={showOnboarding}
        onComplete={() => { setShowOnboarding(false); load(); }}
        userName={userName}
      />

      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Community</h1>
        <p className="text-base text-gray-500">La tua area personale Ariadne</p>
      </div>

      {/* Banners */}
      {data?.banners?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {data.banners.map(b => (
            <Card key={b.banner_id} className="border-gray-100 hover:border-gray-200 transition-colors group cursor-pointer" data-testid={`banner-${b.banner_id}`} onClick={() => b.link && navigate(b.link)}>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{b.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{b.body}</p>
                {b.cta_text && (
                  <span className="text-xs font-medium text-[#7B61FF] group-hover:underline inline-flex items-center gap-1">
                    {b.cta_text} <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming events */}
        <Card className="border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Prossimi eventi</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/community/events')} className="text-xs gap-1" data-testid="goto-events">
                Tutti <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
            {data?.upcoming_events?.length > 0 ? (
              <div className="space-y-3">
                {data.upcoming_events.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50">
                    <div className="w-10 h-10 rounded-lg bg-[#7B61FF]/8 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-[#7B61FF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{e.title}</p>
                      <p className="text-xs text-gray-400">{e.label && `${e.label} - `}{new Date(e.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Nessun evento in programma</p>
            )}
          </CardContent>
        </Card>

        {/* Recent feed with images */}
        <Card className="border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Ultimi dal feed</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/feed')} className="text-xs gap-1" data-testid="goto-feed">
                Feed <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
            {data?.recent_posts?.length > 0 ? (
              <div className="space-y-3">
                {data.recent_posts.map(p => (
                  <div key={p.post_id} className="p-3 rounded-lg bg-gray-50/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden" style={{ background: `hsl(${(p.author?.name?.charCodeAt(0) || 0) * 7 % 360} 60% 90%)`, color: `hsl(${(p.author?.name?.charCodeAt(0) || 0) * 7 % 360} 60% 35%)` }}>
                        {p.author?.picture ? (
                          <img src={p.author.picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          p.author?.name?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700">{p.author?.name}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{new Date(p.created_at).toLocaleDateString('it-IT')}</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{p.content}</p>
                    {p.image_url && (
                      <img src={`${process.env.REACT_APP_BACKEND_URL}${p.image_url}`} alt="" className="rounded-md mt-2 max-h-24 w-full object-cover" />
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {p.like_count}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {p.comment_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Nessun post ancora. Inizia la conversazione!</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Volti della community - human faces section */}
      {data?.community_members?.length > 0 && (
        <Card className="border-gray-100 mt-6">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Volti della community</h2>
            <div className="flex flex-wrap gap-3">
              {data.community_members.map((m, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-50 border border-gray-100" data-testid={`member-chip-${i}`}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden" style={{ background: `hsl(${(m.name?.charCodeAt(0) || 0) * 7 % 360} 60% 90%)`, color: `hsl(${(m.name?.charCodeAt(0) || 0) * 7 % 360} 60% 35%)` }}>
                    {m.picture ? <img src={m.picture} alt="" className="w-full h-full object-cover" /> : m.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="text-xs font-medium text-gray-600">{m.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Journey progress placeholder */}
      <Card className="border-gray-100 mt-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Il mio percorso</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/my-journey')} className="text-xs gap-1" data-testid="goto-journey">
              Dettagli <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={data?.journey_summary?.total_steps ? (data.journey_summary.completed_steps / data.journey_summary.total_steps) * 100 : 0} className="h-2" />
            </div>
            <span className="text-xs text-gray-400">
              {data?.journey_summary?.completed_steps || 0}/{data?.journey_summary?.total_steps || 0} completati
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
