import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { schoolAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Award,
  CheckCircle2, GraduationCap, Loader2, BookOpen, UserRoundCog, AlertTriangle
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'interested', label: 'Interessato' },
  { value: 'confirmed', label: 'Confermato' },
  { value: 'enrolled', label: 'Iscritto' },
];

const statusContent = {
  interested: {
    badge: 'Interesse segnalato',
    text: 'Hai segnalato il tuo interesse. Il team Ariadne potrà contattarti con i prossimi passi utili.',
  },
  confirmed: {
    badge: 'Confermato',
    text: 'La tua partecipazione è confermata.',
  },
  enrolled: {
    badge: 'Iscritto/a',
    text: 'Sei iscritto/a a questo percorso.',
  },
};

function getColor(name) {
  const h = (name?.charCodeAt(0) || 0) * 7 % 360;
  return { bg: `hsl(${h} 50% 88%)`, fg: `hsl(${h} 50% 30%)` };
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'editor';

  const [course, setCourse] = useState(null);
  const [adminSummary, setAdminSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingInterest, setSavingInterest] = useState(false);
  const [userStatus, setUserStatus] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await schoolAPI.getTrainingCourseDetail(courseId);
        setCourse(r.data);
        setUserStatus(r.data.user_interest_status || null);
        if ((user?.role === 'admin' || user?.role === 'editor') && r.data.admin_summary) {
          setAdminSummary(r.data.admin_summary);
        }
      } catch { toast.error('Impossibile caricare i dettagli del corso'); }
      finally { setLoading(false); }
    };
    load();
  }, [courseId, user]);

  const handleInterest = async () => {
    setSavingInterest(true);
    try {
      await schoolAPI.saveTrainingCourseInterest(courseId);
      setUserStatus('interested');
      toast.success('Interesse segnalato');
    } catch { toast.error('Qualcosa non ha funzionato'); }
    finally { setSavingInterest(false); }
  };

  const handleStatusChange = async (cohortId, userId, status) => {
    try {
      await schoolAPI.updateMember(cohortId, userId, { participation_status: status });
      const r = await schoolAPI.getTrainingCourseDetail(courseId);
      setAdminSummary(r.data.admin_summary);
      toast.success('Stato aggiornato');
    } catch { toast.error('Errore'); }
  };

  const handleProspectStatusChange = async (userId, status) => {
    try {
      await schoolAPI.updateTrainingCourseInterest(courseId, userId, { status });
      const r = await schoolAPI.getTrainingCourseDetail(courseId);
      setAdminSummary(r.data.admin_summary);
      toast.success('Stato aggiornato');
    } catch { toast.error('Errore'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!course) return <div className="text-center py-16 text-gray-400">Corso non trovato</div>;

  const accentColor = '#2D2649';

  return (
    <div className="max-w-4xl mx-auto" data-testid="course-detail-page">
      <Button variant="ghost" size="sm" onClick={() => navigate('/training-courses')} className="gap-1 mb-6 -ml-2" data-testid="course-back-btn">
        <ArrowLeft className="w-4 h-4" /> Percorsi formativi
      </Button>

      {/* Hero — solid color */}
      <div className="rounded-2xl overflow-hidden mb-8" data-testid="course-hero">
        <div className="bg-[#2D2649] p-8 md:p-10">
          <div className="flex flex-wrap gap-2 mb-3">
            {course.accreditation && <Badge className="bg-white/15 text-white border-white/20 text-[10px]">{course.accreditation}</Badge>}
            {course.credential && <Badge className="bg-[#f9af43]/20 text-[#f9af43] border-[#f9af43]/30 text-[10px]">{course.credential}</Badge>}
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-2" data-testid="course-title">{course.title}</h1>
          {course.subtitle && <p className="text-white/70 text-base" data-testid="course-subtitle">{course.subtitle}</p>}
        </div>
      </div>

      {/* Course info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {course.duration && (
          <Card className="border-gray-100"><CardContent className="p-4 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
            <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Durata</p><p className="text-sm font-medium">{course.duration}</p></div>
          </CardContent></Card>
        )}
        {course.location && (
          <Card className="border-gray-100"><CardContent className="p-4 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Sede</p><p className="text-sm font-medium">{course.location}</p></div>
          </CardContent></Card>
        )}
        {course.max_participants && (
          <Card className="border-gray-100"><CardContent className="p-4 flex items-start gap-2.5">
            <Users className="w-4 h-4 text-gray-400 mt-0.5" />
            <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Posti</p><p className="text-sm font-medium">Max {course.max_participants}</p></div>
          </CardContent></Card>
        )}
        {course.next_edition && (
          <Card className="border-gray-100"><CardContent className="p-4 flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Prossima edizione</p><p className="text-sm font-medium">{course.next_edition}</p></div>
          </CardContent></Card>
        )}
      </div>

      {/* Description */}
      <Card className="border-gray-100 mb-6" data-testid="course-description-card">
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">{course.description}</p>
          {course.key_points?.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold">Cosa ottieni</h3>
              {course.key_points.map((kp, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[hsl(82,60%,42%)] mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{kp}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prerequisites — prominent */}
      {course.prerequisites && (
        <Card className="border-amber-100 bg-amber-50/30 mb-6" data-testid="course-prerequisites">
          <CardContent className="p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800 mb-1">Prerequisiti</h3>
              <p className="text-sm text-amber-700">{course.prerequisites}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price & Trainers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {course.price && (
          <Card className="border-gray-100" data-testid="course-price-card">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-2">Investimento</h3>
              <p className="text-2xl font-semibold ariadne-heading">€ {course.price}</p>
              {course.price_note && <p className="text-xs text-gray-500 mt-1">{course.price_note}</p>}
            </CardContent>
          </Card>
        )}
        {course.trainers?.length > 0 && (
          <Card className="border-gray-100" data-testid="course-trainers-card">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-3">Trainer</h3>
              <div className="space-y-2">
                {course.trainers.map(name => {
                  const color = getColor(name);
                  return (
                    <div key={name} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: color.bg, color: color.fg }}>{name.charAt(0)}</div>
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Credential info */}
      {course.credential && (
        <Card className="border-gray-100 mb-8" data-testid="course-credential-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-6 h-6" style={{ color: '#f9af43' }} />
              <div>
                <h3 className="text-sm font-semibold">Credenziale ottenibile</h3>
                <p className="text-base font-semibold ariadne-heading">{course.credential}</p>
              </div>
            </div>
            {course.accreditation && <p className="text-xs text-gray-500">Programma accreditato: {course.accreditation}</p>}
          </CardContent>
        </Card>
      )}

      {/* Admin section */}
      {isAdmin && adminSummary && (
        <Card className="border-gray-100 mb-8" data-testid="course-admin-section">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <UserRoundCog className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold ariadne-heading">Gestione corso</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {STATUS_OPTIONS.map(s => (
                <Card key={s.value} className="border-gray-100"><CardContent className="p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
                  <p className="text-xl font-semibold ariadne-heading">{adminSummary.summary?.[s.value] || 0}</p>
                </CardContent></Card>
              ))}
            </div>

            {adminSummary.prospects?.length > 0 && (
              <Card className="border-gray-100">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Persone interessate</h3>
                  {adminSummary.prospects.map(m => (
                    <div key={m.user_id} className="grid grid-cols-1 lg:grid-cols-[1fr_200px_auto] gap-3 items-center rounded-xl border border-gray-100 p-3">
                      <div><p className="text-sm font-semibold">{m.user_name}</p><p className="text-xs text-gray-400">{m.user_email}</p></div>
                      <Select value={m.status || 'interested'} onValueChange={v => handleProspectStatusChange(m.user_id, v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/users-admin?userId=${m.user_id}`)}>Scheda utente</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {(adminSummary?.editions || []).map(ed => (
              <Card key={ed.cohort_id} className="border-gray-100">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><h4 className="text-sm font-semibold">{ed.name}</h4><p className="text-xs text-gray-400">{ed.start_date || 'Data da definire'}</p></div>
                    <Badge variant="outline" className="text-[10px]">{ed.members?.length || 0} partecipanti</Badge>
                  </div>
                  {(ed.members || []).map(m => (
                    <div key={m.user_id} className="grid grid-cols-1 lg:grid-cols-[1fr_200px_auto] gap-3 items-center rounded-xl border border-gray-100 p-3">
                      <div><p className="text-sm font-semibold">{m.user_name}</p><p className="text-xs text-gray-400">{m.user_email}</p></div>
                      <Select value={m.participation_status || 'enrolled'} onValueChange={v => handleStatusChange(ed.cohort_id, m.user_id, v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/users-admin?userId=${m.user_id}`)}>Scheda utente</Button>
                    </div>
                  ))}
                  {(ed.members || []).length === 0 && <p className="text-sm text-gray-400">Nessun partecipante registrato.</p>}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <Card className="border-gray-100 mb-8" style={{ borderColor: `${accentColor}30` }}>
        <CardContent className="p-8 text-center">
          <GraduationCap className="w-8 h-8 mx-auto mb-3" style={{ color: accentColor }} />
          <h3 className="text-lg font-semibold ariadne-heading mb-2">Vuoi capire se è il percorso giusto per te?</h3>
          <p className="text-sm text-gray-500 mb-4">Se senti che potrebbe essere il momento giusto, scrivici o prenota una chiamata. Ci sarà spazio per le tue domande.</p>
          {userStatus && statusContent[userStatus] && (
            <div className="max-w-xl mx-auto rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 mb-4" data-testid="course-interest-status-box">
              <Badge variant="outline" className="text-[10px] mb-2">{statusContent[userStatus].badge}</Badge>
              <p className="text-sm text-gray-600">{statusContent[userStatus].text}</p>
            </div>
          )}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              className="gap-2 rounded-full px-6"
              style={{ background: accentColor }}
              onClick={() => window.open('https://calendly.com/ariadne-training', '_blank')}
              data-testid="course-cta-call"
            >
              <Calendar className="w-4 h-4" /> Vorrei saperne di più
            </Button>
            <Button
              variant={userStatus ? 'outline' : 'default'}
              className="gap-2 rounded-full px-6"
              onClick={handleInterest}
              disabled={savingInterest || !!userStatus}
              data-testid="course-interest-button"
            >
              {savingInterest ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {userStatus ? 'Interesse segnalato' : 'Segnala il tuo interesse'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
