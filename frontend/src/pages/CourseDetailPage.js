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
  ArrowLeft, Calendar, Clock, MapPin, Users, Award, Star,
  CheckCircle2, GraduationCap, Loader2, BookOpen, UserRoundCog
} from 'lucide-react';

// Detailed course data (enriched info per course)
const COURSE_DETAILS = {
  cat_cc2026: {
    subtitle: 'Programma accreditato ICF - Livello ACSTH',
    duration: '200 ore | 10 mesi',
    schedule: 'Weekend alterni: sabato 9:30-17:30, domenica 9:30-13:30',
    location: 'Milano + online',
    maxParticipants: 15,
    nextStart: 'Aprile 2026',
    price: '4.800 EUR (rateizzabile)',
    credential: 'ACC (Associate Certified Coach)',
    credentialDetails: 'Al termine del programma avrai completato le ore di formazione necessarie per richiedere la credenziale ACC di ICF. Il percorso include supervisione, pratica di coaching e preparazione all\'esame CKA.',
    certImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=300&fit=crop',
    editionPhotos: [
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=250&fit=crop',
    ],
    testimonials: [
      { name: 'Anna M.', role: 'Alumni 2024', text: 'Il Core Program ha trasformato il mio modo di relazionarmi. L\'approccio creativo-esperienziale rende ogni sessione unica e profonda.' },
      { name: 'Roberto L.', role: 'Alumni 2023', text: 'La qualita dei trainer e il supporto continuo durante tutto il percorso fanno la differenza. Ho ottenuto la mia ACC dopo soli 6 mesi.' },
    ],
  },
  cat_adv: {
    subtitle: 'Livello avanzato per coach certificati',
    duration: '80 ore | 6 mesi',
    schedule: 'Un weekend al mese: sabato 9:30-17:30',
    location: 'Milano + online',
    maxParticipants: 12,
    nextStart: 'Settembre 2026',
    price: '2.400 EUR',
    credential: 'PCC (Professional Certified Coach)',
    credentialDetails: 'Questo laboratorio contribuisce alle ore di formazione avanzata necessarie per il livello PCC. Include supervisione e performance evaluation.',
    certImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=300&fit=crop',
    editionPhotos: [
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop',
      'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=250&fit=crop',
    ],
    testimonials: [
      { name: 'Chiara P.', role: 'Alumni 2024', text: 'L\'Advanced Lab mi ha permesso di approfondire le competenze che servono davvero per il PCC. Supervizioni eccellenti.' },
    ],
  },
};

const DEFAULT_DETAIL = {
  subtitle: '',
  duration: 'Da definire',
  schedule: 'Da definire',
  location: 'Milano / Online',
  maxParticipants: 15,
  nextStart: 'Prossimamente',
  price: 'Contattaci',
  credential: '',
  credentialDetails: '',
  certImage: '',
  editionPhotos: [],
  testimonials: [],
};

const STATUS_OPTIONS = [
  { value: 'interested', label: 'Interessato' },
  { value: 'confirmed', label: 'Confermato' },
  { value: 'enrolled', label: 'Iscritto' },
];

function getColor(name) {
  const h = (name?.charCodeAt(0) || 0) * 7 % 360;
  return { bg: `hsl(${h} 50% 88%)`, fg: `hsl(${h} 50% 30%)` };
}

export default function CourseDetailPage() {
  const { user } = useAuth();
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [adminSummary, setAdminSummary] = useState(null);
  const [userStatus, setUserStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingInterest, setSavingInterest] = useState(false);
  const isPrivileged = user?.role === 'admin' || user?.role === 'editor';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      schoolAPI.getTrainingCourseDetail(courseId),
      isPrivileged ? schoolAPI.getTrainingCourseAdminSummary(courseId).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
    ]).then(([courseResponse, summaryResponse]) => {
      setCourse(courseResponse.data);
      setUserStatus(courseResponse.data.current_user_status || '');
      setAdminSummary(summaryResponse.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [courseId, isPrivileged]);

  const handleStatusChange = async (editionId, userId, participationStatus) => {
    try {
      await schoolAPI.updateMember(editionId, userId, { participation_status: participationStatus });
      const refreshed = await schoolAPI.getTrainingCourseAdminSummary(courseId);
      setAdminSummary(refreshed.data);
      toast.success('Stato partecipante aggiornato');
    } catch {
      toast.error('Impossibile aggiornare lo stato del partecipante');
    }
  };

  const handleProspectStatusChange = async (userId, participationStatus) => {
    try {
      await schoolAPI.updateTrainingCourseInterest(courseId, userId, { status: participationStatus });
      const refreshed = await schoolAPI.getTrainingCourseAdminSummary(courseId);
      setAdminSummary(refreshed.data);
      toast.success('Stato aggiornato nella scheda corso');
    } catch {
      toast.error('Impossibile aggiornare lo stato');
    }
  };

  const handleInterest = async () => {
    if (savingInterest || userStatus) return;
    setSavingInterest(true);
    try {
      const response = await schoolAPI.saveTrainingCourseInterest(courseId, { source: 'course_detail' });
      setUserStatus(response.data.status || 'interested');
      toast.success(response.data.message || 'Abbiamo registrato il tuo interesse');
    } catch {
      toast.error('Impossibile registrare il tuo interesse in questo momento');
    } finally {
      setSavingInterest(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!course) return <div className="text-center py-16"><p className="text-gray-400">Corso non trovato</p><Button variant="outline" onClick={() => navigate(-1)} className="mt-4">Indietro</Button></div>;

  const detail = COURSE_DETAILS[courseId] || DEFAULT_DETAIL;
  const catColors = {
    ariadne: 'hsl(82, 60%, 42%)',
    trainer_esterni: 'hsl(30, 85%, 52%)',
    icf: 'hsl(195, 100%, 45%)',
    tecnica: 'hsl(195, 100%, 45%)',
    business: 'hsl(30, 100%, 50%)',
  };
  const accentColor = catColors[course.category_key] || catColors.ariadne;
  const overview = adminSummary?.summary || { interested: 0, confirmed: 0, enrolled: 0 };
  const statusContent = {
    interested: {
      badge: 'Interesse registrato',
      text: 'Hai già segnalato il tuo interesse per questo percorso. Il team Ariadne potrà contattarti con i prossimi passi utili.',
    },
    confirmed: {
      badge: 'Interesse confermato',
      text: 'Il tuo interesse è stato preso in carico. Ti aggiorneremo con i dettagli più utili per proseguire.',
    },
    enrolled: {
      badge: 'Iscrizione attiva',
      text: 'Risulti già iscritto/a o formalmente inserito/a in questo percorso.',
    },
  };

  return (
    <div className="max-w-4xl mx-auto" data-testid={`course-detail-${courseId}`}>
      {/* Back + breadcrumb */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 mb-6 -ml-2" data-testid="back-btn">
        <ArrowLeft className="w-4 h-4" /> Torna ai corsi
      </Button>

      {/* Hero */}
      <div className="mb-8">
        <Badge variant="outline" className="text-[10px] mb-3" style={{ borderColor: accentColor, color: accentColor }}>
          {course.category}
        </Badge>
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">{course.title}</h1>
        {detail.subtitle && <p className="text-base text-gray-400">{detail.subtitle}</p>}
        <p className="text-sm text-gray-600 mt-4 leading-relaxed">{course.description}</p>
      </div>

      {/* Quick info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { icon: Clock, label: 'Durata', value: detail.duration },
          { icon: Calendar, label: 'Prossima edizione', value: detail.nextStart },
          { icon: MapPin, label: 'Sede', value: detail.location },
          { icon: Users, label: 'Max partecipanti', value: detail.maxParticipants },
        ].map((item, i) => (
          <Card key={i} className="border-gray-100">
            <CardContent className="p-4">
              <item.icon className="w-4 h-4 mb-2" style={{ color: accentColor }} />
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">{item.label}</p>
              <p className="text-sm font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Schedule + Price */}
      <Card className="border-gray-100 mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" style={{ color: accentColor }} /> Calendario</h3>
              <p className="text-sm text-gray-600">{detail.schedule}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Investimento</h3>
              <p className="text-lg font-bold" style={{ color: accentColor }}>{detail.price}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key points */}
      {course.key_points?.length > 0 && (
        <Card className="border-gray-100 mb-8">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" style={{ color: accentColor }} /> Cosa imparerai</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {course.key_points.map((kp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
                  <span className="text-sm text-gray-600">{kp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credential info */}
      {detail.credential && (
        <Card className="border-gray-100 mb-8 overflow-hidden" data-testid="credential-info">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              {detail.certImage && (
                <div className="md:w-1/3 h-48 md:h-auto overflow-hidden">
                  <img src={detail.certImage} alt="Certificazione" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5" style={{ color: accentColor }} />
                  <h3 className="text-base font-semibold">Credenziale: {detail.credential}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{detail.credentialDetails}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isPrivileged && (
        <Card className="border-gray-100 mb-8" data-testid="course-admin-summary-card">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2"><UserRoundCog className="w-4 h-4" style={{ color: accentColor }} /> Vista amministrativa del corso</h3>
                <p className="text-sm text-gray-500">Qui puoi vedere chi è interessato, confermato o iscritto e aggiornare lo stato direttamente dalla scheda corso.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'interested', label: 'Interessati' },
                { key: 'confirmed', label: 'Confermati' },
                { key: 'enrolled', label: 'Iscritti' },
              ].map((item) => (
                <Card key={item.key} className="border-gray-100">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{item.label}</p>
                    <p className="text-2xl font-semibold ariadne-heading" data-testid={`course-admin-count-${item.key}`}>{overview[item.key] || 0}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {adminSummary?.prospects?.length > 0 && (
              <Card className="border-gray-100" data-testid="course-admin-prospects-card">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Persone senza edizione assegnata</h4>
                    <p className="text-xs text-gray-400 mt-1">Interesse già raccolto sul corso, ancora in attesa di essere collegato a un’edizione specifica.</p>
                  </div>
                  <div className="space-y-3">
                    {adminSummary.prospects.map((member) => (
                      <div key={member.user_id} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px_auto] gap-3 items-center rounded-xl border border-gray-100 p-4" data-testid={`course-admin-prospect-${member.user_id}`}>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{member.user_name}</p>
                          <p className="text-xs text-gray-400">{member.user_email}</p>
                        </div>
                        <Select value={member.status || 'interested'} onValueChange={(value) => handleProspectStatusChange(member.user_id, value)}>
                          <SelectTrigger data-testid={`course-admin-prospect-status-${member.user_id}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => navigate(`/users-admin?userId=${member.user_id}`)} data-testid={`course-admin-open-prospect-${member.user_id}`}>
                          Scheda utente
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {(adminSummary?.editions || []).map((edition) => (
                <Card key={edition.cohort_id} className="border-gray-100" data-testid={`course-admin-edition-${edition.cohort_id}`}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{edition.name}</h4>
                        <p className="text-xs text-gray-400">{edition.start_date || 'Data da definire'}{edition.end_date ? ` · ${edition.end_date}` : ''}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{edition.members?.length || 0} partecipanti</Badge>
                    </div>
                    <div className="space-y-3">
                      {(edition.members || []).map((member) => (
                        <div key={member.user_id} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px_auto] gap-3 items-center rounded-xl border border-gray-100 p-4" data-testid={`course-admin-member-${edition.cohort_id}-${member.user_id}`}>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{member.user_name}</p>
                            <p className="text-xs text-gray-400">{member.user_email}</p>
                          </div>
                          <Select value={member.participation_status || 'enrolled'} onValueChange={(value) => handleStatusChange(edition.cohort_id, member.user_id, value)}>
                            <SelectTrigger data-testid={`course-admin-status-${edition.cohort_id}-${member.user_id}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" onClick={() => navigate(`/users-admin?userId=${member.user_id}`)} data-testid={`course-admin-open-user-${member.user_id}`}>
                            Scheda utente
                          </Button>
                        </div>
                      ))}
                      {(edition.members || []).length === 0 && <p className="text-sm text-gray-400">Nessun partecipante registrato per questa edizione.</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(adminSummary?.editions || []).length === 0 && <p className="text-sm text-gray-400">Per questo corso non ci sono ancora edizioni collegate.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edition photos */}
      {detail.editionPhotos.length > 0 && (
        <div className="mb-8" data-testid="edition-photos">
          <h3 className="text-sm font-semibold mb-3">Foto dalle edizioni precedenti</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {detail.editionPhotos.map((src, i) => (
              <div key={i} className="rounded-lg overflow-hidden aspect-[16/10]">
                <img src={src} alt={`Edizione ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Testimonials */}
      {detail.testimonials.length > 0 && (
        <div className="mb-8" data-testid="testimonials">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Star className="w-4 h-4" style={{ color: accentColor }} /> Testimonianze</h3>
          <div className="space-y-3">
            {detail.testimonials.map((t, i) => {
              const color = getColor(t.name);
              return (
                <Card key={i} className="border-gray-100">
                  <CardContent className="p-5">
                    <p className="text-sm text-gray-600 italic leading-relaxed mb-3">"{t.text}"</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: color.bg, color: color.fg }}>{t.name.charAt(0)}</div>
                      <div>
                        <p className="text-xs font-semibold">{t.name}</p>
                        <p className="text-[10px] text-gray-400">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <Card className="border-gray-100 mb-8" style={{ borderColor: `${accentColor}30` }}>
        <CardContent className="p-8 text-center">
          <GraduationCap className="w-8 h-8 mx-auto mb-3" style={{ color: accentColor }} />
          <h3 className="text-lg font-semibold ariadne-heading mb-2">Vuoi capire se è il percorso giusto per te?</h3>
          <p className="text-sm text-gray-500 mb-4">Puoi segnalarci il tuo interesse e ricevere indicazioni più mirate sul prossimo passo utile per te.</p>
          {userStatus && statusContent[userStatus] && (
            <div className="max-w-xl mx-auto rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 mb-4" data-testid="course-interest-status-box">
              <Badge variant="outline" className="text-[10px] mb-2">{statusContent[userStatus].badge}</Badge>
              <p className="text-sm text-gray-600">{statusContent[userStatus].text}</p>
            </div>
          )}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant={userStatus ? 'outline' : 'default'}
              className="gap-2 rounded-full px-6"
              onClick={handleInterest}
              disabled={savingInterest || !!userStatus}
              data-testid="course-interest-button"
            >
              {savingInterest ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {userStatus ? 'Iscrizione avviata' : 'Voglio iscrivermi'}
            </Button>
            <Button
              className="gap-2 rounded-full px-6"
              style={{ background: accentColor }}
              onClick={() => window.open('https://calendly.com/ariadne-training', '_blank')}
              data-testid="course-cta-call"
            >
              <Calendar className="w-4 h-4" /> Vorrei saperne di più
            </Button>
            <Button variant="outline" className="gap-2 rounded-full px-6" onClick={() => navigate('/training-courses')} data-testid="course-cta-journey">
              Torna ai corsi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
