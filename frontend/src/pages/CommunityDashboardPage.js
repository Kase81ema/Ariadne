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
  Target, GraduationCap, Briefcase, Loader2,
  BookOpen, Map, Bell, Users, FolderOpen, Download, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const OBJECTIVES = [
  { id: 'crescita_personale', label: 'Crescita personale', icon: Sparkles },
  { id: 'professione', label: 'Professione / Coaching', icon: Target },
  { id: 'business', label: 'Business / Organizzazione', icon: Briefcase },
];

const LEVELS = [
  { id: 'interessato', label: 'Interessato/a', desc: 'Sto esplorando i percorsi Ariadne' },
  { id: 'studente', label: 'Studente', desc: 'Sto frequentando un corso Ariadne' },
  { id: 'alumni', label: 'Alumni', desc: 'Ho completato un percorso formativo' },
  { id: 'trainer', label: 'Trainer Ariadne', desc: 'Faccio parte del team formatori' },
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Come ti definiresti oggi?</Label>
            <div className="space-y-2">
              {LEVELS.map(l => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    level === l.id ? 'border-[hsl(82,60%,42%)] bg-[hsl(82,60%,42%)]/5' : 'border-gray-100 hover:border-gray-200'
                  }`}
                  data-testid={`onboarding-level-${l.id}`}
                >
                  <span className="text-sm font-medium block">{l.label}</span>
                  <span className="text-[11px] text-gray-400">{l.desc}</span>
                </button>
              ))}
            </div>
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

const INTEREST_BADGE = {
  interested: { label: 'Interessato/a', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confermato/a', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  enrolled: { label: 'Iscritto/a', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function CommunityDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [catalogCourses, setCatalogCourses] = useState([]);
  const [trainingCourses, setTrainingCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userName, setUserName] = useState('');

  const normalizeText = (value) => String(value || '').toLowerCase();

  const resolveCourseFromText = (text) => {
    const normalized = normalizeText(text);
    return trainingCourses.find((course) => {
      const title = normalizeText(course.title);
      if (normalized.includes('core coaching') && title.includes('core coaching')) return true;
      if ((normalized.includes('digital presence') || normalized.includes('presenza digitale')) && (title.includes('digital presence') || title.includes('presenza digitale'))) return true;
      if (normalized.includes('business del coach') && title.includes('business del coach')) return true;
      return false;
    }) || null;
  };

  const load = async () => {
    try {
      const [dashRes, catRes, trainingRes] = await Promise.all([
        communityAPI.dashboard(),
        schoolAPI.getCatalog().catch(() => ({ data: [] })),
        schoolAPI.listTrainingCourses().catch(() => ({ data: [] })),
      ]);
      setData(dashRes.data);
      setCatalogCourses(catRes.data || []);
      setTrainingCourses(trainingRes.data || []);
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

  const completedCourses = catalogCourses.filter(c => c.user_status === 'completed').length;
  const inProgressCourses = catalogCourses.filter(c => c.user_status === 'in_progress').length;
  const totalCourses = catalogCourses.length;
  const progressPct = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
  const openEnrollmentBanner = (data?.banners || []).find((banner) => normalizeText(banner.title).includes('iscrizioni aperte')) || data?.banners?.[0] || null;
  const featuredProgramBanner = (data?.banners || []).find((banner) => normalizeText(banner.title).includes('digital presence') || normalizeText(banner.title).includes('presenza digitale')) || data?.banners?.[1] || null;
  const openEnrollmentCourse = resolveCourseFromText(openEnrollmentBanner?.title || openEnrollmentBanner?.body || '');
  const featuredProgramCourse = resolveCourseFromText(featuredProgramBanner?.title || featuredProgramBanner?.body || '') || trainingCourses.find((course) => normalizeText(course.title).includes('digital presence') || normalizeText(course.title).includes('presenza digitale')) || null;
  const firstName = data?.profile?.display_name || user?.name || 'benvenuta';
  const boardPosts = data?.recent_posts?.slice(0, 4) || [];

  return (
    <div data-testid="community-dashboard-page">
      <OnboardingDialog open={showOnboarding} onComplete={() => { setShowOnboarding(false); load(); }} userName={userName} />

      <div className="mb-8">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">
          Ciao{data?.profile?.display_name ? `, ${data.profile.display_name}` : ''}!
        </h1>
        <p className="text-base text-gray-500">Uno spazio pensato per orientarti, nutrire la tua crescita e sentirti parte della community Ariadne.</p>
      </div>

      {/* ===== TOP ROW: Benvenuto + Iscrizioni aperte (equal height) ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6" style={{ alignItems: 'stretch' }}>
        {/* BENVENUTO */}
        <Card className="border-gray-100 flex flex-col" data-testid="school-welcome-card">
          <CardContent className="p-6 flex flex-col flex-1">
            <Badge variant="outline" className="text-[10px] badge-yellow mb-3 self-start">Benvenuto</Badge>
            <h2 className="text-xl font-semibold ariadne-heading mb-3">{firstName}, questo spazio ti accompagna con cura e concretezza.</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              Qui puoi orientarti, restare in connessione con la community e dare continuita al tuo cammino professionale con uno sguardo piu presente, consapevole e personale.
              Emanuele, Arianna ed Emanuele ti accolgono in questo spazio con la cura di chi accompagna processi di crescita, presenza e trasformazione nella relazione con se e con gli altri.
            </p>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Nella community trovi persone con percorsi diversi: chi si sta avvicinando per la prima volta (<strong>Interessati</strong>), chi sta frequentando un corso (<strong>Studenti</strong>), chi ha completato un percorso e resta in connessione (<strong>Alumni</strong>) e chi fa parte del team formativo (<strong>Trainer Ariadne</strong>). Ognuno porta il proprio contributo.
            </p>
            <div className="mt-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => navigate('/feed')}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-150 bg-white text-left transition-all hover:bg-[hsl(82,60%,42%)]/8 hover:border-[hsl(82,60%,42%)]/30"
                data-testid="welcome-connect-community"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-[hsl(82,60%,42%)]/15 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Users className="w-4 h-4 text-gray-500 group-hover:text-[hsl(82,60%,42%)]" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-800 leading-tight">Entra nella community</span>
                  <span className="block text-[11px] text-gray-400 mt-0.5 leading-snug">Partecipa alla bacheca</span>
                </div>
              </button>
              <button
                onClick={() => navigate('/my-journey')}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-150 bg-white text-left transition-all hover:bg-[hsl(82,60%,42%)]/8 hover:border-[hsl(82,60%,42%)]/30"
                data-testid="welcome-grow-professionally"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-[hsl(82,60%,42%)]/15 flex items-center justify-center flex-shrink-0 transition-colors">
                  <BookOpen className="w-4 h-4 text-gray-500 group-hover:text-[hsl(82,60%,42%)]" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-800 leading-tight">Coltiva il percorso</span>
                  <span className="block text-[11px] text-gray-400 mt-0.5 leading-snug">Crescita professionale</span>
                </div>
              </button>
              <button
                onClick={() => navigate('/community/events')}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-150 bg-white text-left transition-all hover:bg-[hsl(82,60%,42%)]/8 hover:border-[hsl(82,60%,42%)]/30"
                data-testid="welcome-stay-updated"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-[hsl(82,60%,42%)]/15 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Bell className="w-4 h-4 text-gray-500 group-hover:text-[hsl(82,60%,42%)]" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-800 leading-tight">Resta aggiornato/a</span>
                  <span className="block text-[11px] text-gray-400 mt-0.5 leading-snug">Webinar e occasioni</span>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ISCRIZIONI APERTE */}
        {openEnrollmentBanner && (
          <Card className="border-gray-100 overflow-hidden flex flex-col" data-testid="open-enrolment-banner-card">
            {openEnrollmentBanner.image_url && (
              <div className="h-[180px] overflow-hidden flex-shrink-0">
                <img src={openEnrollmentBanner.image_url} alt="Iscrizioni aperte" className="w-full h-full object-cover" />
              </div>
            )}
            <CardContent className="p-5 space-y-3 flex flex-col flex-1">
              <Badge variant="outline" className="text-[10px] badge-green self-start">Iscrizioni aperte</Badge>
              <div className="flex-1">
                <h2 className="text-lg font-semibold leading-tight">{openEnrollmentBanner.title}</h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{openEnrollmentBanner.body}</p>
              </div>
              <Button className="w-full gap-2 mt-auto" onClick={() => navigate(openEnrollmentCourse ? `/course/${openEnrollmentCourse.course_id}` : '/training-courses')} data-testid="open-enrolment-banner-cta">
                Scopri il programma <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== SECOND ROW: Il mio percorso (full width) ===== */}
      <Card className="border-gray-100 mb-6" data-testid="journey-summary-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(82,60%,42%)]/8 flex items-center justify-center">
                <Map className="w-5 h-5 text-[hsl(82,60%,42%)]" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Il mio percorso</h2>
                <p className="text-xs text-gray-400">
                  {completedCourses}/{totalCourses} corsi completati
                  {inProgressCourses > 0 && ` · ${inProgressCourses} in corso`}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/my-journey')} className="gap-1" data-testid="goto-journey">
              Vai al percorso <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <Progress value={progressPct} className="h-2 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-500">
            <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
              <p className="font-semibold text-gray-700 mb-1">Dove sei ora</p>
              <p>{completedCourses > 0 ? `Hai gia consolidato ${completedCourses} passaggi del tuo cammino.` : 'Stai iniziando a dare forma al tuo percorso con Ariadne.'}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
              <p className="font-semibold text-gray-700 mb-1">Cosa puoi far crescere</p>
              <p>{inProgressCourses > 0 ? `Hai ${inProgressCourses} esperienza/e da far maturare nelle prossime settimane.` : 'Puoi scegliere il prossimo passo formativo piu adatto al momento che stai vivendo.'}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
              <p className="font-semibold text-gray-700 mb-1">Come orientarti</p>
              <p>Usa dashboard, bacheca e prossime occasioni per restare presente e dare continuita alla tua crescita.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== THIRD ROW: Le prossime occasioni (left) + Dalla bacheca (right) ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-[0.82fr_1.18fr] gap-6 mb-6 items-start">
        {/* LEFT COLUMN: Events + Featured program + Materiali */}
        <div className="space-y-4" data-testid="upcoming-events-column">
          {/* Le prossime occasioni */}
          <Card className="border-gray-100" data-testid="upcoming-events-card">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-base font-semibold">Le prossime occasioni</h2>
                  <p className="text-xs text-gray-400 mt-1">Eventi e programmi da esplorare — clicca per saperne di piu.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/community/events')} className="text-xs gap-1" data-testid="goto-events">
                  Tutte le occasioni <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {data?.upcoming_events?.length > 0 ? (
                  data.upcoming_events.map((e, i) => {
                    const interestBadge = INTEREST_BADGE[e.user_interest] || null;
                    return (
                      <button
                        key={i}
                        onClick={() => navigate(e.course_id ? `/course/${e.course_id}` : '/training-courses')}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-50/70 border border-gray-100 text-left transition-all hover:bg-[hsl(82,60%,42%)]/6 hover:border-[hsl(82,60%,42%)]/20 group"
                        data-testid={`upcoming-event-${i}`}
                      >
                        <div className="w-11 h-11 rounded-xl bg-[hsl(82,60%,42%)]/8 group-hover:bg-[hsl(82,60%,42%)]/15 flex items-center justify-center flex-shrink-0 transition-colors">
                          <Calendar className="w-4 h-4 text-[hsl(82,60%,42%)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-medium truncate">{e.title}</p>
                            {interestBadge && (
                              <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${interestBadge.className}`}>
                                {interestBadge.label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{e.label && `${e.label} · `}{new Date(e.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[hsl(82,60%,42%)] flex-shrink-0 transition-colors" />
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Al momento non ci sono eventi in calendario, ma presto troverai nuove occasioni da seguire.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Percorso in evidenza */}
          {(featuredProgramCourse || featuredProgramBanner) && (
            <Card className="border-gray-100 overflow-hidden bg-gradient-to-br from-[hsl(82,60%,42%)]/6 to-white" data-testid="featured-program-card">
              {featuredProgramBanner?.image_url && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={featuredProgramBanner.image_url} alt="Percorso in evidenza" className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-5 space-y-3">
                <Badge variant="outline" className="text-[10px] badge-yellow">Percorso in evidenza</Badge>
                <div>
                  <h3 className="text-lg font-semibold">{featuredProgramBanner?.title || featuredProgramCourse?.title}</h3>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    {featuredProgramBanner?.body || featuredProgramCourse?.description}
                  </p>
                </div>
                <div className="rounded-xl bg-white/90 border border-white p-3">
                  <p className="text-xs text-gray-500">Aprendo la scheda corso puoi segnalarci con un clic che vuoi saperne di piu: il tuo interesse verra registrato e sara visibile anche al team Ariadne.</p>
                </div>
                <Button className="w-full gap-2" onClick={() => navigate(featuredProgramCourse ? `/course/${featuredProgramCourse.course_id}` : '/training-courses')} data-testid="featured-program-cta">
                  Voglio saperne di piu <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* MATERIALI section */}
          <Card className="border-gray-100" data-testid="materiali-section-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(82,60%,42%)]/8 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-[hsl(82,60%,42%)]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Materiali</h2>
                  <p className="text-xs text-gray-400">Risorse e contenuti dalla formazione Ariadne</p>
                </div>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <Download className="w-4 h-4 text-[hsl(82,60%,42%)] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Risorse pratiche</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Micro-guide, schede e strumenti utili per la tua pratica, accessibili anche se sei nuovo/a nel mondo Ariadne.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <Eye className="w-4 h-4 text-[hsl(82,60%,42%)] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Esempi e contenuti dai corsi</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Immagini, materiali visibili e anteprime che raccontano l'esperienza formativa: scopri il tipo di lavoro che Ariadne propone, anche se non hai ancora partecipato.</p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2 group hover:bg-[hsl(82,60%,42%)]/8 hover:border-[hsl(82,60%,42%)]/30 hover:text-[hsl(82,60%,42%)]"
                onClick={() => navigate('/materials')}
                data-testid="goto-materiali"
              >
                <FolderOpen className="w-4 h-4" /> Esplora i materiali <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Dalla bacheca */}
        <Card className="border-gray-100" data-testid="dashboard-board-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">Dalla bacheca</h2>
                <p className="text-xs text-gray-400 mt-1">La vita della community, i pensieri dei trainer e le conversazioni da seguire adesso.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/feed')} className="text-xs gap-1" data-testid="goto-feed">
                Apri la bacheca <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
            {boardPosts.length > 0 ? (
              <div className="space-y-3">
                {boardPosts.map(p => {
                  const color = getColor(p.author?.name);
                  return (
                    <div key={p.post_id} className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden" style={{ background: color.bg, color: color.fg }}>
                          {p.author?.picture ? <img src={p.author.picture} alt="" className="w-full h-full object-cover" /> : p.author?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <span className="text-xs font-medium block">{p.author?.name}</span>
                          <span className="text-[10px] text-gray-400">{new Date(p.created_at).toLocaleDateString('it-IT')}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{p.content}</p>
                      {p.image_url && (
                        <img
                          src={p.image_url.startsWith('http') ? p.image_url : `${process.env.REACT_APP_BACKEND_URL}${p.image_url}`}
                          alt=""
                          className="rounded-xl mt-3 max-h-40 w-full object-cover"
                        />
                      )}
                      <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {p.like_count}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {p.comment_count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">La bacheca sta aspettando nuove voci. Puoi essere tu ad aprire la conversazione.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
