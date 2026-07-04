import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { schoolAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Search, GraduationCap, Sparkles, Users, ArrowRight, Calendar, MapPin } from 'lucide-react';

function CourseCard({ course, onOpen }) {
  const prereqBadge = course.prerequisites
    ? { label: course.prerequisites, className: 'bg-[#6859a3]/8 text-[#6859a3] border-[#6859a3]/20' }
    : { label: 'Aperto a tutti', className: 'bg-[#94c356]/10 text-[#5a8a1e] border-[#94c356]/30' };

  return (
    <Card className="border-gray-100 hover:border-gray-200 transition-colors h-full" data-testid={`training-course-card-${course.course_id}`}>
      <CardContent className="p-6 h-full flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900" data-testid={`training-course-title-${course.course_id}`}>{course.title}</h3>
            {course.subtitle && <p className="text-xs text-[#f9af43] mt-0.5">{course.subtitle}</p>}
          </div>
          {course.accreditation && <Badge variant="outline" className="text-[10px] badge-green flex-shrink-0">{course.accreditation}</Badge>}
        </div>
        <Badge variant="outline" className={`text-[10px] self-start ${prereqBadge.className}`} data-testid={`prereq-badge-${course.course_id}`}>
          {prereqBadge.label}
        </Badge>
        <p className="text-sm text-gray-500 flex-1">{course.description}</p>
        <div className="space-y-1.5 text-xs text-gray-400">
          {course.duration && <p><span className="font-medium text-gray-600">Durata:</span> {course.duration}</p>}
          {course.trainers?.length > 0 && <p><span className="font-medium text-gray-600">Trainer:</span> {course.trainers.join(', ')}</p>}
          {course.price && <p><span className="font-medium text-gray-600">Prezzo:</span> €{course.price}{course.price_note ? ` (${course.price_note})` : ''}</p>}
          {course.next_edition && <p><span className="font-medium text-gray-600">Prossima edizione:</span> {course.next_edition}</p>}
          {course.location && <p><span className="font-medium text-gray-600">Sede:</span> {course.location}</p>}
        </div>
        {course.key_points?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {course.key_points.slice(0, 3).map((point) => <Badge key={point} variant="outline" className="text-[9px]">{point}</Badge>)}
          </div>
        )}
        <Button variant="outline" className="mt-1 w-full gap-2" onClick={() => onOpen(course.course_id)} data-testid={`training-course-open-${course.course_id}`}>
          Scopri di più <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function TrainingCoursesPage() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    schoolAPI.listTrainingCourses().then(r => setCatalog(r.data)).catch(() => toast.error('Impossibile caricare i corsi'));
  }, []);

  const icfCourses = useMemo(() => catalog.filter(c => c.section === 'icf' || c.category === 'percorso_icf'), [catalog]);
  const enrichmentCourses = useMemo(() => catalog.filter(c => c.section === 'enrichment' || c.category === 'specializzazione'), [catalog]);

  const filterCourses = (list) => {
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter(c => `${c.title} ${c.description} ${c.subtitle || ''} ${(c.trainers || []).join(' ')}`.toLowerCase().includes(q));
  };

  const filteredIcf = filterCourses(icfCourses);
  const filteredEnrichment = filterCourses(enrichmentCourses);

  return (
    <div data-testid="training-courses-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Percorsi formativi</h1>
        <p className="text-base text-gray-500" data-testid="training-courses-description">
          {"Esplora i percorsi formativi Ariadne. Ogni percorso è un'esperienza unica di crescita personale e professionale."}
        </p>
      </div>

      <div className="relative mb-10">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input className="pl-9 max-w-lg" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca per corso, tema o docente" data-testid="training-course-search-input" />
      </div>

      {/* SEZIONE A: Percorso coaching ICF */}
      <div className="mb-12" data-testid="section-icf">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#2D2649]/8 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-[#2D2649]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold ariadne-heading">Percorso coaching ICF</h2>
            <p className="text-sm text-gray-500">Il percorso per ottenere le credenziali ICF, dalla prima formazione alla specializzazione.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
          {filteredIcf.map((course) => <CourseCard key={course.course_id} course={course} onOpen={(id) => navigate(`/course/${id}`)} />)}
        </div>
        {filteredIcf.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nessun corso corrisponde alla ricerca.</p>}
      </div>

      {/* SEZIONE B: Corsi di arricchimento e specializzazione */}
      <div className="mb-8" data-testid="section-enrichment">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#f9af43]/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#f9af43]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold ariadne-heading">Corsi di arricchimento e specializzazione</h2>
            <p className="text-sm text-gray-500">Per chi vuole approfondire ambiti specifici del coaching e dello sviluppo.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
          {filteredEnrichment.map((course) => <CourseCard key={course.course_id} course={course} onOpen={(id) => navigate(`/course/${id}`)} />)}
        </div>
        {filteredEnrichment.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nessun corso corrisponde alla ricerca.</p>}
      </div>
    </div>
  );
}
