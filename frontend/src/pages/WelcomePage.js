import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { schoolAPI, communityAPI } from '../lib/api';
import {
  ArrowRight, GraduationCap, Users, BookOpen, Calendar,
  ExternalLink, Phone, Loader2, Sparkles,
  CheckCircle2, Compass, CreditCard
} from 'lucide-react';

const SCHOOL_STORY = {
  title: 'Come è nata Ariadne',
  subtitle: 'Creative-Experiential Training & Coaching',
  content: `Ariadne non è nata da un business plan. È nata da una serie di incontri.

Nel 2018 Arianna Perrone e Emanuele Ciccarelli si incontrano e scoprono una sintonia professionale profonda attorno allo sviluppo del potenziale umano.

Nel 2021, in piena pandemia, nasce Ariadne: una scuola di coaching creativo-esperienziale. L'idea è semplice — le trasformazioni più profonde nascono dagli incontri, dalle relazioni e dalle comunità che scegliamo di costruire insieme.

Nel 2024 entra Emanuele Casero, coach e imprenditore, che porta visione strategica e struttura.

Nel 2025 nasce Ariadne SRL.

Oggi siamo tre founder e una comunità in crescita, con un approccio che mette la creatività nella relazione, non nelle tecniche.`,
  approach: [
    'Apprendimento esperienziale: non solo teoria, ma pratica fin dal primo giorno',
    'Supervisione continua con coach senior certificati ICF PCC e MCC',
    'Piccoli gruppi (max 15 partecipanti) per un percorso personalizzato',
    'Approccio creativo che integra arte, movimento e facilitazione',
    'Comunità di pratica che continua oltre la formazione',
  ],
};

const TRAINERS = [
  {
    name: 'Arianna Perrone',
    role: 'Co-fondatrice e Trainer',
    credentials: 'MCC ICF',
    bio: 'Master Certified Coach ICF con oltre 2500 ore di coaching. Formatrice esperienziale specializzata in soft skills e intelligenza emotiva. Facilitatrice certificata Lego® Serious Play® e Sikkhona®. 18 anni di esperienza in azienda come Responsabile Sviluppo Risorse Umane. Docente in Master Universitari e Business Schools.',
  },
  {
    name: 'Emanuele Ciccarelli',
    role: 'Co-fondatore e Trainer',
    credentials: 'PCC ICF · Integral Coach',
    bio: 'Co-fondatore di Ariadne, co-creatore dell\'approccio creativo-esperienziale. Facilitatore certificato Lego® Serious Play® e KaosPilot. Trainer nei percorsi Core Coaching, Team Coaching e Core Quadrant.',
  },
  {
    name: 'Emanuele Casero',
    role: 'Co-fondatore',
    credentials: 'PCC ICF',
    bio: 'Coach e imprenditore. Si occupa dello sviluppo strategico della scuola e della progettazione dei percorsi formativi.',
  },
];

function getColor(name) {
  const h = (name?.charCodeAt(0) || 0) * 7 % 360;
  return { bg: `hsl(${h} 50% 88%)`, fg: `hsl(${h} 50% 30%)` };
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    Promise.all([
      schoolAPI.getCatalog().catch(() => ({ data: [] })),
      communityAPI.dashboard().catch(() => ({ data: { banners: [] } })),
    ]).then(([catRes, dashRes]) => {
      setCourses(catRes.data || []);
      setBanners(dashRes.data?.banners || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const discountBanner = banners.find(b => b.audience === 'interessato');
  const icfCourses = courses.filter(c => c.section === 'icf' || c.category === 'percorso_icf');

  return (
    <div className="max-w-5xl mx-auto" data-testid="welcome-page">
      {/* Hero section — solid color, no stock photos */}
      <div className="relative rounded-2xl overflow-hidden mb-10" data-testid="welcome-hero">
        <div className="bg-[#2D2649] h-[300px] flex items-end">
          <div className="p-8 md:p-10">
            <Badge variant="outline" className="bg-white/10 text-white/90 border-white/20 text-[10px] mb-3 backdrop-blur-sm">
              Benvenuto nel tuo spazio Ariadne
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-semibold text-white leading-tight mb-3">
              Questo è il tuo spazio.
            </h1>
            <p className="text-white/70 text-sm max-w-xl leading-relaxed">
              Da qui puoi esplorare i percorsi, seguire il tuo cammino formativo e restare in contatto con la comunità Ariadne.
            </p>
          </div>
        </div>
      </div>

      {/* What you can do here */}
      <div className="mb-10" data-testid="welcome-what-to-do">
        <h2 className="text-xl font-semibold ariadne-heading mb-2">Cosa puoi fare qui</h2>
        <p className="text-sm text-gray-500 mb-5">
          Questa piattaforma ti accompagna nel tuo percorso con Ariadne: dalla scoperta dei corsi alla partecipazione attiva nella community.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: GraduationCap, title: 'Percorsi formativi', desc: 'Scopri i corsi, segui il tuo avanzamento e accedi ai materiali didattici.', to: '/training-courses', color: 'text-[hsl(82,60%,42%)]', bg: 'bg-[hsl(82,60%,42%)]/8' },
            { icon: CreditCard, title: 'Le mie iscrizioni', desc: 'Segui lo stato delle tue iscrizioni e il piano rate.', to: '/my-enrollments', color: 'text-[#7B61FF]', bg: 'bg-[#7B61FF]/8' },
            { icon: Users, title: 'Community', desc: 'Condividi riflessioni, leggi aggiornamenti e resta in contatto con il gruppo.', to: '/feed', color: 'text-[#F5A623]', bg: 'bg-[#F5A623]/8' },
            { icon: Calendar, title: 'Eventi', desc: 'Consulta il calendario e i programmi in arrivo.', to: '/community/events', color: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]/8' },
          ].map(item => (
            <Card key={item.title} className="border-gray-100 hover:border-gray-200 transition-all cursor-pointer group" onClick={() => navigate(item.to)} data-testid={`welcome-feature-${item.to.replace(/\//g, '')}`}>
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Who is Ariadne for */}
      <Card className="border-gray-100 mb-10" data-testid="welcome-audience">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[hsl(82,60%,42%)]/8 flex items-center justify-center">
              <Compass className="w-5 h-5 text-[hsl(82,60%,42%)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold ariadne-heading">A chi si rivolge questa piattaforma</h2>
              <p className="text-xs text-gray-400">Ogni persona porta il proprio contributo alla community</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Interessati', desc: 'Chi sta scoprendo il mondo del coaching Ariadne e vuole orientarsi tra i percorsi disponibili.' },
              { label: 'Studenti', desc: 'Chi sta frequentando un corso e vuole seguire il proprio avanzamento, accedere ai materiali e restare connesso.' },
              { label: 'Alumni', desc: 'Chi ha completato un percorso e desidera mantenere la connessione con la community e le nuove opportunità.' },
              { label: 'Trainer Ariadne', desc: 'Chi fa parte del team formativo e utilizza la piattaforma come strumento di lavoro e comunicazione.' },
            ].map(a => (
              <div key={a.label} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50/70 border border-gray-100">
                <CheckCircle2 className="w-4 h-4 text-[hsl(82,60%,42%)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{a.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Discount banner */}
      {discountBanner && (
        <Card className="border-[hsl(82,60%,42%)]/20 bg-[hsl(82,60%,42%)]/[0.03] mb-10 overflow-hidden" data-testid="discount-banner">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[hsl(82,60%,42%)]" />
              <Badge variant="outline" className="badge-green text-[10px]">Per te</Badge>
            </div>
            <h3 className="text-lg font-semibold mb-2">{discountBanner.title}</h3>
            <p className="text-sm text-gray-500 mb-4">{discountBanner.body}</p>
            {discountBanner.link && discountBanner.link !== '#' && (
              <Button className="gap-2" onClick={() => window.open(discountBanner.link)}>
                {discountBanner.cta_text} <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* School story */}
      <Card className="border-gray-100 mb-10" data-testid="school-story">
        <CardContent className="p-8">
          <h2 className="text-2xl font-semibold ariadne-heading mb-2">{SCHOOL_STORY.title}</h2>
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-6">{SCHOOL_STORY.subtitle}</p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-6">{SCHOOL_STORY.content}</p>
          <h3 className="text-sm font-semibold mb-3">Il nostro approccio</h3>
          <div className="space-y-2">
            {SCHOOL_STORY.approach.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(82,60%,42%)] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">{a}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trainers */}
      <div className="mb-10" data-testid="trainers-section">
        <h2 className="text-xl font-semibold ariadne-heading mb-4">Chi siamo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TRAINERS.map(t => {
            const color = getColor(t.name);
            return (
              <Card key={t.name} className="border-gray-100">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: color.bg, color: color.fg }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{t.name}</h3>
                      <p className="text-[11px] text-gray-400">{t.role}</p>
                      <Badge variant="outline" className="text-[9px] badge-blue mt-0.5">{t.credentials}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{t.bio}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Corsi in partenza */}
      {icfCourses.length > 0 && (
        <div className="mb-10" data-testid="courses-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold ariadne-heading">Percorsi in partenza</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/training-courses')} className="gap-1 text-xs">
              Tutti i percorsi <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {icfCourses.slice(0, 4).map(c => (
              <Card key={c.course_id} className="border-gray-100 hover:border-gray-200 transition-all cursor-pointer" onClick={() => navigate(`/course/${c.course_id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-[hsl(82,60%,42%)]" />
                    <h3 className="text-sm font-semibold">{c.title}</h3>
                  </div>
                  {c.subtitle && <p className="text-xs text-[#F5A623] mb-1">{c.subtitle}</p>}
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{c.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {c.accreditation && <Badge variant="outline" className="text-[9px] badge-green">{c.accreditation}</Badge>}
                    {c.next_edition && c.next_edition !== 'Da definire' && <Badge variant="outline" className="text-[9px]">{c.next_edition}</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CTA - Book a call */}
      <Card className="border-[#f9af43]/20 bg-[#f9af43]/[0.03] mb-10" data-testid="cta-calendly">
        <CardContent className="p-8 text-center">
          <Phone className="w-8 h-8 text-[#f9af43] mx-auto mb-3" />
          <h2 className="text-xl font-semibold ariadne-heading mb-2">Vuoi saperne di più?</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Se senti che potrebbe essere il momento giusto per te, prenota una chiamata conoscitiva. Porta con te le tue domande — ci sarà spazio per ascoltarle.
          </p>
          <Button
            size="lg"
            className="gap-2 rounded-full px-8 bg-[#2D2649] hover:bg-[#3d3659]"
            onClick={() => window.open('https://calendly.com/ariadne-training', '_blank')}
            data-testid="book-call-btn"
          >
            <Calendar className="w-4 h-4" />
            Prenota una chiamata
            <ExternalLink className="w-3 h-3" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
