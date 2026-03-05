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
import { communityAPI, schoolAPI } from '../lib/api';
import {
  ArrowRight, Heart, MessageCircle, Calendar, Sparkles,
  UserCircle, Target, GraduationCap, Briefcase, Loader2,
  BookOpen, Map
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

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
      toast.success('Benvenuto nella community!');
      onComplete();
    } catch { toast.error('Errore'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="ariadne-heading text-xl">Benvenuto in Ariadne!</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">Raccontaci qualcosa di te per personalizzare la tua esperienza</p>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Come ti chiami?</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Il tuo nome" data-testid="onboarding-name" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Il tuo obiettivo</Label>
            <div className="grid grid-cols-3 gap-2">
              {OBJECTIVES.map(obj => (
                <button
                  key={obj.id}
                  onClick={() => setObjective(obj.id)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    objective === obj.id ? 'border-[hsl(82,60%,42%)] bg-[hsl(82,60%,42%)]/5' : 'border-gray-100 hover:border-gray-200'
                  }`}
                  data-testid={`onboarding-obj-${obj.id}`}
                >
                  <obj.icon className={`w-5 h-5 mx-auto mb-1 ${objective === obj.id ? 'text-[hsl(82,60%,42%)]' : 'text-gray-400'}`} />
                  <span className="text-[11px] font-medium">{obj.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Il tuo livello</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger data-testid="onboarding-level"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                {LEVELS.map(l => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={!name.trim() || !objective || !level || saving} className="w-full h-11 gap-2" data-testid="onboarding-submit">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Inizia
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getColor(name) {
  const h = (name?.charCodeAt(0) || 0) * 7 % 360;
  return { bg: `hsl(${h} 55% 90%)`, fg: `hsl(${h} 55% 35%)` };
}

export default function CommunityDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userName, setUserName] = useState('');

  const load = async () => {
    try {
      const [dashRes, catRes] = await Promise.all([
        communityAPI.dashboard(),
        schoolAPI.getCatalog().catch(() => ({ data: [] })),
      ]);
      setData(dashRes.data);
      setCourses(catRes.data || []);
      if (!dashRes.data.onboarded) {
        setUserName(dashRes.data.profile?.display_name || '');
        setShowOnboarding(true);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const completedCourses = courses.filter(c => c.user_status === 'completed').length;
  const inProgressCourses = courses.filter(c => c.user_status === 'in_progress').length;
  const totalCourses = courses.length;
  const progressPct = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  return (
    <div data-testid="community-dashboard-page">
      <OnboardingDialog open={showOnboarding} onComplete={() => { setShowOnboarding(false); load(); }} userName={userName} />

      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">
          Ciao{data?.profile?.display_name ? `, ${data.profile.display_name}` : ''}!
        </h1>
        <p className="text-base text-gray-500">La tua area personale Ariadne</p>
      </div>

      {/* Il mio percorso - FIRST after welcome */}
      <Card className="border-gray-100 mb-6" data-testid="journey-summary-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(82,60%,42%)]/8 flex items-center justify-center">
                <Map className="w-5 h-5 text-[hsl(82,60%,42%)]" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Il mio percorso</h2>
                <p className="text-xs text-gray-400">
                  {completedCourses}/{totalCourses} corsi completati
                  {inProgressCourses > 0 && ` | ${inProgressCourses} in corso`}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/my-journey')} className="gap-1" data-testid="goto-journey">
              Vai al percorso <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <Progress value={progressPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Banners with images */}
      {data?.banners?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {data.banners.map(b => (
            <Card key={b.banner_id} className="border-gray-100 hover:border-gray-200 transition-all group cursor-pointer overflow-hidden" data-testid={`banner-${b.banner_id}`} onClick={() => b.link && b.link !== '#' && navigate(b.link)}>
              {b.image_url && (
                <div className="h-32 overflow-hidden">
                  <img src={b.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-1">{b.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">{b.body}</p>
                {b.cta_text && (
                  <span className="text-xs font-medium text-[hsl(82,60%,42%)] group-hover:underline inline-flex items-center gap-1">
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
                    <div className="w-10 h-10 rounded-lg bg-[hsl(82,60%,42%)]/8 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-[hsl(82,60%,42%)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.title}</p>
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

        {/* Recent from Bacheca */}
        <Card className="border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Dalla bacheca</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/feed')} className="text-xs gap-1" data-testid="goto-feed">
                Bacheca <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
            {data?.recent_posts?.length > 0 ? (
              <div className="space-y-3">
                {data.recent_posts.slice(0, 3).map(p => {
                  const color = getColor(p.author?.name);
                  return (
                    <div key={p.post_id} className="p-3 rounded-lg bg-gray-50/50">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden" style={{ background: color.bg, color: color.fg }}>
                          {p.author?.picture ? <img src={p.author.picture} alt="" className="w-full h-full object-cover" /> : p.author?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="text-xs font-medium">{p.author?.name}</span>
                        <span className="text-[10px] text-gray-400 ml-auto">{new Date(p.created_at).toLocaleDateString('it-IT')}</span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{p.content}</p>
                      {p.image_url && (
                        <img
                          src={p.image_url.startsWith('http') ? p.image_url : `${process.env.REACT_APP_BACKEND_URL}${p.image_url}`}
                          alt=""
                          className="rounded-md mt-2 max-h-24 w-full object-cover"
                        />
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {p.like_count}</span>
                        <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {p.comment_count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Nessun post ancora. Inizia la conversazione!</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Volti della community */}
      {data?.community_members?.length > 0 && (
        <Card className="border-gray-100 mt-6">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Volti della community</h2>
            <div className="flex flex-wrap gap-3">
              {data.community_members.slice(0, 15).map((m, i) => {
                const color = getColor(m.name);
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-50 border border-gray-100" data-testid={`member-chip-${i}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden" style={{ background: color.bg, color: color.fg }}>
                      {m.picture ? <img src={m.picture} alt="" className="w-full h-full object-cover" /> : m.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-xs font-medium text-gray-600">{m.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
