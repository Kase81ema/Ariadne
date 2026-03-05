import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { schoolAPI, communityAPI } from '../lib/api';
import {
  ArrowRight, GraduationCap, Users, BookOpen, Calendar,
  Video, ExternalLink, Star, Quote, Phone, Loader2, Sparkles,
  CheckCircle2, Award
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const SCHOOL_STORY = {
  title: "La scuola Ariadne",
  subtitle: "Creative-Experiential Training & Coaching",
  description: `Ariadne nasce dalla visione di portare creativita e esperienza diretta nel mondo del coaching e della formazione. Il nostro approccio creativo-esperienziale integra le metodologie di coaching riconosciute ICF con tecniche innovative che coinvolgono corpo, mente ed emozioni.

Da oltre 15 anni formiamo coach professionisti che fanno la differenza. Il nostro metodo unico combina la solidita teorica con l'apprendimento esperienziale, permettendo a ogni partecipante di sviluppare il proprio stile autentico di coaching.`,
  approach: [
    "Apprendimento esperienziale: non solo teoria, ma pratica fin dal primo giorno",
    "Supervisione continua con coach senior certificati ICF PCC e MCC",
    "Piccoli gruppi (max 15 partecipanti) per un percorso personalizzato",
    "Approccio creativo che integra arte, movimento e mindfulness",
    "Comunita di pratica che continua oltre la formazione",
  ],
  bibliography: [
    { title: "Co-Active Coaching", author: "H. Kimsey-House, K. Kimsey-House, P. Sandahl, L. Whitworth" },
    { title: "Coaching for Performance", author: "John Whitmore" },
    { title: "The Art of Coaching", author: "Elena Aguilar" },
    { title: "Ontological Coaching", author: "A. Olalla, J. Echeverria" },
    { title: "Presence-Based Coaching", author: "Doug Silsbee" },
  ],
};

const TRAINERS = [
  { name: "Maria Rossi", role: "Direttrice didattica", credentials: "MCC ICF", bio: "Oltre 20 anni di esperienza nel coaching esperienziale. Ha formato piu di 500 coach in Italia e all'estero." },
  { name: "Luca Bianchi", role: "Trainer senior", credentials: "PCC ICF", bio: "Esperto di team coaching e dinamiche di gruppo. Autore di 'Il Coach Creativo' (2023)." },
  { name: "Giulia Verdi", role: "Trainer & Business Coach", credentials: "PCC ICF", bio: "Specializzata in coaching per imprenditori e liberi professionisti. Ha lanciato il programma Business del Coach." },
  { name: "Marco Ferrari", role: "Trainer & Supervisore", credentials: "PCC ICF", bio: "Pioniere del team coaching in Italia. Conduce il laboratorio avanzato di Team Coaching." },
  { name: "Elena Conti", role: "Mentor Coach", credentials: "PCC ICF", bio: "Guida i coach alle prime armi nel loro percorso di crescita professionale attraverso il mentoring individuale e di gruppo." },
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

  return (
    <div className="max-w-4xl mx-auto" data-testid="welcome-page">
      {/* Hero */}
      <div className="mb-12 text-center">
        <Badge variant="outline" className="badge-green mb-4 text-xs">Benvenuto!</Badge>
        <h1 className="text-4xl sm:text-5xl font-semibold ariadne-heading mb-4 leading-tight">
          Scopri il mondo Ariadne
        </h1>
        <p className="text-base text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Formazione in coaching creativo-esperienziale riconosciuta ICF.
          Esplora i nostri percorsi, conosci i trainer e inizia il tuo viaggio.
        </p>
      </div>

      {/* Discount banner for new users */}
      {discountBanner && (
        <Card className="border-[hsl(82,60%,42%)]/20 bg-[hsl(82,60%,42%)]/[0.03] mb-8 overflow-hidden" data-testid="discount-banner">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              {discountBanner.image_url && (
                <div className="md:w-1/3 h-40 md:h-auto overflow-hidden">
                  <img src={discountBanner.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[hsl(82,60%,42%)]" />
                  <Badge variant="outline" className="badge-green text-[10px]">Offerta per te</Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">{discountBanner.title}</h3>
                <p className="text-sm text-gray-500 mb-4">{discountBanner.body}</p>
                <Button className="gap-2" onClick={() => discountBanner.link && discountBanner.link !== '#' && window.open(discountBanner.link)}>
                  {discountBanner.cta_text} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* School story */}
      <Card className="border-gray-100 mb-8" data-testid="school-story">
        <CardContent className="p-8">
          <h2 className="text-2xl font-semibold ariadne-heading mb-2">{SCHOOL_STORY.title}</h2>
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-6">{SCHOOL_STORY.subtitle}</p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-6">{SCHOOL_STORY.description}</p>
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
      <div className="mb-8" data-testid="trainers-section">
        <h2 className="text-xl font-semibold ariadne-heading mb-4">I nostri trainer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Video placeholder */}
      <Card className="border-gray-100 mb-8 overflow-hidden" data-testid="video-section">
        <CardContent className="p-0">
          <div className="bg-gray-900 h-64 flex items-center justify-center relative">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 cursor-pointer hover:bg-white/30 transition-colors">
                <Video className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/80 text-sm">Video di presentazione</p>
              <p className="text-white/50 text-xs mt-1">Scopri il nostro approccio in 3 minuti</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Corsi in partenza */}
      <div className="mb-8" data-testid="courses-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold ariadne-heading">Corsi in partenza</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/my-journey')} className="gap-1 text-xs">
            Tutti i corsi <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.filter(c => c.category === 'ariadne').slice(0, 4).map(c => (
            <Card key={c.course_id} className="border-gray-100 hover:border-gray-200 transition-all cursor-pointer" onClick={() => navigate('/my-journey')}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-[hsl(82,60%,42%)]" />
                  <h3 className="text-sm font-semibold">{c.title}</h3>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.description}</p>
                {c.key_points?.slice(0, 2).map((kp, i) => (
                  <div key={i} className="flex items-center gap-1.5 mb-1">
                    <span className="w-1 h-1 rounded-full bg-[hsl(82,60%,42%)]" />
                    <span className="text-[11px] text-gray-400">{kp}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Photo storyboard placeholder */}
      <Card className="border-gray-100 mb-8" data-testid="storyboard-section">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold ariadne-heading mb-4">Le nostre edizioni</h2>
          <p className="text-sm text-gray-500 mb-4">Alcuni momenti dalle edizioni precedenti del Core Coaching Program</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              "https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop",
              "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300&h=200&fit=crop",
              "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=300&h=200&fit=crop",
              "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=300&h=200&fit=crop",
            ].map((src, i) => (
              <div key={i} className="rounded-lg overflow-hidden aspect-[3/2]">
                <img src={src} alt={`Edizione ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bibliography */}
      <Card className="border-gray-100 mb-8" data-testid="bibliography-section">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-[hsl(82,60%,42%)]" />
            <h2 className="text-xl font-semibold ariadne-heading">Bibliografia di riferimento</h2>
          </div>
          <div className="space-y-3">
            {SCHOOL_STORY.bibliography.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50">
                <Quote className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{b.title}</p>
                  <p className="text-xs text-gray-400">{b.author}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA - Book a call */}
      <Card className="border-[hsl(82,60%,42%)]/20 bg-[hsl(82,60%,42%)]/[0.03] mb-8" data-testid="cta-calendly">
        <CardContent className="p-8 text-center">
          <Phone className="w-8 h-8 text-[hsl(82,60%,42%)] mx-auto mb-3" />
          <h2 className="text-xl font-semibold ariadne-heading mb-2">Vuoi saperne di piu?</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Prenota una chiamata conoscitiva gratuita con il nostro team. Ti racconteremo tutto sui percorsi e ti aiuteremo a scegliere quello giusto per te.
          </p>
          <Button
            size="lg"
            className="gap-2 rounded-full px-8"
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
