import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { useNavigate } from 'react-router-dom';
import { schoolAPI } from '../lib/api';
import {
  CheckCircle2, Circle, Clock, BookOpen, Loader2,
  ChevronDown, Award, GraduationCap, Sparkles, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  not_started: { label: 'Non iniziato', icon: Circle, color: 'text-gray-300', badge: '' },
  in_progress: { label: 'In corso', icon: Clock, color: 'text-[#F5A623]', badge: 'badge-orange' },
  completed: { label: 'Completato', icon: CheckCircle2, color: 'text-[#10B981]', badge: 'badge-green' },
};

const CATEGORY_CONFIG = {
  percorso_icf: { label: 'Percorso coaching ICF', icon: GraduationCap, color: 'text-[#2D2649]', bg: 'bg-[#2D2649]/8' },
  specializzazione: { label: 'Arricchimento e specializzazione', icon: Sparkles, color: 'text-[#f9af43]', bg: 'bg-[#f9af43]/10' },
  // Legacy keys for backward compatibility
  ariadne: { label: 'Percorso coaching ICF', icon: GraduationCap, color: 'text-[#2D2649]', bg: 'bg-[#2D2649]/8' },
  tecnica: { label: 'Coach tecnica', icon: GraduationCap, color: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]/8' },
  business: { label: 'Coach business', icon: GraduationCap, color: 'text-[#10B981]', bg: 'bg-[#10B981]/8' },
};

// ICF Credential requirements with detailed tracking
const CREDENTIALS = [
  {
    id: 'acc',
    name: 'ACC (Associate Certified Coach)',
    elements: [
      { key: 'training_hours', label: 'Ore di formazione accreditata', target: 60, unit: 'ore' },
      { key: 'coaching_hours', label: 'Ore di coaching erogate', target: 100, unit: 'ore' },
      { key: 'mentor_hours', label: 'Ore di mentoring ricevute', target: 10, unit: 'ore' },
      { key: 'exam', label: 'Esame ICF CKA', target: 1, unit: '', isBoolean: true },
    ],
  },
  {
    id: 'pcc',
    name: 'PCC (Professional Certified Coach)',
    elements: [
      { key: 'training_hours', label: 'Ore di formazione accreditata', target: 125, unit: 'ore' },
      { key: 'coaching_hours', label: 'Ore di coaching erogate', target: 500, unit: 'ore' },
      { key: 'mentor_hours', label: 'Ore di mentoring ricevute', target: 10, unit: 'ore' },
      { key: 'performance_eval', label: 'Performance Evaluation', target: 1, unit: '', isBoolean: true },
      { key: 'exam', label: 'Esame ICF CKA', target: 1, unit: '', isBoolean: true },
    ],
  },
  {
    id: 'mcc',
    name: 'MCC (Master Certified Coach)',
    elements: [
      { key: 'training_hours', label: 'Ore di formazione accreditata', target: 200, unit: 'ore' },
      { key: 'coaching_hours', label: 'Ore di coaching erogate', target: 2500, unit: 'ore' },
      { key: 'mentor_hours', label: 'Ore di mentoring ricevute', target: 10, unit: 'ore' },
      { key: 'performance_eval', label: 'Performance Evaluation', target: 1, unit: '', isBoolean: true },
      { key: 'exam', label: 'Esame ICF CKA', target: 1, unit: '', isBoolean: true },
    ],
  },
];

function CourseCard({ course, onStatusChange, onViewDetail }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[course.user_status] || STATUS_CONFIG.not_started;
  const StatusIcon = status.icon;

  const cycleStatus = () => {
    const order = ['not_started', 'in_progress', 'completed'];
    const idx = order.indexOf(course.user_status);
    const next = order[(idx + 1) % order.length];
    onStatusChange(course.course_id, next);
  };

  return (
    <Card className="border-gray-100 hover:border-gray-200 transition-all" data-testid={`course-${course.course_id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={cycleStatus} className={`mt-0.5 flex-shrink-0 ${status.color} hover:scale-110 transition-transform`} title={`Stato: ${status.label}. Clicca per cambiare.`} data-testid={`course-status-${course.course_id}`}>
            <StatusIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold">{course.title}</h3>
              <Badge variant="outline" className={`text-[10px] ${status.badge}`}>{status.label}</Badge>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{course.description}</p>
            {course.key_points?.length > 0 && (
              <>
                <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11px] text-[hsl(82,60%,42%)] mt-1.5 hover:underline" data-testid={`course-expand-${course.course_id}`}>
                  <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  {expanded ? 'Nascondi' : 'Dettagli'}
                </button>
                {expanded && (
                  <ul className="mt-1.5 space-y-1">
                    {course.key_points.map((kp, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[hsl(82,60%,42%)] flex-shrink-0" />
                        {kp}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            <button onClick={() => onViewDetail(course.course_id)} className="text-[11px] text-[hsl(82,60%,42%)] mt-2 hover:underline inline-block" data-testid={`view-course-${course.course_id}`}>
              Vedi scheda completa &rarr;
            </button>
            <span className="mx-2 text-gray-200">|</span>
            <button onClick={() => window.location.href = '/my-enrollments'} className="text-[11px] text-[#6859a3] mt-2 hover:underline inline-block" data-testid={`view-enrollments-${course.course_id}`}>
              Pagamenti e iscrizione &rarr;
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CredentialCard({ credential, credProgress, onUpdateProgress }) {
  const [expanded, setExpanded] = useState(false);
  const progress = credProgress || {};

  const totalPct = credential.elements.reduce((acc, el) => {
    const val = progress[el.key] || 0;
    const pct = el.isBoolean ? (val >= 1 ? 100 : 0) : Math.min(100, (val / el.target) * 100);
    return acc + pct;
  }, 0) / credential.elements.length;

  const isAchieved = totalPct >= 100;

  return (
    <Card className={`border-gray-100 ${isAchieved ? 'border-[hsl(82,60%,42%)]/30 bg-[hsl(82,60%,42%)]/[0.02]' : ''}`} data-testid={`credential-${credential.id}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isAchieved ? <Award className="w-5 h-5 text-[hsl(82,60%,42%)]" /> : <Award className="w-5 h-5 text-gray-300" />}
            <h3 className="text-sm font-semibold">{credential.name}</h3>
            {isAchieved && <Badge variant="outline" className="badge-green text-[9px]">Raggiunto!</Badge>}
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <Progress value={totalPct} className="h-1.5 mb-1" />
        <p className="text-[10px] text-gray-400">{Math.round(totalPct)}% completato</p>

        {expanded && (
          <div className="mt-4 space-y-3 pt-3 border-t border-dashed border-gray-100">
            {credential.elements.map(el => {
              const val = progress[el.key] || 0;
              const pct = el.isBoolean ? (val >= 1 ? 100 : 0) : Math.min(100, (val / el.target) * 100);
              return (
                <div key={el.key} className="flex items-center gap-3" data-testid={`cred-el-${credential.id}-${el.key}`}>
                  {pct >= 100 ? <CheckCircle2 className="w-4 h-4 text-[hsl(82,60%,42%)] flex-shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium">{el.label}</span>
                      <span className="text-[10px] text-gray-400">
                        {el.isBoolean ? (val >= 1 ? 'Superato' : 'Da sostenere') : `${val}/${el.target} ${el.unit}`}
                      </span>
                    </div>
                    <Progress value={pct} className="h-1" />
                  </div>
                  {!el.isBoolean ? (
                    <Input
                      type="number"
                      min={0}
                      max={el.target}
                      value={val}
                      onChange={e => onUpdateProgress(credential.id, el.key, parseInt(e.target.value) || 0)}
                      className="w-16 h-7 text-xs text-center"
                    />
                  ) : (
                    <button
                      onClick={() => onUpdateProgress(credential.id, el.key, val >= 1 ? 0 : 1)}
                      className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors ${val >= 1 ? 'bg-[hsl(82,60%,42%)] border-[hsl(82,60%,42%)] text-white' : 'border-gray-200 text-gray-300 hover:border-gray-300'}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyJourneyPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ariadne');
  const [credProgress, setCredProgress] = useState({});

  useEffect(() => {
    schoolAPI.getCatalog().then(r => { setCourses(r.data); setLoading(false); }).catch(() => setLoading(false));
    // Load credential progress from localStorage
    const saved = localStorage.getItem('ariadne_cred_progress');
    if (saved) setCredProgress(JSON.parse(saved));
  }, []);

  const handleStatusChange = async (courseId, newStatus) => {
    try {
      await schoolAPI.updateCourseProgress(courseId, newStatus);
      setCourses(prev => prev.map(c => c.course_id === courseId ? { ...c, user_status: newStatus } : c));
      toast.success(`Stato aggiornato: ${STATUS_CONFIG[newStatus].label}`);
    } catch {
      toast.error("Errore nell'aggiornamento");
    }
  };

  const handleCredentialUpdate = (credId, elementKey, value) => {
    setCredProgress(prev => {
      const next = { ...prev, [credId]: { ...(prev[credId] || {}), [elementKey]: value } };
      localStorage.setItem('ariadne_cred_progress', JSON.stringify(next));
      return next;
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const ariadneCourses = courses.filter(c => c.category === 'ariadne');
  const tecnicaCourses = courses.filter(c => c.category === 'tecnica');
  const businessCourses = courses.filter(c => c.category === 'business');

  const getStats = (list) => {
    const total = list.length;
    const completed = list.filter(c => c.user_status === 'completed').length;
    const inProgress = list.filter(c => c.user_status === 'in_progress').length;
    return { total, completed, inProgress, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const allCourses = courses.length;
  const allCompleted = courses.filter(c => c.user_status === 'completed').length;
  const allInProgress = courses.filter(c => c.user_status === 'in_progress').length;

  return (
    <div data-testid="my-journey-page">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Il mio percorso</h1>
        <p className="text-base text-gray-500">
          Tieni traccia dei tuoi progressi nella formazione e verso le credenziali ICF.
          Qui vedi cosa hai gia fatto e cosa puoi ancora esplorare.
        </p>
      </div>

      {/* Journey overview */}
      <Card className="border-gray-100 mb-6" data-testid="journey-overview">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-5 h-5 text-[hsl(82,60%,42%)]" />
            <div>
              <h2 className="text-sm font-semibold">Il tuo stato</h2>
              <p className="text-xs text-gray-400">{allCompleted}/{allCourses} corsi completati{allInProgress > 0 && ` | ${allInProgress} in corso`}</p>
            </div>
          </div>
          <Progress value={allCourses > 0 ? Math.round((allCompleted / allCourses) * 100) : 0} className="h-2" />
        </CardContent>
      </Card>

      {/* Tabs: 3 categories + credentials */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="ariadne" data-testid="tab-ariadne" className="text-xs">Formazione Coach ICF</TabsTrigger>
          <TabsTrigger value="tecnica" data-testid="tab-tecnica" className="text-xs">Coach tecnica</TabsTrigger>
          <TabsTrigger value="business" data-testid="tab-business" className="text-xs">Coach business</TabsTrigger>
          <TabsTrigger value="credenziali" data-testid="tab-credenziali" className="text-xs">Credenziali ICF</TabsTrigger>
        </TabsList>

        {['ariadne', 'tecnica', 'business'].map(cat => {
          const catCourses = cat === 'ariadne' ? ariadneCourses : cat === 'tecnica' ? tecnicaCourses : businessCourses;
          const cfg = CATEGORY_CONFIG[cat];
          const stats = getStats(catCourses);
          return (
            <TabsContent key={cat} value={cat}>
              <Card className="border-gray-100 mb-4">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                    <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-semibold">{cfg.label}</h2>
                    <p className="text-xs text-gray-400">{stats.completed}/{stats.total} completati{stats.inProgress > 0 && ` | ${stats.inProgress} in corso`}</p>
                  </div>
                  <div className="w-24">
                    <Progress value={stats.pct} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-3">
                {catCourses.length > 0 ? catCourses.map(c => (
                  <CourseCard key={c.course_id} course={c} onStatusChange={handleStatusChange} onViewDetail={(id) => navigate(`/course/${id}`)} />
                )) : (
                  <Card className="border-gray-100" data-testid={`empty-${cat}`}>
                    <CardContent className="p-12 text-center">
                      <BookOpen className="w-10 h-10 mx-auto mb-4 text-gray-200" />
                      <h3 className="text-base font-semibold mb-2">Il tuo percorso inizia qui</h3>
                      <p className="text-sm text-gray-400 mb-4 max-w-md mx-auto">Questa pagina ti accompagnerà lungo il tuo cammino formativo. Man mano che avanzi, vedrai le tue ore, le credenziali e i traguardi raggiunti.</p>
                      <Button variant="outline" size="sm" onClick={() => navigate('/training-courses')} className="gap-2" data-testid={`empty-${cat}-explore`}>
                        Scopri da dove partire <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          );
        })}

        <TabsContent value="credenziali">
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Traccia i requisiti per ogni livello di credenziale ICF.
              Aggiorna i tuoi progressi per le ore di formazione, coaching erogato, mentoring ed esami.
            </p>
          </div>
          <div className="space-y-4">
            {CREDENTIALS.map(cred => (
              <CredentialCard
                key={cred.id}
                credential={cred}
                credProgress={credProgress[cred.id]}
                onUpdateProgress={handleCredentialUpdate}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
